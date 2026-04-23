import type { Metadata } from 'next'
import './globals.css'
import Sidebar from './Sidebar'
import AuthGuard from './AuthGuard'

export const metadata: Metadata = {
  title: 'RutaFlow — Planeador de Rutas',
  description: 'Sistema de planeación y gestión de rutas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthGuard>
          <div style={{ display: 'flex', minHeight: '100vh', background: '#0c0e14' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
              {children}
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  )
}