export const metadata = {
  title: 'amoeba-scraper',
  description: 'FitGirl Repacks scraper API with MySQL storage',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}