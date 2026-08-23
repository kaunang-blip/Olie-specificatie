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

    const vehicleId = request.nextUrl.searchParams.get('vehicle_id')

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicle_id ontbreekt.' },
        { status: 400 }
      )
    }

    const url =
      `${API_BASE}/vehicles/${encodeURIComponent(vehicleId)}/oil-change`

    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey
      },
      cache: 'no-store'
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Vehicle Finder oil-change gaf een fout.',
          details: data
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Oil change lookup failed:', error)

    return NextResponse.json(
      { error: 'Oil-change gegevens konden niet worden opgehaald.' },
      { status: 502 }
    )
  }
}
