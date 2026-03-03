import { NextResponse } from 'next/server';
import { sendApprovalEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event } = body;

    console.log('Notify API received event:', event);

    if (!event || !event.id || !event.title) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }

    const result = await sendApprovalEmail(event);

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Notify API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
