import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Pixelify_Sans } from "next/font/google";

// Pixel font for display text only; body copy stays on the native system font for legibility.
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "Veggie Scale",
  description: "Estimate a vegetable's weight from a photo.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}
