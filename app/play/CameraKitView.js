"use client";

import { useEffect, useRef, useState } from "react";

export function CameraKitView({ onReady, onError }) {
  const containerRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
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

        const { bootstrapCameraKit } = await import("@snap/camera-kit");

        const cameraKit = await bootstrapCameraKit({ apiToken });
        session = await cameraKit.createSession();

        if (!containerRef.current || cancelled) return;

        // Attach the session output canvas/video
        const live = session.output.live;
        // Force it to fill the container
        Object.assign(live.style, {
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
        });

        // Only append if not already there
        if (!containerRef.current.contains(live)) {
          containerRef.current.appendChild(live);
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
        console.error("Camera Kit init failed", err);
        if (!cancelled) onError?.(err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (session) {
          session.pause();
        }
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err) {
        console.warn("Error cleaning up Camera Kit session", err);
      }
    };
  }, [onReady, onError]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] rounded-2xl bg-black border border-gray-700 overflow-hidden"
    >
      {!initialized && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-gray-400 text-sm">Loading camera…</p>
        </div>
      )}
    </div>
  );
}