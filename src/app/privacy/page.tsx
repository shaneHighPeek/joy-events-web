import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | jOY Events",
  description: "Privacy policy for jOY Events with Australian and Queensland service context.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-14 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">jOY Events</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-black italic uppercase tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-slate-300">Last updated: 28 February 2026</p>

        <div className="mt-10 space-y-8 text-slate-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">1. Overview</h2>
            <p className="mt-2">
              jOY Events is committed to handling personal information responsibly. This policy explains how we collect,
              use, and store information when you use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">2. Information We Collect</h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>basic usage data (pages viewed, interactions with events, device/browser information),</li>
              <li>preference data (vibe settings, selected region, filters),</li>
              <li>contact details if you submit support or feedback requests.</li>
            </ul>
            <p className="mt-2">
              We aim to minimise collection and only gather what is needed to operate and improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">3. How We Use Information</h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>personalising event recommendations and interface settings,</li>
              <li>improving event quality, trust scoring, and platform stability,</li>
              <li>analysing service performance and preventing misuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">4. Cookies and Similar Technologies</h2>
            <p className="mt-2">
              We may use cookies or local storage for essential functions and preference persistence. You can manage
              cookies via browser settings, but parts of the service may not function correctly if disabled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">5. Data Sharing</h2>
            <p className="mt-2">
              We do not sell your personal information. We may share limited data with service providers who support
              hosting, analytics, and core operations, subject to appropriate safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">6. Data Retention and Security</h2>
            <p className="mt-2">
              We retain data only as long as necessary for service delivery, compliance, and legitimate operational
              purposes. We apply technical and organisational measures to protect information from unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">7. Your Rights</h2>
            <p className="mt-2">
              Depending on applicable law, you may request access to or correction of your personal information.
              Contact us for privacy requests and we will respond within a reasonable timeframe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">8. Australian Context</h2>
            <p className="mt-2">
              jOY Events operates in Australia with a current regional focus on South East Queensland. This policy is
              designed to align with Australian privacy principles and good-practice data handling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-wide">9. Updates to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time as the platform evolves. Updated versions will be
              published on this page with a revised date.
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

