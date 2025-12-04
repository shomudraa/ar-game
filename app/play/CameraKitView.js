"use client";

import { useEffect, useRef, useState } from "react";

export function CameraKitView({ onReady, onError, onScore }) {
  console.log("✅ CameraKitView rendered");
  const containerRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log("🔁 CameraKitView useEffect running");

    let session;
    let stream;
    let cancelled = false;

    (async () => {
      try {
        if (typeof window === "undefined") return;

        const apiToken = process.env.NEXT_PUBLIC_CAMERA_KIT_API_TOKEN;
        const lensId = process.env.NEXT_PUBLIC_CAMERA_KIT_LENS_ID;
        const lensGroupId = process.env.NEXT_PUBLIC_CAMERA_KIT_LENS_GROUP_ID;

        if (!apiToken || !lensId || !lensGroupId) {
          throw new Error("Camera Kit env vars are missing");
        }

        // 🔌 Remote API handler: receives submitScore from Lens
        const remoteApiService = {
          getRequestHandler(request, lens) {
            console.log("🌐 Remote API request received:", request.endpoint);

            if (request.endpoint !== "submitScore") return;

            return {
              async onRequestBody(bodyStream) {
                try {
                  const params = request.parameters || {};
                  const rawScore = params.score;
                  const score = Number(rawScore);

                  console.log("📩 Received submitScore from Lens:", {
                    rawScore,
                    score,
                  });

                  if (Number.isFinite(score) && typeof onScore === "function") {
                    console.log("🎯 Calling onScore with:", score);
                    onScore(score);
                  } else {
                    console.warn("⚠️ Invalid score from Lens:", rawScore);
                  }

                  return {
                    statusCode: 1,
                    body: JSON.stringify({ ok: true }),
                  };
                } catch (err) {
                  console.error("❌ Error handling submitScore:", err);
                  return {
                    statusCode: 3,
                    body: "Host error handling submitScore",
                  };
                }
              },
            };
          },
        };

        const { bootstrapCameraKit } = await import("@snap/camera-kit");

        const cameraKit = await bootstrapCameraKit({
          apiToken,
          remoteApiService, // 👈 connects Lens Remote API to this host
        });

        session = await cameraKit.createSession();

        if (!containerRef.current || cancelled) return;

        const live = session.output.live;

        // Make the video behave like a vertical phone screen
        Object.assign(live.style, {
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover", // fill the 9:16 frame
          backgroundColor: "black",
        });

        if (!containerRef.current.contains(live)) {
          containerRef.current.appendChild(live);
        }

        // Try to get a portrait webcam stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            aspectRatio: 9 / 16,
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
        });

        await session.setSource(stream);

        const lens = await cameraKit.lensRepository.loadLens(
          lensId,
          lensGroupId
        );

        await session.applyLens(lens);
        await session.play("live");

        if (!cancelled) {
          setInitialized(true);
          onReady?.();
        }
      } catch (err) {
        console.error("❌ Camera Kit init failed:", err);
        if (!cancelled && typeof onError === "function") {
          onError(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (session) session.pause();
        if (stream) stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.warn("⚠️ Cleanup error:", err);
      }
    };
  }, [onReady, onError, onScore]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="
          relative
          w-[260px] sm:w-[320px]   /* phone width */
          aspect-[9/16]           /* vertical phone ratio */
          rounded-[32px]
          bg-black
          border border-gray-700
          overflow-hidden
          shadow-xl
        "
      >
        {!initialized && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Loading camera…</p>
          </div>
        )}
      </div>
    </div>
  );
}