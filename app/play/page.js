"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CameraKitView } from "./CameraKitView";

export default function PlayPage() {
  console.log("✅ PlayPage rendered");

  const [step, setStep] = useState("form"); // "form" | "game" | "done"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [playerId, setPlayerId] = useState(null);
  const [currentScore, setCurrentScore] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");

  // Load or generate player ID
  useEffect(() => {
    if (typeof window === "undefined") return;

    let stored = window.localStorage.getItem("player_id");
    if (!stored) {
      stored = "player_" + Math.random().toString(36).slice(2);
      window.localStorage.setItem("player_id", stored);
    }
    console.log("🆔 Player ID:", stored);
    setPlayerId(stored);
  }, []);

  // FORM SUBMIT
  const handleStart = (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Please fill in your name and email.");
      return;
    }

    console.log("🚀 Starting game for:", { name, email });
    setStep("game");
  };

  // SAVE SCORE TO SUPABASE
  const handleGameOver = async (score) => {
    console.log("💾 handleGameOver called with score:", score);

    if (!playerId) {
      setError("Player ID not ready. Refresh the page.");
      console.error("❌ No playerId when saving score");
      return;
    }

    setIsSaving(true);
    setError("");
    setCurrentScore(score);

    try {
      console.log("📤 Inserting into Supabase:", {
        player_id: playerId,
        name,
        email,
        score,
      });

      const { data: insertData, error: insertError } = await supabase
        .from("scores")
        .insert({
          player_id: playerId,
          name,
          email,
          score,
        })
        .select();

      console.log("📥 Supabase insert result:", { insertData, insertError });

      if (insertError) {
        console.error("❌ Supabase insert error:", insertError);
        setError(insertError.message || "Could not save score.");
        setIsSaving(false);
        return;
      }

      // Load leaderboard
      const { data, error: selectError } = await supabase
        .from("scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(10);

      console.log("📊 Supabase leaderboard result:", {
        data,
        selectError,
      });

      if (selectError) {
        console.error("❌ Supabase leaderboard error:", selectError);
        setError(selectError.message || "Could not load leaderboard.");
      } else {
        setLeaderboard(data || []);
      }

      setStep("done");
    } catch (err) {
      console.error("❌ Unexpected Supabase error:", err);
      setError("Unexpected error saving score.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* TOP HEADER */}
        <header className="flex items-center justify-between mb-8">
          <a href="/" className="text-sm text-gray-400 hover:text-white">
            ← Back to Home
          </a>
          <h1 className="text-lg font-semibold">Play the AR Game</h1>
        </header>

        {/* STEP 1 - FORM */}
        {step === "form" && (
          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-2">Enter your details</h2>
            <p className="text-gray-300 mb-6">
              We'll show your name on the leaderboard after you play.
            </p>

            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full rounded-xl bg-black/40 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl bg-black/40 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

              <button
                type="submit"
                className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 font-medium text-sm transition"
              >
                Continue to game
              </button>
            </form>
          </section>
        )}

        {/* STEP 2 - GAME VIEW */}
        {step === "game" && (
          <section className="space-y-6">

            {/* CAMERA KIT */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-2">Game</h2>
              <p className="text-gray-300 mb-4">
                Your Camera Kit experience will appear below.
              </p>

              <CameraKitView
                onReady={() => console.log("📸 Camera Kit Ready")}
                onError={(err) =>
                  setError(err.message || "Camera failed to start")
                }
                onScore={(score) => {
                  console.log("🎯 REAL score from Lens (onScore):", score);
                  handleGameOver(score);
                }}
              />

              {/* 🔥 TEMP: TEST BUTTON TO CHECK SUPABASE ONLY */}
              <button
                onClick={() => handleGameOver(42)}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-green-500 hover:bg-green-400 text-sm font-medium transition"
              >
                Test Save Score = 42
              </button>

              {isSaving && (
                <p className="text-sm text-gray-400 mt-3">
                  Saving score…
                </p>
              )}

              {error && (
                <p className="text-sm text-red-400 mt-3">{error}</p>
              )}
            </div>
          </section>
        )}

        {/* STEP 3 - SCORE + LEADERBOARD */}
        {step === "done" && (
          <section className="space-y-6">

            {/* SCORE CARD */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-2">Nice run!</h2>
              <p className="text-gray-300 mb-2">
                Final score for <span className="font-semibold">{name}</span>:
              </p>
              <p className="text-4xl font-extrabold text-indigo-400">
                {currentScore}
              </p>

              <button
                onClick={() => setStep("game")}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-sm font-medium transition"
              >
                Play again
              </button>
            </div>

            {/* LEADERBOARD */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>

              {leaderboard.length === 0 ? (
                <p className="text-gray-400 text-sm">No scores yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {leaderboard.map((row, index) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2 border border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-gray-400">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-gray-400">
                            {row.email}
                          </p>
                        </div>
                      </div>

                      <span className="text-indigo-300 font-semibold">
                        {row.score}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </section>
        )}
      </div>
    </main>
  );
}