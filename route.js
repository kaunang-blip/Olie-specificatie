import { NextResponse } from 'next/server'

const VEHICLE_ENDPOINT = 'https://opendata.rdw.nl/resource/m9d7-ebf2.json'
const FUEL_ENDPOINT = 'https://opendata.rdw.nl/resource/8ys7-d773.json'

function normalizePlate(value = '') {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function formatDate(value) {
  if (!value || value.length !== 8) return null
  return `${value.slice(6, 8)}-${value.slice(4, 6)}-${value.slice(0, 4)}`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const kenteken = normalizePlate(searchParams.get('kenteken'))

  if (!kenteken || kenteken.length < 6) {
    return NextResponse.json({ error: 'Ongeldig kenteken.' }, { status: 400 })
  }

  try {
    const [vehicleResponse, fuelResponse] = await Promise.all([
      fetch(`${VEHICLE_ENDPOINT}?kenteken=${encodeURIComponent(kenteken)}&$limit=1`, {
        next: { revalidate: 3600 }
      }),
      fetch(`${FUEL_ENDPOINT}?kenteken=${encodeURIComponent(kenteken)}&$limit=10`, {
        next: { revalidate: 3600 }
      })
    ])

    if (!vehicleResponse.ok) {
      throw new Error(`RDW voertuigservice gaf status ${vehicleResponse.status}`)
    }

    const vehicles = await vehicleResponse.json()
    const fuels = fuelResponse.ok ? await fuelResponse.json() : []

    if (!vehicles.length) {
      return NextResponse.json({ error: 'Kenteken niet gevonden bij RDW.' }, { status: 404 })
    }

    const v = vehicles[0]
    const brandstof = fuels.map((f) => f.brandstof_omschrijving).filter(Boolean).join(' / ')

    return NextResponse.json({
      kenteken,
      merk: v.merk || 'Onbekend',
      handelsbenaming: v.handelsbenaming || '',
      voertuigsoort: v.voertuigsoort || null,
      inrichting: v.inrichting || null,
      datumEersteToelating: formatDate(v.datum_eerste_toelating),
      cilinderinhoud: v.cilinderinhoud ? Number(v.cilinderinhoud) : null,
      aantalCilinders: v.aantal_cilinders ? Number(v.aantal_cilinders) : null,
      variant: v.variant || null,
      uitvoering: v.uitvoering || null,
      typegoedkeuringsnummer: v.typegoedkeuringsnummer || null,
      brandstof: brandstof || null
    })
  } catch (error) {
    console.error('RDW lookup failed:', error)
    return NextResponse.json(
      { error: 'RDW kon tijdelijk niet worden bereikt. Probeer het opnieuw.' },
      { status: 502 }
    )
  }
}
