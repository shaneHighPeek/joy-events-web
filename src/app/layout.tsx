import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jOY Events",
  description: "High-trust event discovery for South East Queensland.",
  other: {
    "impact-site-verification": "2d541858-c51c-4f43-846c-ed1baa468e48",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
