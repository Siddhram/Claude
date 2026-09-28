import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nexentia PDF Intelligence | RAG Assistant",
  description: "Upload PDFs to Cloudinary, index into Pinecone vector storage, and query data with high precision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className={`${outfit.variable} ${plusJakarta.variable} font-sans h-full overflow-hidden bg-[#0d0d12] text-[#e2e2ec]`}>
        {children}
      </body>
    </html>
  );
}
