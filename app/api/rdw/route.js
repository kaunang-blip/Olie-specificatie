import { NextResponse } from 'next/server'

const VEHICLE_ENDPOINT =
  'https://opendata.rdw.nl/resource/m9d7-ebf2.json'

const FUEL_ENDPOINT =
  'https://opendata.rdw.nl/resource/8ys7-d773.json'

function normalizePlate(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function formatDate(value) {
  if (!value) return null

  const str = String(value)

  if (str.length !== 8) {
    return null
  }

  return `${str.slice(6, 8)}-${str.slice(4, 6)}-${str.slice(0, 4)}`
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const number = Number(
    String(value).replace(',', '.')
  )

  return Number.isFinite(number)
    ? number
    : null
}

function firstNonEmpty(values = []) {
  return (
    values.find(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ''
    ) || null
  )
}

function getDieselFuelRow(fuels) {
  if (!Array.isArray(fuels)) {
    return null
  }

  return (
    fuels.find((fuel) =>
      String(
        fuel.brandstof_omschrijving || ''
      )
        .toUpperCase()
        .includes('DIESEL')
    ) || null
  )
}

/*
  RDW geeft geen simpel betrouwbaar
  "DPF = ja/nee" veld terug.

  Daarom gebruiken we bewust:

  true  = alleen wanneer we later echt
          expliciete DPF-info krijgen

  false = alleen wanneer we later echt
          expliciet weten dat er géén DPF is

  null  = onbekend

  We leiden DPF dus NIET automatisch af
  uit alleen emissieklasse of deeltjesuitstoot.
*/

function determineDpfStatus() {
  return null
}

export async function GET(request) {
  try {
    const kentekenRaw =
      request.nextUrl.searchParams.get(
        'kenteken'
      )

    const kenteken =
      normalizePlate(
        kentekenRaw || ''
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

    const vehicleUrl =
      `${VEHICLE_ENDPOINT}` +
      `?kenteken=${encodeURIComponent(kenteken)}` +
      `&%24limit=1`

    const fuelUrl =
      `${FUEL_ENDPOINT}` +
      `?kenteken=${encodeURIComponent(kenteken)}` +
      `&%24limit=10`

    const [
      vehicleResponse,
      fuelResponse
    ] = await Promise.all([
      fetch(vehicleUrl, {
        cache: 'no-store'
      }),

      fetch(fuelUrl, {
        cache: 'no-store'
      })
    ])

    if (!vehicleResponse.ok) {
      return NextResponse.json(
        {
          error:
            `RDW voertuigservice gaf status ${vehicleResponse.status}`
        },
        {
          status: 502
        }
      )
    }

    const vehicles =
      await vehicleResponse.json()

    let fuels = []

    if (fuelResponse.ok) {
      fuels =
        await fuelResponse.json()
    }

    if (
      !Array.isArray(vehicles) ||
      vehicles.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Kenteken niet gevonden bij RDW.'
        },
        {
          status: 404
        }
      )
    }

    const v =
      vehicles[0]

    const brandstof =
      Array.isArray(fuels)
        ? fuels
            .map(
              (fuel) =>
                fuel.brandstof_omschrijving
            )
            .filter(Boolean)
            .join(' / ')
        : ''

    const vermogenKw =
      Array.isArray(fuels)
        ? fuels
            .map((fuel) =>
              toNumber(
                fuel.nettomaximumvermogen
              )
            )
            .find(
              (value) =>
                value !== null &&
                value > 0
            ) || null
        : null

    const diesel =
      getDieselFuelRow(fuels)

    /*
      Emissiegegevens.

      Deze zijn nuttig voor diagnose
      en latere matching, maar vormen
      op zichzelf geen hard DPF-bewijs.
    */

    const emissieklasse =
      firstNonEmpty(
        fuels.map(
          (fuel) =>
            fuel.emissiecode_omschrijving
        )
      )

    const milieuklasseLicht =
      firstNonEmpty(
        fuels.map(
          (fuel) =>
            fuel.milieuklasse_eg_goedkeuring_licht
        )
      )

    const milieuklasseZwaar =
      firstNonEmpty(
        fuels.map(
          (fuel) =>
            fuel.milieuklasse_eg_goedkeuring_zwaar
        )
      )

    const uitstootDeeltjesLicht =
      diesel
        ? toNumber(
            diesel.uitstoot_deeltjes_licht
          )
        : null

    const uitstootDeeltjesZwaar =
      diesel
        ? toNumber(
            diesel.uitstoot_deeltjes_zwaar
          )
        : null

    const dpf =
      determineDpfStatus()

    return NextResponse.json({
      kenteken,

      merk:
        v.merk ||
        'Onbekend',

      handelsbenaming:
        v.handelsbenaming ||
        '',

      type:
        v.type ||
        null,

      voertuigsoort:
        v.voertuigsoort ||
        null,

      inrichting:
        v.inrichting ||
        null,

      datumEersteToelating:
        formatDate(
          v.datum_eerste_toelating
        ),

      cilinderinhoud:
        v.cilinderinhoud
          ? Number(
              v.cilinderinhoud
            )
          : null,

      aantalCilinders:
        v.aantal_cilinders
          ? Number(
              v.aantal_cilinders
            )
          : null,

      variant:
        v.variant ||
        null,

      uitvoering:
        v.uitvoering ||
        null,

      typegoedkeuringsnummer:
        v.typegoedkeuringsnummer ||
        null,

      brandstof:
        brandstof ||
        null,

      vermogenKw,

      /*
        Nieuwe emissievelden
      */

      emissieklasse,

      milieuklasseLicht,

      milieuklasseZwaar,

      uitstootDeeltjesLicht,

      uitstootDeeltjesZwaar,

      /*
        DPF-status blijft bewust null
        zolang we geen expliciete bron
        hebben die hem bevestigt.
      */

      dpf,

      roetfilter:
        dpf,

      /*
        Handig voor debuggen in de app.
      */

      emissieData: {
        emissieklasse,

        milieuklasseLicht,

        milieuklasseZwaar,

        uitstootDeeltjesLicht,

        uitstootDeeltjesZwaar
      }
    })
  } catch (error) {
    console.error(
      'RDW lookup failed:',
      error
    )

    return NextResponse.json(
      {
        error:
          'RDW kon tijdelijk niet worden bereikt. Probeer het opnieuw.'
      },
      {
        status: 502
      }
    )
  }
}
