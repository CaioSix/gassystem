import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alexandre Gás | Pedido Rápido Online',
  description:
    'Peça seu gás e água com rapidez na Alexandre Gás. Entrega rápida, acompanhe seu pedido em tempo real!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
