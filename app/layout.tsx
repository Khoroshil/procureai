import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProcureAI — AI-закупщик",
  description: "Сравнение коммерческих предложений поставщиков с помощью ИИ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
