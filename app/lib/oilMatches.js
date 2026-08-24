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

function includesAnyText(value, wantedValues = []) {
  if (!Array.isArray(wantedValues)) {
    return false
  }

  return wantedValues.some((wanted) =>
    includesText(value, wanted)
  )
}

function getVehicleYear(vehicle) {
  const date = vehicle?.datumEersteToelating

  if (!date) return null

  const parts = String(date).split('-')

  if (parts.length !== 3) {
    return null
  }

  const year = Number(parts[2])

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

  return Math.abs(a - e) <= tolerance
}

/*
  ============================================
  DPF / ROETFILTER
  ============================================
*/

function parseDpfValue(value) {
  if (value === true || value === 1) {
    return true
  }

  if (value === false || value === 0) {
    return false
  }

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const text = normalize(value)

  const negativeValues = [
    'NEE',
    'NO',
    'FALSE',
    'NIET AANWEZIG',
    'ZONDER ROETFILTER',
    'ZONDER DPF'
  ]

  const positiveValues = [
    'JA',
    'YES',
    'TRUE',
    'AANWEZIG',
    'MET ROETFILTER',
    'MET DPF',
    'DPF',
    'ROETFILTER'
  ]

  if (
    negativeValues.some(
      (item) =>
        text === item ||
        text.includes(item)
    )
  ) {
    return false
  }

  if (
    positiveValues.some(
      (item) =>
        text === item ||
        text.includes(item)
    )
  ) {
    return true
  }

  return null
}

export function detectDpfStatus(vehicle) {
  if (!vehicle) {
    return null
  }

  const possibleFields = [
    vehicle.dpf,
    vehicle.hasDpf,
    vehicle.roetfilter,
    vehicle.partikelfilter,
    vehicle.deeltjesfilter,
    vehicle.dieselParticulateFilter,
    vehicle.diesel_particulate_filter
  ]

  for (const value of possibleFields) {
    const result = parseDpfValue(value)

    if (result !== null) {
      return result
    }
  }

  return null
}

/*
  ============================================
  MOTOR- EN OLIEDATABASE
  ============================================

  Vanaf nu voegen we nieuwe motoren alleen
  hier toe.

  De code onder deze database hoeft niet
  opnieuw aangepast te worden.
*/

export const oilMatches = [

  /*
    ============================================
    AUDI A4
    1.8 TFSI
    CDHA
    1798 cc
    88 kW / 120 pk
    ============================================
  */

  {
    id: 'audi-a4-18tfsi-cdha-88kw',

    vehicle: {
      merk: 'AUDI',

      modelContainsAny: [
        'A4'
      ],

      brandstofContains: 'BENZINE',

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

      alternatieveViscositeiten: [
        '5W-40'
      ],

      oemSpecificatie: 'VW 502 00',

      inhoudMetFilter: null,

      requiresDpfCheck: false,

      shell: {
        product:
          'Shell Helix Ultra 5W-30',

        viscositeit: '5W-30',

        specificatie:
          'VW 502 00 / VW 505 00',

        status: 'matched'
      },

      ok: {
        product:
          'Nog niet bevestigd',

        viscositeit: null,

        specificatie:
          'VW 502 00',

        status: 'pending'
      },

      mpm: {
        product:
          'MPM Motor Oil 5W-30 Premium Synthetic BMW / MB',

        viscositeit: '5W-30',

        specificatie:
          'VW 502 00 / VW 505 00',

        status: 'matched'
      }
    }
  },

  /*
    ============================================
    RENAULT TRAFIC
    2.0 dCi
    M9R
    1995 cc
    84 kW / 114 pk
    ============================================
  */

  {
    id: 'renault-trafic-20dci-m9r-84kw',

    vehicle: {
      merk: 'RENAULT',

      modelContainsAny: [
        'TRAFIC'
      ],

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
      acea: null,

      inhoudMetFilter: null,

      requiresDpfCheck: true,

      variants: {
        withDpf: {
          viscositeit: '5W-30',

          oemSpecificatie:
            'Renault RN0720',

          acea: 'ACEA C4'
        },

        withoutDpf: {
          viscositeit: '5W-40',

          oemSpecificatie:
            'Renault RN0710',

          acea: 'ACEA A3/B4'
        }
      }
    }
  },

  /*
    ============================================
    OPEL KARL / VIVA
    1.0
    B10XE
    999 cc
    55 kW / 75 pk
    ============================================

    Opel handleiding:
    Europees onderhoud:
    dexos2

    Viscositeit bij temperaturen tot -25°C:
    5W-30 of 5W-40

    Olie-inhoud inclusief filter:
    4,0 liter
  */

  {
    id: 'opel-karl-viva-10-b10xe-55kw',

    vehicle: {
      merk: 'OPEL',

      modelContainsAny: [
        'KARL',
        'VIVA'
      ],

      brandstofContains: 'BENZINE',

      yearFrom: 2015,
      yearTo: 2019,

      cilinderinhoud: 999,
      cilinderinhoudTolerance: 10,

      vermogenKw: 55,
      vermogenTolerance: 2
    },

    engine: {
      naam: '1.0',
      motorcode: 'B10XE',

      vermogenKw: 55,
      vermogenPk: 75
    },

    oil: {
      /*
        Zowel 5W-30 als 5W-40 is volgens
        Opel toegestaan bij temperaturen
        tot -25°C.

        We gebruiken 5W-30 als primaire
        productzoekwaarde.
      */

      viscositeit: '5W-30',

      alternatieveViscositeiten: [
        '5W-40'
      ],

      oemSpecificatie:
        'GM DEXOS2',

      acea:
        'ACEA C3',

      inhoudMetFilter:
        4.0,

      requiresDpfCheck:
        false
    }
  }
]

