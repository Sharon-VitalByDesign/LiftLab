import "./globals.css";
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "LiftLab",
  description: "Designing Supports for Every Learner"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
