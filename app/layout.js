import './globals.css'

export const metadata = {
  title: 'Kenteken Oliezoeker',
  description: 'Vind voertuiggegevens en straks de juiste olie van Shell, OK en MPM.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
