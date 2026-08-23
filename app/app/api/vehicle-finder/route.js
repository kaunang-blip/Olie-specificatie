import { NextResponse } from 'next/server'

const API_BASE = 'https://api.vehicle-finder.com/v1'

export async function GET(request) {
  try {
    const apiKey = process.env.VEHICLE_FINDER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vehicle Finder API-key ontbreekt.' },
        { status: 500 }
      )
    }

    const year = request.nextUrl.searchParams.get('year')
    const make = request.nextUrl.searchParams.get('make')
    const model = request.nextUrl.searchParams.get('model')

    if (!year || !make || !model) {
      return NextResponse.json(
        { error: 'Year, make en model zijn verplicht.' },
        { status: 400 }
      )
    }

    const vehicleUrl =
      `${API_BASE}/vehicles?year=${encodeURIComponent(year)}` +
      `&make=${encodeURIComponent(make)}` +
      `&model=${encodeURIComponent(model)}`

    const vehicleResponse = await fetch(vehicleUrl, {
      headers: {
        'X-API-Key': apiKey
      },
      cache: 'no-store'
    })

    const vehicleData = await vehicleResponse.json()

    if (!vehicleResponse.ok) {
      return NextResponse.json(
        {
          error: 'Vehicle Finder voertuigzoeking gaf een fout.',
          details: vehicleData
        },
        { status: vehicleResponse.status }
      )
    }

    const vehicles = Array.isArray(vehicleData?.data)
      ? vehicleData.data
      : []

    if (vehicles.length === 0) {
      return NextResponse.json(
        { error: 'Geen passend voertuig gevonden bij Vehicle Finder.' },
        { status: 404 }
      )
    }

    const vehicle = vehicles[0]

    if (!vehicle?.id) {
      return NextResponse.json(
        { error: 'Vehicle Finder gaf geen vehicle_id terug.' },
        { status: 502 }
      )
    }

    const oilUrl =
      `${API_BASE}/vehicles/${encodeURIComponent(vehicle.id)}/oil-change`

    const oilResponse = await fetch(oilUrl, {
      headers: {
        'X-API-Key': apiKey
      },
      cache: 'no-store'
    })

    const oilData = await oilResponse.json()

    if (!oilResponse.ok) {
      return NextResponse.json(
        {
          error: 'Vehicle Finder oil-change gaf een fout.',
          vehicle,
          details: oilData
        },
        { status: oilResponse.status }
      )
    }

    return NextResponse.json({
      vehicle,
      oil: oilData?.data || oilData
    })
  } catch (error) {
    console.error('Vehicle Finder lookup failed:', error)

    return NextResponse.json(
      { error: 'Vehicle Finder kon niet worden bereikt.' },
      { status: 502 }
    )
  }
}
