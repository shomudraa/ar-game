import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    // 1. Setup Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 2. Identify the User (Security Check)
    // We get the token from the "Authorization" header sent by your Website
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return NextResponse.json({ error: "No Auth Token found" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
    );

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
    }

    // 3. Get the Score (FROM JSON, not URL)
    // Your Lens sends { "score": 10 }
    const body = await request.json();
    const { score } = body;

    // 4. Insert into YOUR 'scores' table (Matches your screenshot)
    const { error: insertError } = await supabase
      .from("scores") // <--- Matches your table name
      .insert({
        player_id: user.id,                      // The User's ID
        name: user.user_metadata.full_name,      // The Name they typed in login
        email: user.user_metadata.email_contact, // The Email they typed
        score: parseInt(score),                  // The Score from the game
      });

    if (insertError) {
      console.error("❌ Database Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`✅ Saved score for ${user.user_metadata.full_name}: ${score}`);
    return NextResponse.json({ ok: true, score }, { status: 200 });

  } catch (err) {
    console.error("💥 Server Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}