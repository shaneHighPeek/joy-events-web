import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | jOY Events",
  description: "Terms of use for jOY Events in Australia, with Queensland service context.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-14 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">jOY Events</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-black italic uppercase tracking-tight">Terms of Use</h1>
        <p className="mt-3 text-slate-300">Last updated: 28 February 2026</p>

        <div className="mt-10 space-y-8 text-slate-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">1. Scope</h2>
            <p className="mt-2">
              These Terms govern your access to and use of jOY Events. jOY Events is an event discovery and curation
              service focused on South East Queensland, including Brisbane, Gold Coast, and Sunshine Coast.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">2. Information Service</h2>
            <p className="mt-2">
              jOY Events provides event information from third-party sources (including councils, venues, and ticketing
              providers). Event details can change at short notice. You are responsible for confirming final details with
              the organiser or ticketing provider before attending.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">3. No Booking Contract</h2>
            <p className="mt-2">
              jOY Events is not a ticketing issuer unless expressly stated. Where links direct you to third-party
              websites, those bookings are governed by the third party&apos;s terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">4. Acceptable Use</h2>
            <p className="mt-2">You must not misuse the platform, including by:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>attempting unauthorised access to systems or data,</li>
              <li>using automated tools to scrape without permission,</li>
              <li>uploading unlawful, misleading, or harmful content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">5. Liability</h2>
            <p className="mt-2">
              To the extent permitted by Australian law, jOY Events is not liable for losses arising from cancelled,
              postponed, sold-out, inaccurate, or changed events supplied by third parties.
            </p>
            <p className="mt-2">
              Nothing in these Terms excludes rights that cannot be excluded under the Australian Consumer Law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">6. Intellectual Property</h2>
            <p className="mt-2">
              The jOY Events brand, design system, and curated presentation are protected. Third-party event names,
              images, and logos remain the property of their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">7. Changes</h2>
            <p className="mt-2">
              We may update these Terms as the service evolves. Continued use after updates constitutes acceptance of
              the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">8. Governing Law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of Queensland, Australia. Any disputes are subject to the courts of
              Queensland, unless applicable law provides otherwise.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-slate-400">
          <Link href="/" className="underline underline-offset-2 hover:text-white">
            Return to jOY Events
          </Link>
        </div>
      </div>
    </main>
  );
}

