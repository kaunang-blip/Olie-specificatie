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
  Probeert ALLEEN expliciete DPF /
  roetfilterinformatie te herkennen.

  We gokken niet op basis van bouwjaar,
  dieseltype of emissieklasse.
*/

function parseDpfValue(value) {
  if (
    value === true ||
    value === 1
  ) {
    return true
  }

  if (
    value === false ||
    value === 0
  ) {
    return false
  }

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const text =
    normalize(value)

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

  const negativeValues = [
    'NEE',
    'NO',
    'FALSE',
    'NIET AANWEZIG',
    'ZONDER ROETFILTER',
    'ZONDER DPF'
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

export function detectDpfStatus(
  vehicle
) {
  if (!vehicle) {
    return null
  }

  /*
    We ondersteunen meerdere mogelijke
    veldnamen zodat de RDW-route later
    eenvoudig uitgebreid kan worden.
  */

  const possibleFields = [
    vehicle.dpf,
    vehicle.hasDpf,
    vehicle.roetfilter,
    vehicle.partikelfilter,
    vehicle.deeltjesfilter,
    vehicle.dieselParticulateFilter,
    vehicle.diesel_particulate_filter
  ]

  for (
    const value of possibleFields
  ) {
    const result =
      parseDpfValue(value)

    if (result !== null) {
      return result
    }
  }

  return null
}

/*
  ==================================================
  MOTOR- EN OLIEDATABASE
  ==================================================

  Nieuwe motoren kunnen later gewoon als
  extra object aan deze array worden toegevoegd.

  De matching onderaan hoeft daarvoor niet
  opnieuw geprogrammeerd te worden.
*/

export const oilMatches = [

  /*
    ==================================================
    AUDI A4
    1.8 TFSI
    1798 cc
    88 kW / 120 pk
    CDHA
    ==================================================
  */

  {
    id:
      'audi-a4-18tfsi-cdha-88kw',

    vehicle: {
      merk:
        'AUDI',

      modelContains:
        'A4',

      brandstofContains:
        'BENZINE',

      yearFrom:
        2008,

      yearTo:
        2015,

      cilinderinhoud:
        1798,

      cilinderinhoudTolerance:
        10,

      vermogenKw:
        88,

      vermogenTolerance:
        2
    },

    engine: {
      naam:
        '1.8 TFSI',

      motorcode:
        'CDHA',

      vermogenKw:
        88,

      vermogenPk:
        120
    },

    oil: {
      viscositeit:
        '5W-30',

      oemSpecificatie:
        'VW 502 00',

      requiresDpfCheck:
        false,

      dpfStatus:
        'not-required',

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
      }
    }
  },

  /*
    ==================================================
    RENAULT TRAFIC
    2.0 dCi
    1995 cc
    84 kW / 114 pk
    M9R
    ==================================================

    Voor deze motor gebruiken we twee
    varianten.

    MET DPF:
    5W-30
    Renault RN0720
    ACEA C4

    ZONDER DPF:
    5W-40
    Renault RN0710
    ACEA A3/B4

    Als de DPF-status onbekend is,
    wordt GEEN definitieve olie gekozen.
  */

  {
    id:
      'renault-trafic-20dci-m9r-84kw',

    vehicle: {
      merk:
        'RENAULT',

      modelContains:
        'TRAFIC',

      brandstofContains:
        'DIESEL',

      yearFrom:
        2006,

      yearTo:
        2014,

      cilinderinhoud:
        1995,

      cilinderinhoudTolerance:
        10,

      vermogenKw:
        84,

      vermogenTolerance:
        2
    },

    engine: {
      naam:
        '2.0 dCi',

      motorcode:
        'M9R',

      vermogenKw:
        84,

      vermogenPk:
        114
    },

    oil: {
      viscositeit:
        null,

      oemSpecificatie:
        null,

      acea:
        null,

      requiresDpfCheck:
        true,

      dpfStatus:
        'unknown',

      variants: {
        withDpf: {
          viscositeit:
            '5W-30',

          oemSpecificatie:
            'Renault RN0720',

          acea:
            'ACEA C4'
        },

        withoutDpf: {
          viscositeit:
            '5W-40',

          oemSpecificatie:
            'Renault RN0710',

          acea:
            'ACEA A3/B4'
        }
      },

      shell: {
        product:
          'Wacht op DPF-controle',

        viscositeit:
          null,

        specificatie:
          null,

        status:
          'pending'
      },

      ok: {
        product:
          'Wacht op DPF-controle',

        viscositeit:
          null,

        specificatie:
          null,

        status:
          'pending'
      },

      mpm: {
        product:
          'Wacht op DPF-controle',

        viscositeit:
          null,

        specificatie:
          null,

        status:
          'pending'
      }
    }
  }
]

/*
  ==================================================
  MATCH SCORE
  ==================================================
*/

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

  if (
    rules.modelContains
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
      rules
        .cilinderinhoudTolerance ??
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
      rules
        .vermogenTolerance ??
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

    reasons.push(
      'vermogen'
    )
  }

  return {
    score,
    reasons
  }
}

/*
  ==================================================
  DPF-AFHANKELIJKE OLIE OPLOSSEN
  ==================================================
*/

function resolveOilVariant(
  item,
  vehicle
) {
  if (
    !item?.oil
  ) {
    return item
  }

  /*
    Geen DPF-afhankelijke motor.
  */

  if (
    !item.oil.requiresDpfCheck
  ) {
    return item
  }

  const dpf =
    detectDpfStatus(vehicle)

  /*
    DPF-status onbekend.

    We laten de motorherkenning staan,
    maar kiezen bewust nog geen
    viscositeit of OEM-specificatie.
  */

  if (dpf === null) {
    return {
      ...item,

      oil: {
        ...item.oil,

        viscositeit:
          null,

        oemSpecificatie:
          null,

        acea:
          null,

        dpfStatus:
          'unknown'
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
  ==================================================
  HOOFDFUNCTIE
  ==================================================
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

    Alleen merk + model is niet genoeg.

    De huidige Audi en Renault scoren
    onder andere op:

    merk
    model
    brandstof
    bouwjaar
    cilinderinhoud
    vermogen
  */

  if (
    best.score < 120
  ) {
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
