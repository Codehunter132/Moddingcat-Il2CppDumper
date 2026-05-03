import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Modcat Dumper | Premium il2cpp Dumper",
  description: "Dump Unity il2cpp games directly from the web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-indigo-500/30">
        <main className="min-h-screen bg-gradient-to-br from-[#0f1115] via-[#13151a] to-[#0a0a0c] flex items-center justify-center p-4">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
          </div>
          <div className="relative z-10 w-full max-w-4xl">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
