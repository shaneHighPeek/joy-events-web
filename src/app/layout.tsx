import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jOY Events",
  description: "High-trust event discovery for South East Queensland.",
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
