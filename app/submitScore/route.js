import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    // 1. Setup Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 2. Security Check: Get the User from the Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return NextResponse.json({ error: "No Auth Token found" }, { status: 401 });
    }

    // Verify the token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
    );

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
    }

    // 3. Get the Score from the Request Body
    const body = await request.json();
    const { score } = body;

    if (score === undefined || score === null) {
        return NextResponse.json({ error: "No score provided" }, { status: 400 });
    }

    // 4. Save to Database
    // (Matches your 'scores' table screenshot exactly)
    const { error: insertError } = await supabase
      .from("scores") 
      .insert({
        player_id: user.id,                      // Matches 'player_id' column
        name: user.user_metadata.full_name,      // Matches 'name' column
        email: user.user_metadata.email_contact, // Matches 'email' column
        score: parseInt(score),                  // Matches 'score' column
      });

    if (insertError) {
      console.error("❌ Database Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`✅ Score saved: ${score} for ${user.user_metadata.full_name}`);
    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (err) {
    console.error("💥 Server Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}