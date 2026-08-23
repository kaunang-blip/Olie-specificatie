import { NextResponse } from 'next/server'

const API_BASE = 'https://api.vehicle-finder.com/v1'

function clean(value) {
  return String(value || '').trim()
}

async function vehicleFinderFetch(url, apiKey) {
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

function calculateVehicleScore(vehicle, wanted) {
  let score = 0

  const vehicleMake = clean(vehicle?.make).toLowerCase()
  const vehicleModel = clean(vehicle?.model).toLowerCase()
  const vehicleYear = Number(vehicle?.year)

  const wantedMake = clean(wanted.make).toLowerCase()
  const wantedModel = clean(wanted.model).toLowerCase()
  const wantedYear = Number(wanted.year)

  // Merk
  if (vehicleMake === wantedMake) {
    score += 40
  }

  // Model exact
  if (vehicleModel === wantedModel) {
    score += 40
  }

  // Model bevat zoekterm
  if (
    vehicleModel &&
    wantedModel &&
    (
      vehicleModel.includes(wantedModel) ||
      wantedModel.includes(vehicleModel)
    )
  ) {
    score += 25
  }

  // Bouwjaar
  if (
    Number.isFinite(vehicleYear) &&
    Number.isFinite(wantedYear)
  ) {
    if (vehicleYear === wantedYear) {
      score += 20
    } else if (Math.abs(vehicleYear - wantedYear) === 1) {
      score += 5
    }
  }

  return score
}

function findBestVehicle(vehicles, wanted) {
  if (!vehicles.length) {
    return null
  }

  const scored = vehicles.map((vehicle) => ({
    vehicle,
    score: calculateVehicleScore(vehicle, wanted)
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored[0] || null
}

async function searchExactVehicle({
  apiKey,
  year,
  make,
  model
}) {
  const url =
    `${API_BASE}/vehicles` +
    `?year=${encodeURIComponent(year)}` +
    `&make=${encodeURIComponent(make)}` +
    `&model=${encodeURIComponent(model)}`

  const result = await vehicleFinderFetch(url, apiKey)

  if (!result.ok) {
    return {
      vehicles: [],
      status: result.status,
      details: result.data
    }
  }

  return {
    vehicles: getVehicles(result.data),
    status: result.status,
    details: result.data
  }
}

async function searchByMakeAndYear({
  apiKey,
  year,
  make
}) {
  const url =
    `${API_BASE}/vehicles` +
    `?year=${encodeURIComponent(year)}` +
    `&make=${encodeURIComponent(make)}`

  const result = await vehicleFinderFetch(url, apiKey)

  if (!result.ok) {
    return {
      vehicles: [],
      status: result.status,
      details: result.data
    }
  }

  return {
    vehicles: getVehicles(result.data),
    status: result.status,
    details: result.data
  }
}

export async function GET(request) {
  try {
    const apiKey = process.env.VEHICLE_FINDER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Vehicle Finder API-key ontbreekt.'
        },
        {
          status: 500
        }
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

    const displacement = clean(
      request.nextUrl.searchParams.get('displacement')
    )

    const powerKw = clean(
      request.nextUrl.searchParams.get('powerKw')
    )

    const fuel = clean(
      request.nextUrl.searchParams.get('fuel')
    )

    if (!year || !make || !model) {
      return NextResponse.json(
        {
          error: 'Year, make en model zijn verplicht.'
        },
        {
          status: 400
        }
      )
    }

    const wanted = {
      year,
      make,
      model,
      displacement,
      powerKw,
      fuel
    }

    /*
     * STAP 1
     *
     * Eerst proberen we de exacte combinatie:
     *
     * jaar + merk + model
     */

    const exactResult = await searchExactVehicle({
      apiKey,
      year,
      make,
      model
    })

    let vehicles = exactResult.vehicles
    let searchMethod = 'exact'

    /*
     * STAP 2
     *
     * Als Vehicle Finder de exacte combinatie
     * niet accepteert of niets vindt, proberen
     * we alleen:
     *
     * jaar + merk
     */

    if (!vehicles.length) {
      const broadResult = await searchByMakeAndYear({
        apiKey,
        year,
        make
      })

      vehicles = broadResult.vehicles
      searchMethod = 'make-year'
    }

    /*
     * Geen voertuigen gevonden.
     */

    if (!vehicles.length) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder kon geen passend voertuig vinden.',
          search: {
            year,
            make,
            model
          }
        },
        {
          status: 404
        }
      )
    }

    /*
     * Zoek de beste kandidaat.
     */

    const bestMatch = findBestVehicle(
      vehicles,
      wanted
    )

    if (!bestMatch?.vehicle) {
      return NextResponse.json(
        {
          error:
            'Geen betrouwbare voertuigmatch gevonden.'
        },
        {
          status: 404
        }
      )
    }

    const vehicle = bestMatch.vehicle

    /*
     * Minimale betrouwbaarheid.
     *
     * Hiermee voorkomen we dat bijvoorbeeld
     * een Renault Trafic per ongeluk aan een
     * ander Renault-model wordt gekoppeld.
     */

    if (bestMatch.score < 60) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder vond voertuigen, maar geen voldoende betrouwbare modelmatch.',
          bestCandidate: vehicle,
          score: bestMatch.score,
          searchMethod
        },
        {
          status: 422
        }
      )
    }

    if (!vehicle?.id) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder gaf geen vehicle_id terug.',
          vehicle
        },
        {
          status: 502
        }
      )
    }

    /*
     * STAP 3
     *
     * Oliegegevens ophalen.
     */

    const oilUrl =
      `${API_BASE}/vehicles/` +
      `${encodeURIComponent(vehicle.id)}` +
      `/oil-change`

    const oilResult = await vehicleFinderFetch(
      oilUrl,
      apiKey
    )

    if (!oilResult.ok) {
      return NextResponse.json(
        {
          error:
            'Voertuig gevonden, maar Vehicle Finder kon geen oliegegevens leveren.',
          vehicle,
          score: bestMatch.score,
          searchMethod,
          details: oilResult.data
        },
        {
          status: oilResult.status || 502
        }
      )
    }

    /*
     * Alles gelukt.
     */

    return NextResponse.json({
      vehicle,
      oil: oilResult.data?.data || oilResult.data,

      match: {
        score: bestMatch.score,
        method: searchMethod,

        rdw: {
          year,
          make,
          model,
          displacement,
          powerKw,
          fuel
        }
      }
    })
  } catch (error) {
    console.error(
      'Vehicle Finder lookup failed:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Vehicle Finder kon niet worden bereikt.'
      },
      {
        status: 502
      }
    )
  }
}
