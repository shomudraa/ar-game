// app/submitScore/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawScore = searchParams.get("score");

    console.log("🌐 /submitScore GET called. rawScore =", rawScore);

    if (!rawScore) {
      return NextResponse.json(
        { ok: false, error: "Missing 'score' query parameter" },
        { status: 400 }
      );
    }

    const score = parseInt(rawScore, 10);
    if (Number.isNaN(score)) {
      return NextResponse.json(
        { ok: false, error: "Invalid 'score' value" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("scores").insert({
      player_id: "lens_player",
      name: "Lens Player",
      email: "lens@player",
      score,
    });

    if (insertError) {
      console.error("❌ Supabase insert error in /submitScore:", insertError);
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ Saved score from Lens to Supabase:", score);

    return NextResponse.json(
      { ok: true, score },
      { status: 200 }
    );
  } catch (err) {
    console.error("💥 Unexpected error in /submitScore:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return GET(request);
}