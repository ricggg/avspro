import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avatar Studio Pro",
  description: "Real-time AI Avatar Streaming",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <style>{`
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            background: #0a0a0a;
            color: #ffffff;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont,
              'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          input, textarea, select, button {
            font-family: inherit;
          }
          input[type="text"],
          input[type="password"],
          textarea,
          select {
            background: #1a1a1a;
            color: #ffffff;
            border: 1px solid #333333;
            outline: none;
          }
          input[type="text"]:focus,
          input[type="password"]:focus,
          textarea:focus {
            border-color: #3b82f6;
          }
        `}</style>
      </head>
      <body
        style={{
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}