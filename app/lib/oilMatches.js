function normalize(value = '') {
  return String(value)
    .toUpperCase()
    .trim()
}

function includesText(value, wanted) {
  if (!wanted) return true

  return normalize(value).includes(
    normalize(wanted)
  )
}

function getVehicleYear(vehicle) {
  const date =
    vehicle?.datumEersteToelating

  if (!date) return null

  /*
    RDW geeft bij ons bijvoorbeeld:

    28-05-2011
  */

  const parts =
    String(date).split('-')

  if (parts.length !== 3) {
    return null
  }

  const year =
    Number(parts[2])

  return Number.isFinite(year)
    ? year
    : null
}

function numberWithinTolerance(
  actual,
  expected,
  tolerance
) {
  const a = Number(actual)
  const e = Number(expected)

  if (
    !Number.isFinite(a) ||
    !Number.isFinite(e)
  ) {
    return false
  }

  return (
    Math.abs(a - e) <= tolerance
  )
}

/*
  MOTOR- EN OLIEDATABASE

  Elke nieuwe motor komt als één object
  in deze lijst.

  De match-logica zelf hoeft daarna niet
  meer aangepast te worden.
*/

export const oilMatches = [
  {
    id: 'audi-a4-18tfsi-cdha-88kw',

    vehicle: {
      merk: 'AUDI',

      modelContains: 'A4',

      brandstofContains:
        'BENZINE',

      yearFrom: 2008,
      yearTo: 2015,

      cilinderinhoud: 1798,

      cilinderinhoudTolerance: 10,

      vermogenKw: 88,

      vermogenTolerance: 2
    },

    engine: {
      naam: '1.8 TFSI',
      motorcode: 'CDHA',
      vermogenKw: 88,
      vermogenPk: 120
    },

    oil: {
      viscositeit: '5W-30',

      oemSpecificatie:
        'VW 502 00',

      /*
        Deze productvelden blijven voorlopig
        bestaan als fallback.

        De nieuwe oilProducts.js kan vervolgens
        zelf producten zoeken op:

        viscositeit + OEM-specificatie.
      */

      shell: {
        product:
          'Shell Helix Ultra 5W-30',

        viscositeit:
          '5W-30',

        specificatie:
          'VW 502 00 / VW 505 00',

        status:
          'matched'
      },

      ok: {
        product:
          'Nog niet bevestigd',

        viscositeit:
          null,

        specificatie:
          'VW 502 00',

        status:
          'pending'
      },

      mpm: {
        product:
          'MPM Motor Oil 5W-30 Premium Synthetic BMW / MB',

        viscositeit:
          '5W-30',

        specificatie:
          'VW 502 00 / VW 505 00',

        status:
          'matched'

{
  id: 'renault-trafic-20dci-84kw-m9r',

  vehicle: {
    merk: 'RENAULT',
    modelContains: 'TRAFIC',
    brandstofContains: 'DIESEL',

    yearFrom: 2006,
    yearTo: 2014,

    cilinderinhoud: 1995,
    cilinderinhoudTolerance: 10,

    vermogenKw: 84,
    vermogenTolerance: 2
  },

  engine: {
    naam: '2.0 dCi',
    motorcode: 'M9R',
    vermogenKw: 84,
    vermogenPk: 114
  },

  oil: {
    viscositeit: null,
    oemSpecificatie: null,

    requiresDpfCheck: true,

    variants: {
      withDpf: {
        viscositeit: '5W-30',
        oemSpecificatie: 'Renault RN0720',
        acea: 'ACEA C4'
      },

      withoutDpf: {
        viscositeit: '5W-40',
        oemSpecificatie: 'Renault RN0710',
        acea: 'ACEA A3/B4'
      }
    },

    shell: {
      product: 'Nog te bepalen na DPF-controle',
      viscositeit: null,
      specificatie: null,
      status: 'pending'
    },

    ok: {
      product: 'Nog te bepalen na DPF-controle',
      viscositeit: null,
      specificatie: null,
      status: 'pending'
    },

    mpm: {
      product: 'Nog te bepalen na DPF-controle',
      viscositeit: null,
      specificatie: null,
      status: 'pending'
    }
  }
},        
      }
    }
  }
]

function calculateMatchScore(
  vehicle,
  item
) {
  const rules =
    item.vehicle

  let score = 0
  const reasons = []

  /*
    MERK
  */

  if (rules.merk) {
    if (
      normalize(vehicle.merk) !==
      normalize(rules.merk)
    ) {
      return null
    }

    score += 30
    reasons.push('merk')
  }

  /*
    MODEL
  */

  if (rules.modelContains) {
    if (
      !includesText(
        vehicle.handelsbenaming,
        rules.modelContains
      )
    ) {
      return null
    }

    score += 30
    reasons.push('model')
  }

  /*
    BRANDSTOF
  */

  if (
    rules.brandstofContains
  ) {
    if (
      !includesText(
        vehicle.brandstof,
        rules.brandstofContains
      )
    ) {
      return null
    }

    score += 20
    reasons.push('brandstof')
  }

  /*
    BOUWJAAR
  */

  const year =
    getVehicleYear(vehicle)

  if (
    rules.yearFrom ||
    rules.yearTo
  ) {
    if (!year) {
      return null
    }

    if (
      rules.yearFrom &&
      year < rules.yearFrom
    ) {
      return null
    }

    if (
      rules.yearTo &&
      year > rules.yearTo
    ) {
      return null
    }

    score += 20
    reasons.push('bouwjaar')
  }

  /*
    CILINDERINHOUD
  */

  if (
    rules.cilinderinhoud
  ) {
    const tolerance =
      rules.cilinderinhoudTolerance ??
      20

    if (
      !numberWithinTolerance(
        vehicle.cilinderinhoud,
        rules.cilinderinhoud,
        tolerance
      )
    ) {
      return null
    }

    score += 40
    reasons.push(
      'cilinderinhoud'
    )
  }

  /*
    VERMOGEN
  */

  if (rules.vermogenKw) {
    const tolerance =
      rules.vermogenTolerance ??
      3

    if (
      !numberWithinTolerance(
        vehicle.vermogenKw,
        rules.vermogenKw,
        tolerance
      )
    ) {
      return null
    }

    score += 50
    reasons.push('vermogen')
  }

  return {
    score,
    reasons
  }
}

export function findOilMatch(
  vehicle
) {
  if (!vehicle) {
    return null
  }

  const candidates =
    oilMatches
      .map((item) => {
        const result =
          calculateMatchScore(
            vehicle,
            item
          )

        if (!result) {
          return null
        }

        return {
          item,
          score:
            result.score,

          reasons:
            result.reasons
        }
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score - a.score
      )

  if (
    candidates.length === 0
  ) {
    return null
  }

  const best =
    candidates[0]

  /*
    Veiligheidsgrens.

    We willen niet alleen op merk +
    model een olieadvies geven.

    Een goede match moet voldoende
    kenmerken hebben geraakt.
  */

  if (best.score < 120) {
    return null
  }

  return {
    ...best.item,

    matchInfo: {
      score:
        best.score,

      reasons:
        best.reasons
    }
  }
}