/*
  ============================================
  MATCH SCORE
  ============================================
*/

function calculateMatchScore(
  vehicle,
  item
) {
  const rules = item.vehicle

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

    Ondersteunt nu meerdere benamingen,
    bijvoorbeeld:

    KARL
    VIVA
  */

  if (
    Array.isArray(
      rules.modelContainsAny
    ) &&
    rules.modelContainsAny.length > 0
  ) {
    if (
      !includesAnyText(
        vehicle.handelsbenaming,
        rules.modelContainsAny
      )
    ) {
      return null
    }

    score += 30
    reasons.push('model')
  }

  /*
    Oude modelContains blijft ook werken
    voor toekomstige backwards compatibility.
  */

  if (
    rules.modelContains &&
    !rules.modelContainsAny
  ) {
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

  if (
    rules.vermogenKw
  ) {
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

/*
  ============================================
  DPF VARIANT OPLOSSEN
  ============================================
*/

function resolveOilVariant(
  item,
  vehicle
) {
  if (!item?.oil) {
    return item
  }

  if (
    !item.oil.requiresDpfCheck
  ) {
    return item
  }

  const dpf =
    detectDpfStatus(vehicle)

  /*
    DPF onbekend:
    nog geen definitieve olie kiezen.
  */

  if (dpf === null) {
    return {
      ...item,

      oil: {
        ...item.oil,

        viscositeit: null,
        oemSpecificatie: null,
        acea: null,

        dpfStatus: 'unknown'
      }
    }
  }

  /*
    MET DPF
  */

  if (dpf === true) {
    const variant =
      item.oil.variants?.withDpf

    return {
      ...item,

      oil: {
        ...item.oil,

        viscositeit:
          variant?.viscositeit ||
          null,

        oemSpecificatie:
          variant?.oemSpecificatie ||
          null,

        acea:
          variant?.acea ||
          null,

        dpfStatus:
          'with-dpf'
      }
    }
  }

  /*
    ZONDER DPF
  */

  const variant =
    item.oil.variants?.withoutDpf

  return {
    ...item,

    oil: {
      ...item.oil,

      viscositeit:
        variant?.viscositeit ||
        null,

      oemSpecificatie:
        variant?.oemSpecificatie ||
        null,

      acea:
        variant?.acea ||
        null,

      dpfStatus:
        'without-dpf'
    }
  }
}

/*
  ============================================
  HOOFDFUNCTIE
  ============================================
*/

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

    Een combinatie van bijvoorbeeld:

    merk
    model
    brandstof
    bouwjaar
    cilinderinhoud
    vermogen

    geeft een hoge score.

    Alleen merk + model is onvoldoende.
  */

  if (best.score < 120) {
    return null
  }

  const resolvedItem =
    resolveOilVariant(
      best.item,
      vehicle
    )

  return {
    ...resolvedItem,

    matchInfo: {
      score:
        best.score,

      reasons:
        best.reasons
    }
  }
}
