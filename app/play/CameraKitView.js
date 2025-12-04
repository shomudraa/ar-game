"use client";

import { useEffect, useRef } from "react";
import { bootstrapCameraKit } from "@snap/camera-kit";

export function CameraKitView({ onReady, onError }) {
  const containerRef = useRef(null);
  const cameraKitRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    async function initCameraKit() {
      try {
        console.log("🎥 Initializing Camera Kit...");

        const apiToken = process.env.NEXT_PUBLIC_CAMERA_KIT_API_TOKEN;
        const lensId = process.env.NEXT_PUBLIC_CAMERA_KIT_LENS_ID;

        const cameraKit = await bootstrapCameraKit({ apiToken });
        cameraKitRef.current = cameraKit;

        const live = cameraKit.createLiveRender({
          container: containerRef.current,
        });

        await live.setLens(lensId);
        await live.play();

        sessionRef.current = live.session;

        console.log("📡 Camera Kit Ready.");
        console.log("📡 Waiting for lens messages…");

        // Listen for messages coming from the Lens script
        live.session.on("message", (event) => {
          console.log("📩 Lens message received:", event);

          // --- STANDARDIZED SCORE MESSAGE ---
          if (event.type === "score") {
            const score = event.score;
            console.log("🎯 Score received from Lens:", score);

            // Send score to backend
            sendScoreToBackend(score);
          }

          // Debug ANY message from lens
          if (event.type === "log") {
            console.log("📝 Lens Log:", event.message);
          }
        });

        if (onReady) onReady();
      } catch (err) {
        console.error("❌ CameraKit Init Error:", err);
        if (onError) onError(err);
      }
    }

    initCameraKit();
  }, []);

  // ============================================================
  //  SEND SCORE TO BACKEND (/submitScore)
  // ============================================================
  async function sendScoreToBackend(score) {
    console.log("📡 Sending score to backend:", score);

    try {
      const res = await fetch(`/submitScore?score=${score}`);
      const json = await res.json();

      console.log("✅ Backend responded:", json);
    } catch (err) {
      console.error("❌ Error sending score to backend:", err);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "75vh",
        backgroundColor: "black",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
}