import { NextResponse } from 'next/server'

const API_BASE = 'https://api.vehicle-finder.com/v1'

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function extractNumbers(value) {
  if (!value) return []

  const matches = String(value).match(/\d+(?:[.,]\d+)?/g)

  if (!matches) return []

  return matches
    .map((value) => Number(value.replace(',', '.')))
    .filter((value) => Number.isFinite(value))
}

function scoreVehicle(vehicle, rdw) {
  let score = 0
  const reasons = []

  // Bouwjaar
  if (
    Number(vehicle.year) ===
    Number(rdw.year)
  ) {
    score += 20
    reasons.push('bouwjaar')
  }

  // Merk
  if (
    normalizeText(vehicle.make) ===
    normalizeText(rdw.make)
  ) {
    score += 20
    reasons.push('merk')
  }

  // Model
  if (
    normalizeText(vehicle.model) ===
    normalizeText(rdw.model)
  ) {
    score += 20
    reasons.push('model')
  }

  const engineText = normalizeText(
    vehicle.engine
  )

  const trimText = normalizeText(
    vehicle.trim
  )

  const combinedText =
    `${engineText} ${trimText}`.trim()

  const numbers =
    extractNumbers(combinedText)

  // Cilinderinhoud uit teksten zoals 1.8, 1798, 2.0 etc.
  if (
    Number.isFinite(rdw.cilinderinhoud) &&
    rdw.cilinderinhoud > 0
  ) {
    const liters =
      rdw.cilinderinhoud / 1000

    const capacityMatch =
      numbers.some((n) => {
        return (
          Math.abs(n - liters) < 0.06 ||
          Math.abs(
            n - rdw.cilinderinhoud
          ) < 30
        )
      })

    if (capacityMatch) {
      score += 30
      reasons.push('cilinderinhoud')
    }
  }

  // Vermogen proberen te herkennen in tekst
  if (
    Number.isFinite(rdw.vermogenKw) &&
    rdw.vermogenKw > 0
  ) {
    const vermogenPk =
      Math.round(
        rdw.vermogenKw * 1.35962
      )

    const powerMatch =
      numbers.some((n) => {
        return (
          Math.abs(
            n - rdw.vermogenKw
          ) <= 2 ||
          Math.abs(
            n - vermogenPk
          ) <= 3
        )
      })

    if (powerMatch) {
      score += 30
      reasons.push('vermogen')
    }
  }

  // Vehicle Finder geeft soms geen motordata
  const hasEngineInfo =
    engineText.length > 0 ||
    trimText.length > 0

  if (hasEngineInfo) {
    score += 10
    reasons.push('motorinformatie aanwezig')
  }

  return {
    score,
    reasons,
    hasEngineInfo
  }
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

    const year =
      request.nextUrl.searchParams.get(
        'year'
      )

    const make =
      request.nextUrl.searchParams.get(
        'make'
      )

    const model =
      request.nextUrl.searchParams.get(
        'model'
      )

    const cilinderinhoud =
      Number(
        request.nextUrl.searchParams.get(
          'cilinderinhoud'
        )
      )

    const vermogenKw =
      Number(
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

    const vehicleUrl =
      `${API_BASE}/vehicles` +
      `?year=${encodeURIComponent(year)}` +
      `&make=${encodeURIComponent(make)}` +
      `&model=${encodeURIComponent(model)}`

    const vehicleResponse =
      await fetch(vehicleUrl, {
        headers: {
          'X-API-Key': apiKey
        },
        cache: 'no-store'
      })

    const vehicleData =
      await vehicleResponse.json()

    if (!vehicleResponse.ok) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder voertuigzoeking gaf een fout.',
          details: vehicleData
        },
        {
          status:
            vehicleResponse.status
        }
      )
    }

    const vehicles =
      Array.isArray(
        vehicleData?.data
      )
        ? vehicleData.data
        : []

    if (vehicles.length === 0) {
      return NextResponse.json(
        {
          error:
            'Geen passend voertuig gevonden bij Vehicle Finder.'
        },
        { status: 404 }
      )
    }

    const rdw = {
      year: Number(year),
      make,
      model,
      cilinderinhoud:
        Number.isFinite(
          cilinderinhoud
        )
          ? cilinderinhoud
          : null,
      vermogenKw:
        Number.isFinite(
          vermogenKw
        )
          ? vermogenKw
          : null
    }

    const rankedVehicles =
      vehicles
        .map((vehicle) => {
          const result =
            scoreVehicle(
              vehicle,
              rdw
            )

          return {
            vehicle,
            ...result
          }
        })
        .sort(
          (a, b) =>
            b.score - a.score
        )

    const best =
      rankedVehicles[0]

    if (!best?.vehicle?.id) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder gaf geen bruikbare vehicle_id terug.'
        },
        { status: 502 }
      )
    }

    /*
      We noemen de match alleen veilig als:

      - er motor/trim-informatie beschikbaar is
      - en de score voldoende hoog is

      Zonder motorinformatie tonen we geen olieadvies.
    */

    const safeMatch =
      best.hasEngineInfo &&
      best.score >= 70

    if (!safeMatch) {
      return NextResponse.json({
        vehicle: best.vehicle,
        safeMatch: false,
        matchScore: best.score,
        matchReasons:
          best.reasons,
        rdw,
        candidates:
          rankedVehicles.map(
            (item) => ({
              id:
                item.vehicle.id,
              year:
                item.vehicle.year,
              make:
                item.vehicle.make,
              model:
                item.vehicle.model,
              trim:
                item.vehicle.trim,
              engine:
                item.vehicle.engine,
              score:
                item.score,
              reasons:
                item.reasons
            })
          ),
        warning:
          'Vehicle Finder heeft onvoldoende motorgegevens om deze motorvariant veilig automatisch te bevestigen.'
      })
    }

    const oilUrl =
      `${API_BASE}/vehicles/` +
      `${encodeURIComponent(
        best.vehicle.id
      )}/oil-change`

    const oilResponse =
      await fetch(oilUrl, {
        headers: {
          'X-API-Key': apiKey
        },
        cache: 'no-store'
      })

    const oilData =
      await oilResponse.json()

    if (!oilResponse.ok) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder oil-change gaf een fout.',
          vehicle:
            best.vehicle,
          details:
            oilData
        },
        {
          status:
            oilResponse.status
        }
      )
    }

    return NextResponse.json({
      vehicle:
        best.vehicle,
      safeMatch: true,
      matchScore:
        best.score,
      matchReasons:
        best.reasons,
      rdw,
      oil:
        oilData?.data ||
        oilData
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
      { status: 502 }
    )
  }
}
