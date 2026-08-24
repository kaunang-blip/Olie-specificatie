import { NextResponse } from 'next/server'
import { resolveOil } from '../../lib/oilResolver'

function normalizePlate(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export async function GET(request) {
  try {
    const kenteken =
      normalizePlate(
        request.nextUrl
          .searchParams
          .get('kenteken') ||
          ''
      )

    if (
      !kenteken ||
      kenteken.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            'Ongeldig kenteken.'
        },
        {
          status: 400
        }
      )
    }

    /*
      We gebruiken onze bestaande
      RDW-route.

      Hierdoor blijft alle RDW-logica
      op één plek staan.
    */

    const rdwUrl =
      `${request.nextUrl.origin}` +
      `/api/rdw?kenteken=` +
      encodeURIComponent(
        kenteken
      )

    const rdwResponse =
      await fetch(
        rdwUrl,
        {
          cache: 'no-store'
        }
      )

    const vehicle =
      await rdwResponse.json()

    if (!rdwResponse.ok) {
      return NextResponse.json(
        {
          error:
            vehicle.error ||
            'Voertuig niet gevonden.'
        },
        {
          status:
            rdwResponse.status
        }
      )
    }

    /*
      Eén centrale resolver bepaalt
      vanaf hier waar de oliegegevens
      vandaan komen.
    */

    const result =
      await resolveOil(
        vehicle
      )

    return NextResponse.json({
      kenteken,

      ...result
    })
  } catch (error) {
    console.error(
      'Oil API failed:',
      error
    )

    return NextResponse.json(
      {
        error:
          'De oliezoeker kon tijdelijk niet worden uitgevoerd.'
      },
      {
        status: 502
      }
    )
  }
}
