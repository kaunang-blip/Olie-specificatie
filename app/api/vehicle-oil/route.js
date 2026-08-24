import { NextResponse } from 'next/server'

const API_BASE = 'https://api.vehicle-finder.com/v1'

function clean(value) {
  return String(value || '').trim()
}

async function vfFetch(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey
    },
    cache: 'no-store'
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  }
}

function getVehicles(data) {
  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data)) {
    return data
  }

  return []
}

export async function GET(request) {
  try {
    const apiKey =
      process.env.VEHICLE_FINDER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder API-key ontbreekt.'
        },
        { status: 500 }
      )
    }

    const year = clean(
      request.nextUrl.searchParams.get('year')
    )

    const make = clean(
      request.nextUrl.searchParams.get('make')
    )

    const model = clean(
      request.nextUrl.searchParams.get('model')
    )

    const cilinderinhoud = clean(
      request.nextUrl.searchParams.get(
        'cilinderinhoud'
      )
    )

    const vermogenKw = clean(
      request.nextUrl.searchParams.get(
        'vermogenKw'
      )
    )

    if (!year || !make || !model) {
      return NextResponse.json(
        {
          error:
            'Year, make en model zijn verplicht.'
        },
        { status: 400 }
      )
    }

    /*
      Vehicle Finder ondersteunt de exacte
      combinatie:

      year + make + model

      De bredere zoekopdrachten gaven 422,
      dus die gebruiken we niet meer.
    */

    const vehicleUrl =
      `${API_BASE}/vehicles` +
      `?year=${encodeURIComponent(year)}` +
      `&make=${encodeURIComponent(make)}` +
      `&model=${encodeURIComponent(model)}`

    const vehicleResult =
      await vfFetch(
        vehicleUrl,
        apiKey
      )

    /*
      Geen Vehicle Finder-resultaat.

      Dit is géén harde fout meer.

      De frontend kan dan doorgaan met
      de lokale RDW/motordatabase.
    */

    if (!vehicleResult.ok) {
      return NextResponse.json({
        vehicle: null,
        oil: null,

        fallbackRequired: true,

        reason:
          'vehicle-finder-no-match',

        message:
          'Geen Vehicle Finder-match gevonden. Lokale motormatching kan worden gebruikt.',

        rdw: {
          year,
          make,
          model,
          cilinderinhoud:
            cilinderinhoud || null,
          vermogenKw:
            vermogenKw || null
        },

        vehicleFinder: {
          status:
            vehicleResult.status,
          details:
            vehicleResult.data
        }
      })
    }

    const vehicles =
      getVehicles(
        vehicleResult.data
      )

    if (!vehicles.length) {
      return NextResponse.json({
        vehicle: null,
        oil: null,

        fallbackRequired: true,

        reason:
          'vehicle-finder-empty',

        message:
          'Geen Vehicle Finder-match gevonden. Lokale motormatching kan worden gebruikt.',

        rdw: {
          year,
          make,
          model,
          cilinderinhoud:
            cilinderinhoud || null,
          vermogenKw:
            vermogenKw || null
        }
      })
    }

    /*
      Op dit moment geeft Vehicle Finder
      voor sommige modellen maar één
      resultaat terug.

      We gebruiken het eerste resultaat
      alleen voor het opvragen van de
      beschikbare oliegegevens.

      De RDW/fallback-database blijft
      verantwoordelijk voor veilige
      motorherkenning wanneer nodig.
    */

    const vehicle =
      vehicles[0]

    if (!vehicle?.id) {
      return NextResponse.json({
        vehicle: null,
        oil: null,

        fallbackRequired: true,

        reason:
          'missing-vehicle-id',

        message:
          'Vehicle Finder gaf geen bruikbare vehicle_id terug.'
      })
    }

    const oilUrl =
      `${API_BASE}/vehicles/` +
      `${encodeURIComponent(
        vehicle.id
      )}/oil-change`

    const oilResult =
      await vfFetch(
        oilUrl,
        apiKey
      )

    /*
      Voertuig gevonden maar geen olie.
      Ook dan laten we lokale fallback toe.
    */

    if (!oilResult.ok) {
      return NextResponse.json({
        vehicle,

        oil: null,

        fallbackRequired: true,

        reason:
          'oil-not-available',

        message:
          'Voertuig gevonden, maar Vehicle Finder heeft geen oliegegevens.',

        vehicleFinder: {
          status:
            oilResult.status,
          details:
            oilResult.data
        }
      })
    }

    return NextResponse.json({
      vehicle,

      oil:
        oilResult.data?.data ||
        oilResult.data,

      fallbackRequired: false,

      source:
        'vehicle-finder'
    })
  } catch (error) {
    console.error(
      'Vehicle oil lookup failed:',
      error
    )

    /*
      Ook een tijdelijke API-fout hoeft
      de rest van de app niet volledig
      te blokkeren.
    */

    return NextResponse.json({
      vehicle: null,
      oil: null,

      fallbackRequired: true,

      reason:
        'vehicle-finder-unreachable',

      message:
        'Vehicle Finder kon tijdelijk niet worden bereikt.'
    })
  }
}
