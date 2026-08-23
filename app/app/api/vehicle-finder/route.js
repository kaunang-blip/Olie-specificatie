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

    const url =
      `${API_BASE}/vehicles?year=${encodeURIComponent(year)}` +
      `&make=${encodeURIComponent(make)}` +
      `&model=${encodeURIComponent(model)}`

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
          error: 'Vehicle Finder gaf een fout.',
          details: data
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Vehicle Finder lookup failed:', error)

    return NextResponse.json(
      { error: 'Vehicle Finder kon niet worden bereikt.' },
      { status: 502 }
    )
  }
}
