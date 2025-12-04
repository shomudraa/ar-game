// app/submitScore/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    console.error("❌ Missing Supabase env vars in route.js");
    throw new Error("Missing Supabase env vars");
  }

  return createClient(url, serviceKey);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scoreRaw = searchParams.get("score");

    if (!scoreRaw) {
      return NextResponse.json(
        { ok: false, error: "Missing score param" },
        { status: 400 }
      );
    }

    const score = parseInt(scoreRaw, 10);
    if (Number.isNaN(score)) {
      return NextResponse.json(
        { ok: false, error: "Score must be a number" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { error: insertError } = await supabase.from("scores").insert({
      player_id: "lens_" + Date.now().toString(),
      name: "Lens Player",
      email: "lens@player",
      score,
    });

    if (insertError) {
      console.error("❌ Supabase insert error in /submitScore:", insertError);
      return NextResponse.json(
        { ok: false, error: "Supabase insert failed" },
        { status: 500 }
      );
    }

    console.log("✅ Saved score from Lens:", score);

    return NextResponse.json({ ok: true, score }, { status: 200 });
  } catch (err) {
    console.error("💥 Unexpected error in /submitScore:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// Let POST behave the same as GET
export async function POST(request) {
  return GET(request);
}