import "./globals.css";

export const metadata = {
  title: "LiftLab",
  description: "Designing Supports for Every Learner"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
