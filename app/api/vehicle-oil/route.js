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

function getNumberList(value) {
  if (!value) return []

  const matches = String(value).match(/\d+(?:[.,]\d+)?/g)

  if (!matches) return []

  return matches
    .map((item) =>
      Number(item.replace(',', '.'))
    )
    .filter(Number.isFinite)
}

function scoreVehicle(vehicle, wanted) {
  let score = 0
  const reasons = []

  const make =
    clean(vehicle?.make).toLowerCase()

  const model =
    clean(vehicle?.model).toLowerCase()

  const trim =
    clean(vehicle?.trim).toLowerCase()

  const engine =
    clean(vehicle?.engine).toLowerCase()

  const wantedMake =
    clean(wanted.make).toLowerCase()

  const wantedModel =
    clean(wanted.model).toLowerCase()

  if (make === wantedMake) {
    score += 40
    reasons.push('merk')
  }

  if (model === wantedModel) {
    score += 40
    reasons.push('model exact')
  } else if (
    model.includes(wantedModel) ||
    wantedModel.includes(model)
  ) {
    score += 25
    reasons.push('model gedeeltelijk')
  }

  if (
    Number(vehicle?.year) ===
    Number(wanted.year)
  ) {
    score += 20
    reasons.push('bouwjaar')
  }

  const combined =
    `${engine} ${trim}`.trim()

  const numbers =
    getNumberList(combined)

  if (
    Number.isFinite(wanted.cilinderinhoud) &&
    wanted.cilinderinhoud > 0
  ) {
    const liters =
      wanted.cilinderinhoud / 1000

    const found =
      numbers.some((number) => {
        return (
          Math.abs(number - liters) < 0.08 ||
          Math.abs(
            number -
              wanted.cilinderinhoud
          ) < 40
        )
      })

    if (found) {
      score += 30
      reasons.push('cilinderinhoud')
    }
  }

  if (
    Number.isFinite(wanted.vermogenKw) &&
    wanted.vermogenKw > 0
  ) {
    const pk =
      Math.round(
        wanted.vermogenKw * 1.35962
      )

    const found =
      numbers.some((number) => {
        return (
          Math.abs(
            number -
              wanted.vermogenKw
          ) <= 3 ||
          Math.abs(
            number - pk
          ) <= 4
        )
      })

    if (found) {
      score += 30
      reasons.push('vermogen')
    }
  }

  if (engine || trim) {
    score += 10
    reasons.push('motorinfo')
  }

  return {
    score,
    reasons
  }
}

async function searchVehicles({
  apiKey,
  year,
  make,
  model
}) {
  const attempts = [
    {
      name: 'year-make-model',
      url:
        `${API_BASE}/vehicles` +
        `?year=${encodeURIComponent(year)}` +
        `&make=${encodeURIComponent(make)}` +
        `&model=${encodeURIComponent(model)}`
    },

    {
      name: 'make-model',
      url:
        `${API_BASE}/vehicles` +
        `?make=${encodeURIComponent(make)}` +
        `&model=${encodeURIComponent(model)}`
    },

    {
      name: 'year-make',
      url:
        `${API_BASE}/vehicles` +
        `?year=${encodeURIComponent(year)}` +
        `&make=${encodeURIComponent(make)}`
    },

    {
      name: 'make',
      url:
        `${API_BASE}/vehicles` +
        `?make=${encodeURIComponent(make)}`
    }
  ]

  const allVehicles = []
  const attemptResults = []

  for (const attempt of attempts) {
    const result =
      await vfFetch(
        attempt.url,
        apiKey
      )

    const vehicles =
      result.ok
        ? getVehicles(result.data)
        : []

    attemptResults.push({
      attempt: attempt.name,
      status: result.status,
      count: vehicles.length
    })

    for (const vehicle of vehicles) {
      if (
        vehicle?.id &&
        !allVehicles.some(
          (item) =>
            String(item.id) ===
            String(vehicle.id)
        )
      ) {
        allVehicles.push(vehicle)
      }
    }

    /*
      Als de exacte zoekactie al bruikbare
      resultaten geeft, hoeven we niet altijd
      alle bredere zoekacties te gebruiken.
    */
    if (
      attempt.name === 'year-make-model' &&
      vehicles.length > 1
    ) {
      break
    }
  }

  return {
    vehicles: allVehicles,
    attempts: attemptResults
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

    const year = clean(
      request.nextUrl.searchParams.get(
        'year'
      )
    )

    const make = clean(
      request.nextUrl.searchParams.get(
        'make'
      )
    )

    const model = clean(
      request.nextUrl.searchParams.get(
        'model'
      )
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

    const searchResult =
      await searchVehicles({
        apiKey,
        year,
        make,
        model
      })

    const vehicles =
      searchResult.vehicles

    if (!vehicles.length) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder kon geen passend voertuig vinden.',
          search: {
            year,
            make,
            model
          },
          attempts:
            searchResult.attempts
        },
        { status: 404 }
      )
    }

    const wanted = {
      year,
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

    const ranked =
      vehicles
        .map((vehicle) => {
          const result =
            scoreVehicle(
              vehicle,
              wanted
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
      ranked[0]

    if (!best?.vehicle?.id) {
      return NextResponse.json(
        {
          error:
            'Geen bruikbare vehicle_id gevonden.'
        },
        { status: 502 }
      )
    }

    /*
      Minimaal merk + model moeten overtuigend
      overeenkomen.
    */
    if (best.score < 65) {
      return NextResponse.json(
        {
          error:
            'Vehicle Finder vond voertuigen, maar geen voldoende betrouwbare modelmatch.',
          bestCandidate:
            best.vehicle,
          score:
            best.score,
          reasons:
            best.reasons,
          attempts:
            searchResult.attempts
        },
        { status: 422 }
      )
    }

    const oilUrl =
      `${API_BASE}/vehicles/` +
      `${encodeURIComponent(
        best.vehicle.id
      )}/oil-change`

    const oilResult =
      await vfFetch(
        oilUrl,
        apiKey
      )

    if (!oilResult.ok) {
      return NextResponse.json(
        {
          error:
            'Voertuig gevonden, maar geen oliegegevens beschikbaar.',
          vehicle:
            best.vehicle,
          score:
            best.score,
          reasons:
            best.reasons,
          attempts:
            searchResult.attempts,
          details:
            oilResult.data
        },
        {
          status:
            oilResult.status ||
            502
        }
      )
    }

    return NextResponse.json({
      vehicle:
        best.vehicle,

      oil:
        oilResult.data?.data ||
        oilResult.data,

      match: {
        score:
          best.score,

        reasons:
          best.reasons,

        candidates:
          ranked
            .slice(0, 5)
            .map((item) => ({
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
            })),

        attempts:
          searchResult.attempts
      }
    })
  } catch (error) {
    console.error(
      'Vehicle oil lookup failed:',
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
