function normalize(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function includesText(value, wanted) {
  return normalize(value).includes(
    normalize(wanted)
  )
}

function numberClose(
  actual,
  expected,
  tolerance = 2
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

function getYear(vehicle) {
  const date =
    vehicle?.datumEersteToelating

  if (!date) {
    return null
  }

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

/*
  =========================================
  MOTORFAMILIES
  =========================================

  Deze regels bepalen alleen de motor.

  Olie wordt later door oilResolver.js
  bepaald.
*/

const engineRules = [

  /*
    PEUGEOT / CITROEN / DS
    1.2 benzine
    EB2 / PureTech 82
    1199 cc
    60 kW
  */

  {
    id: 'psa-eb2-12-60kw',

    manufacturers: [
      'PEUGEOT',
      'CITROEN',
      'CITROËN',
      'DS'
    ],

    displacement: 1199,
    displacementTolerance: 5,

    powerKw: 60,
    powerTolerance: 2,

    fuel: 'BENZINE',

    yearFrom: 2012,
    yearTo: 2020,

    result: {
      family: 'EB2',
      code: null,
      name: '1.2 PureTech 82',

      displacement: 1199,

      powerKw: 60,
      powerPk: 82
    }
  },

  /*
    OPEL KARL / VIVA
    1.0 B10XE
  */

  {
    id: 'opel-b10xe',

    manufacturers: [
      'OPEL'
    ],

    models: [
      'KARL',
      'VIVA'
    ],

    displacement: 999,
    displacementTolerance: 5,

    powerKw: 55,
    powerTolerance: 2,

    fuel: 'BENZINE',

    yearFrom: 2015,
    yearTo: 2019,

    result: {
      family: 'B10XE',
      code: 'B10XE',
      name: '1.0',

      displacement: 999,

      powerKw: 55,
      powerPk: 75
    }
  },

  /*
    RENAULT TRAFIC
    2.0 dCi M9R
  */

  {
    id: 'renault-m9r-84kw',

    manufacturers: [
      'RENAULT'
    ],

    models: [
      'TRAFIC'
    ],

    displacement: 1995,
    displacementTolerance: 10,

    powerKw: 84,
    powerTolerance: 2,

    fuel: 'DIESEL',

    yearFrom: 2006,
    yearTo: 2014,

    result: {
      family: 'M9R',
      code: 'M9R',
      name: '2.0 dCi',

      displacement: 1995,

      powerKw: 84,
      powerPk: 114
    }
  },

  /*
    AUDI A4
    1.8 TFSI CDHA
  */

  {
    id: 'audi-cdha-88kw',

    manufacturers: [
      'AUDI'
    ],

    models: [
      'A4'
    ],

    displacement: 1798,
    displacementTolerance: 10,

    powerKw: 88,
    powerTolerance: 2,

    fuel: 'BENZINE',

    yearFrom: 2008,
    yearTo: 2015,

    result: {
      family: 'EA888',
      code: 'CDHA',
      name: '1.8 TFSI',

      displacement: 1798,

      powerKw: 88,
      powerPk: 120
    }
  }
]

function manufacturerMatches(
  vehicle,
  rule
) {
  if (
    !Array.isArray(
      rule.manufacturers
    ) ||
    rule.manufacturers.length === 0
  ) {
    return true
  }

  const actual =
    normalize(vehicle.merk)

  return rule.manufacturers.some(
    (manufacturer) =>
      actual ===
      normalize(manufacturer)
  )
}

function modelMatches(
  vehicle,
  rule
) {
  if (
    !Array.isArray(rule.models) ||
    rule.models.length === 0
  ) {
    return true
  }

  const model =
    vehicle.handelsbenaming || ''

  return rule.models.some(
    (wanted) =>
      includesText(
        model,
        wanted
      )
  )
}

function fuelMatches(
  vehicle,
  rule
) {
  if (!rule.fuel) {
    return true
  }

  return includesText(
    vehicle.brandstof,
    rule.fuel
  )
}

function yearMatches(
  vehicle,
  rule
) {
  if (
    !rule.yearFrom &&
    !rule.yearTo
  ) {
    return true
  }

  const year =
    getYear(vehicle)

  if (!year) {
    return false
  }

  if (
    rule.yearFrom &&
    year < rule.yearFrom
  ) {
    return false
  }

  if (
    rule.yearTo &&
    year > rule.yearTo
  ) {
    return false
  }

  return true
}

function scoreRule(
  vehicle,
  rule
) {
  let score = 0
  const reasons = []

  /*
    MERK
  */

  if (
    !manufacturerMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  score += 25
  reasons.push('merk')

  /*
    MODEL
  */

  if (
    !modelMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (
    Array.isArray(rule.models) &&
    rule.models.length > 0
  ) {
    score += 20
    reasons.push('model')
  }

  /*
    BRANDSTOF
  */

  if (
    !fuelMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (rule.fuel) {
    score += 15
    reasons.push('brandstof')
  }

  /*
    BOUWJAAR
  */

  if (
    !yearMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (
    rule.yearFrom ||
    rule.yearTo
  ) {
    score += 10
    reasons.push('bouwjaar')
  }

  /*
    CILINDERINHOUD
  */

  if (rule.displacement) {
    if (
      !numberClose(
        vehicle.cilinderinhoud,
        rule.displacement,
        rule.displacementTolerance ??
          20
      )
    ) {
      return null
    }

    score += 35
    reasons.push(
      'cilinderinhoud'
    )
  }

  /*
    VERMOGEN
  */

  if (rule.powerKw) {
    if (
      !numberClose(
        vehicle.vermogenKw,
        rule.powerKw,
        rule.powerTolerance ??
          3
      )
    ) {
      return null
    }

    score += 45
    reasons.push('vermogen')
  }

  return {
    score,
    reasons
  }
}

/*
  =========================================
  BELANGRIJK:
  DIT IS DE EXPORT DIE VERCEL MIST
  =========================================
*/

export function resolveEngine(
  vehicle
) {
  if (!vehicle) {
    return {
      found: false,

      confidence:
        'unknown',

      engine:
        null
    }
  }

  const candidates =
    engineRules
      .map((rule) => {
        const result =
          scoreRule(
            vehicle,
            rule
          )

        if (!result) {
          return null
        }

        return {
          rule,

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
    return {
      found: false,

      confidence:
        'unknown',

      engine:
        null,

      vehicleIdentifiers: {
        merk:
          vehicle.merk ||
          null,

        model:
          vehicle.handelsbenaming ||
          null,

        type:
          vehicle.type ||
          null,

        variant:
          vehicle.variant ||
          null,

        uitvoering:
          vehicle.uitvoering ||
          null,

        typegoedkeuringsnummer:
          vehicle.typegoedkeuringsnummer ||
          null,

        cilinderinhoud:
          vehicle.cilinderinhoud ??
          null,

        vermogenKw:
          vehicle.vermogenKw ??
          null
      }
    }
  }

  const best =
    candidates[0]

  let confidence =
    'medium'

  if (best.score >= 120) {
    confidence =
      'high'
  }

  return {
    found: true,

    confidence,

    engine: {
      ...best.rule.result
    },

    match: {
      ruleId:
        best.rule.id,

      score:
        best.score,

      reasons:
        best.reasons
    }
  }
}
