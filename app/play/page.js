"use client";

import { useEffect, useRef, useState } from 'react';
import { bootstrapCameraKit } from '@snap/camera-kit';
import { supabase } from '@/lib/supabaseClient'; // Uses your new lib file

// --- CONFIGURATION ---
const APITOKEN = process.env.NEXT_PUBLIC_SNAP_API_TOKEN;
const LENS_ID = process.env.NEXT_PUBLIC_LENS_ID;
const GROUP_ID = process.env.NEXT_PUBLIC_LENS_GROUP_ID;

export default function GamePage() {
  const [step, setStep] = useState('login'); // 'login' | 'loading' | 'game'
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);

  // 1. HANDLE LOGIN
  async function handleLogin(e) {
    e.preventDefault();
    setStep('loading');

    // Guest Login (Anonymous)
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      alert("Login Error: " + error.message);
      setStep('login');
      return;
    }

    if (data.user) {
      // Save Name/Email temporarily in User Metadata
      await supabase.auth.updateUser({
        data: { full_name: formData.name, email_contact: formData.email }
      });
      // Start Camera
      startCameraKit(data.session.access_token);
    }
  }

  // 2. START CAMERA KIT
  async function startCameraKit(userToken) {
    try {
      const cameraKit = await bootstrapCameraKit({
        apiToken: APITOKEN,
        lensHttpHandler: async (request) => {
          // --- THE INTERCEPTOR ---
          // Catches the request sent to "https://game-host.local/submit-score"
          if (request.url.includes('submit-score')) {
            console.log("⚡ Lens sent a score! Redirecting to internal API...");
            
            // Redirect to your route.js
            const realUrl = `/submitScore`; 

            // Add Security Headers
            const secureHeaders = new Headers(request.headers);
            secureHeaders.append('Authorization', `Bearer ${userToken}`);
            
            // Forward the request
            return fetch(realUrl, {
              method: 'POST',
              headers: secureHeaders,
              body: request.body
            });
          }
          // Let all other requests (loading lenses, etc.) pass through
          return fetch(request.url, request);
        }
      });

      // Create Session
      const session = await cameraKit.createSession({ liveRenderTarget: canvasRef.current });
      sessionRef.current = session;

      // Get Camera Source
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      await session.setSource(mediaStream);
      await session.play();

      // Load Lens
      const lens = await cameraKit.loadLens(LENS_ID, GROUP_ID);
      await session.applyLens(lens);

      setStep('game');

    } catch (err) {
      console.error(err);
      alert("Camera Error: " + err.message);
      setStep('login');
    }
  }

  // 3. UI RENDER
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: 'black', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* LOGIN FORM */}
      {step === 'login' && (
        <div style={{ zIndex: 10, padding: '2rem', backgroundColor: '#1f2937', borderRadius: '1rem', border: '1px solid #374151', maxWidth: '300px', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>Play AR Game</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              required type="text" placeholder="Your Name"
              style={{ padding: '0.75rem', borderRadius: '0.25rem', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white' }}
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <input 
              required type="email" placeholder="Email"
              style={{ padding: '0.75rem', borderRadius: '0.25rem', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white' }}
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <button type="submit" style={{ marginTop: '1rem', backgroundColor: '#eab308', color: 'black', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
              Start Playing
            </button>
          </form>
        </div>
      )}

      {/* LOADING STATE */}
      {step === 'loading' && <div style={{ fontSize: '1.25rem', fontFamily: 'monospace' }}>Starting Camera...</div>}

      {/* GAME CANVAS */}
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: step === 'game' ? 'block' : 'none' }} 
      />
    </div>
  );
}