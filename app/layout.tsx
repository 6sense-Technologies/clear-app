
export const metadata = { title: "Compliance Console", description: "Multi-framework assessments + risks + integrations" };
import "./../styles/globals.css";
import React from "react";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-800">{children}</body>
    </html>
  );
}
