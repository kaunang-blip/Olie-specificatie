import { NextResponse } from 'next/server'

const VEHICLE_ENDPOINT = 'https://opendata.rdw.nl/resource/m9d7-ebf2.json'
const FUEL_ENDPOINT = 'https://opendata.rdw.nl/resource/8ys7-d773.json'
const AXLE_ENDPOINT = 'https://opendata.rdw.nl/resource/3huj-srit.json'
function normalizePlate(value = '') {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function formatDate(value) {
  if (!value) return null

  const str = String(value)
  if (str.length !== 8) return null

  return `${str.slice(6, 8)}-${str.slice(4, 6)}-${str.slice(0, 4)}`
}

export async function GET(request) {
  try {
    const kentekenRaw = request.nextUrl.searchParams.get('kenteken')
    const kenteken = normalizePlate(kentekenRaw || '')

    if (!kenteken || kenteken.length < 6) {
      return NextResponse.json(
        { error: 'Ongeldig kenteken.' },
        { status: 400 }
      )
    }

    const vehicleUrl =
      `${VEHICLE_ENDPOINT}?kenteken=${encodeURIComponent(kenteken)}&%24limit=1`

    const fuelUrl =
      `${FUEL_ENDPOINT}?kenteken=${encodeURIComponent(kenteken)}&%24limit=10`

    const [vehicleResponse, fuelResponse] = await Promise.all([
      fetch(vehicleUrl, { cache: 'no-store' }),
      fetch(fuelUrl, { cache: 'no-store' })
    ])

    if (!vehicleResponse.ok) {
      return NextResponse.json(
        { error: `RDW voertuigservice gaf status ${vehicleResponse.status}` },
        { status: 502 }
      )
    }

    const vehicles = await vehicleResponse.json()

    let fuels = []

    if (fuelResponse.ok) {
      fuels = await fuelResponse.json()
    }

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { error: 'Kenteken niet gevonden bij RDW.' },
        { status: 404 }
      )
    }

    const v = vehicles[0]

    const brandstof = Array.isArray(fuels)
      ? fuels
          .map((f) => f.brandstof_omschrijving)
          .filter(Boolean)
          .join(' / ')
      : ''
    const vermogenKw = Array.isArray(fuels)
  ? fuels
      .map((f) => Number(f.nettomaximumvermogen))
      .find((v) => Number.isFinite(v) && v > 0) || null
  : null
    return NextResponse.json({
      kenteken,
      merk: v.merk || 'Onbekend',
      handelsbenaming: v.handelsbenaming || '',
      type: v.type || null,
      voertuigsoort: v.voertuigsoort || null,
      inrichting: v.inrichting || null,
      datumEersteToelating: formatDate(v.datum_eerste_toelating),
      cilinderinhoud: v.cilinderinhoud
        ? Number(v.cilinderinhoud)
        : null,
      aantalCilinders: v.aantal_cilinders
        ? Number(v.aantal_cilinders)
        : null,
      variant: v.variant || null,
      uitvoering: v.uitvoering || null,
      typegoedkeuringsnummer: v.typegoedkeuringsnummer || null,
      brandstof: brandstof || null,
      vermogenKw,    })
  } catch (error) {
    console.error('RDW lookup failed:', error)

    return NextResponse.json(
      {
        error: 'RDW kon tijdelijk niet worden bereikt. Probeer het opnieuw.'
      },
      { status: 502 }
    )
  }
}
