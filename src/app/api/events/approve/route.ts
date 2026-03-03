import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const approvalSecret = process.env.APPROVAL_SECRET || '';

function generateToken(eventId: string): string {
  return crypto.createHmac('sha256', approvalSecret).update(eventId).digest('hex');
}

function verifyToken(eventId: string, token: string): boolean {
  return generateToken(eventId) === token;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('id');
  const token = searchParams.get('token');

  if (!eventId || !token) {
    return NextResponse.json({ error: 'Missing event ID or token' }, { status: 400 });
  }

  if (!verifyToken(eventId, token)) {
    return NextResponse.json({ error: 'Invalid approval token' }, { status: 403 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
  }

  try {
    // Update event status to approved
    const { data, error } = await supabase
      .from('user_submitted_events')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Return a simple HTML success page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event Approved</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #0f172a;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 500px;
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 32px;
              font-weight: 900;
              margin-bottom: 16px;
            }
            p {
              font-size: 18px;
              color: #94a3b8;
              margin-bottom: 32px;
            }
            .event-details {
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 16px;
              padding: 24px;
              text-align: left;
              margin-top: 32px;
            }
            .event-details h3 {
              font-size: 20px;
              margin: 0 0 16px 0;
            }
            .event-details p {
              font-size: 14px;
              margin: 8px 0;
              color: #cbd5e1;
            }
            a {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 32px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 700;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Event Approved!</h1>
            <p>The event is now live on joy.guide</p>
            <div class="event-details">
              <h3>${data[0].title}</h3>
              <p><strong>Venue:</strong> ${data[0].venue}</p>
              <p><strong>Date:</strong> ${data[0].date}</p>
            </div>
            <a href="https://joy.guide">View on joy.guide</a>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: error.message || 'Approval failed' }, { status: 500 });
  }
}
