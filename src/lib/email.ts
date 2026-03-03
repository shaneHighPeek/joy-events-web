import crypto from 'crypto';

const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'noreply@joy.guide';
const adminEmail = process.env.ADMIN_EMAIL || 'shane@highpeekpro.com';
const approvalSecret = process.env.APPROVAL_SECRET || '';

function generateToken(eventId: string): string {
  return crypto.createHmac('sha256', approvalSecret).update(eventId).digest('hex');
}

export async function sendApprovalEmail(event: {
  id: string;
  title: string;
  venue: string;
  date: string;
  description?: string;
  link?: string;
  image?: string;
  user_email?: string;
}) {
  if (!postmarkToken) {
    console.warn('POSTMARK_SERVER_TOKEN not configured. Skipping email.');
    return { success: false, error: 'Email not configured' };
  }

  const approvalToken = generateToken(event.id);
  const approvalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://joy.guide'}/api/events/approve?id=${event.id}&token=${approvalToken}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Event Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: white; letter-spacing: -0.02em;">
                jOY Events
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
                New Event Submission
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                A new event has been submitted and is awaiting your approval:
              </p>

              <!-- Event Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
                ${event.image ? `
                <tr>
                  <td style="padding: 0;">
                    <img src="${event.image}" alt="${event.title}" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: cover;" />
                  </td>
                </tr>
                ` : `
                <tr>
                  <td style="padding: 24px; background-color: #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 600;">
                      📷 No image provided
                    </p>
                  </td>
                </tr>
                `}
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #0f172a;">
                      ${event.title}
                    </h2>
                    
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                      <tr>
                        <td style="padding-right: 8px; font-size: 18px;">📍</td>
                        <td style="font-size: 14px; color: #64748b; font-weight: 600;">
                          ${event.venue}
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="padding-right: 8px; font-size: 18px;">📅</td>
                        <td style="font-size: 14px; color: #64748b; font-weight: 600;">
                          ${event.date}
                        </td>
                      </tr>
                    </table>

                    ${event.description ? `
                    <p style="margin: 16px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                      ${event.description}
                    </p>
                    ` : ''}

                    ${event.link ? `
                    <p style="margin: 16px 0 0 0;">
                      <a href="${event.link}" style="font-size: 13px; color: #10b981; text-decoration: none; font-weight: 600;">
                        🔗 Event Website
                      </a>
                    </p>
                    ` : ''}

                    ${event.user_email ? `
                    <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8;">
                      Submitted by: ${event.user_email}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Approve Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px rgba(16,185,129,0.3);">
                      ✓ Approve Event
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.6;">
                Click the button above to instantly approve and publish this event.<br>
                Once approved, it will appear in the joy.guide feed immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                <strong>jOY Discovery Engine</strong><br>
                Curing lonely, one event at a time.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #cbd5e1;">
                <a href="https://joy.guide" style="color: #10b981; text-decoration: none;">joy.guide</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textBody = `
jOY Events - New Event Submission

A new event has been submitted and is awaiting your approval:

EVENT DETAILS:
--------------
Title: ${event.title}
Venue: ${event.venue}
Date: ${event.date}
${event.description ? `\nDescription: ${event.description}` : ''}
${event.link ? `\nWebsite: ${event.link}` : ''}
${event.image ? `\nImage: ${event.image}` : ''}
${event.user_email ? `\nSubmitted by: ${event.user_email}` : ''}

APPROVE THIS EVENT:
Click the link below to approve and publish immediately:
${approvalUrl}

---
jOY Discovery Engine
https://joy.guide
  `;

  try {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkToken,
      },
      body: JSON.stringify({
        From: fromEmail,
        To: adminEmail,
        Subject: `🎉 New Event: ${event.title}`,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: 'outbound',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Postmark error:', data);
      return { success: false, error: data.Message || 'Email send failed' };
    }

    console.log('Approval email sent successfully:', data.MessageID);
    return { success: true, messageId: data.MessageID };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}
