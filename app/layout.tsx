import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PG-Archive',
  description: 'Lector de mangas y cómics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 font-sans">{children}</body>
    </html>
  )
}
