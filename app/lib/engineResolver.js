function normalize(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

function normalizeText(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function includesText(value, wanted) {
  if (!wanted) return true

  return normalizeText(value).includes(
    normalizeText(wanted)
  )
}

function includesAnyText(
  value,
  wantedValues = []
) {
  if (
    !Array.isArray(wantedValues) ||
    wantedValues.length === 0
  ) {
    return true
  }

  return wantedValues.some(
    (wanted) =>
      includesText(
        value,
        wanted
      )
  )
}

function equalsAnyNormalized(
  value,
  wantedValues = []
) {
  if (
    !Array.isArray(wantedValues) ||
    wantedValues.length === 0
  ) {
    return true
  }

  const actual =
    normalize(value)

  return wantedValues.some(
    (wanted) =>
      actual ===
      normalize(wanted)
  )
}

function startsWithAnyNormalized(
  value,
  wantedValues = []
) {
  if (
    !Array.isArray(wantedValues) ||
    wantedValues.length === 0
  ) {
    return true
  }

  const actual =
    normalize(value)

  return wantedValues.some(
    (wanted) =>
      actual.startsWith(
        normalize(wanted)
      )
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

  return (
    Math.abs(a - e) <= tolerance
  )
}

function getVehicleYear(vehicle) {
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
  ==================================================
  MOTORREGELS
  ==================================================

  Een regel kan nu gebruikmaken van:

  manufacturers
  models

  type
  variant
  uitvoering
  typegoedkeuringsnummer

  cilinderinhoud
  vermogen
  brandstof
  bouwjaar

  Velden die niet zijn ingevuld,
  worden niet verplicht.
*/

const engineRules = [

  /*
    ==================================================
    PSA EB2
    Peugeot / Citroën / DS
    1.2 PureTech 82
    1199 cc
    60 kW
    ==================================================
  */

  {
    id:
      'psa-eb2-12-60kw',

    manufacturers: [
      'PEUGEOT',
      'CITROEN',
      'CITROËN',
      'DS'
    ],

    /*
      Deze motorfamilie kwam in meerdere
      modellen voor, dus model is bewust
      niet verplicht.
    */

    displacement:
      1199,

    displacementTolerance:
      5,

    powerKw:
      60,

    powerTolerance:
      2,

    fuel:
      'BENZINE',

    yearFrom:
      2012,

    yearTo:
      2020,

    result: {
      family:
        'EB2',

      code:
        null,

      name:
        '1.2 PureTech 82',

      displacement:
        1199,

      powerKw:
        60,

      powerPk:
        82
    }
  },

  /*
    ==================================================
    OPEL B10XE
    Karl / Viva
    ==================================================
  */

  {
    id:
      'opel-b10xe',

    manufacturers: [
      'OPEL'
    ],

    models: [
      'KARL',
      'VIVA'
    ],

    displacement:
      999,

    displacementTolerance:
      5,

    powerKw:
      55,

    powerTolerance:
      2,

    fuel:
      'BENZINE',

    yearFrom:
      2015,

    yearTo:
      2019,

    result: {
      family:
        'B10XE',

      code:
        'B10XE',

      name:
        '1.0',

      displacement:
        999,

      powerKw:
        55,

      powerPk:
        75
    }
  },

  /*
    ==================================================
    RENAULT M9R
    Trafic 2.0 dCi
    ==================================================
  */

  {
    id:
      'renault-m9r-84kw',

    manufacturers: [
      'RENAULT'
    ],

    models: [
      'TRAFIC'
    ],

    displacement:
      1995,

    displacementTolerance:
      10,

    powerKw:
      84,

    powerTolerance:
      2,

    fuel:
      'DIESEL',

    yearFrom:
      2006,

    yearTo:
      2014,

    result: {
      family:
        'M9R',

      code:
        'M9R',

      name:
        '2.0 dCi',

      displacement:
        1995,

      powerKw:
        84,

      powerPk:
        114
    }
  },

  /*
    ==================================================
    AUDI CDHA
    A4 1.8 TFSI
    ==================================================
  */

  {
    id:
      'audi-cdha-88kw',

    manufacturers: [
      'AUDI'
    ],

    models: [
      'A4'
    ],

    displacement:
      1798,

    displacementTolerance:
      10,

    powerKw:
      88,

    powerTolerance:
      2,

    fuel:
      'BENZINE',

    yearFrom:
      2008,

    yearTo:
      2015,

    result: {
      family:
        'EA888',

      code:
        'CDHA',

      name:
        '1.8 TFSI',

      displacement:
        1798,

      powerKw:
        88,

      powerPk:
        120
    }
  }
]

/*
  ==================================================
  MATCHFUNCTIES
  ==================================================
*/

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

  return equalsAnyNormalized(
    vehicle.merk,
    rule.manufacturers
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

  return includesAnyText(
    vehicle.handelsbenaming,
    rule.models
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
    getVehicleYear(vehicle)

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

function typeMatches(
  vehicle,
  rule
) {
  if (
    !Array.isArray(rule.types) ||
    rule.types.length === 0
  ) {
    return true
  }

  return equalsAnyNormalized(
    vehicle.type,
    rule.types
  )
}

function variantMatches(
  vehicle,
  rule
) {
  if (
    !Array.isArray(rule.variants) ||
    rule.variants.length === 0
  ) {
    return true
  }

  return startsWithAnyNormalized(
    vehicle.variant,
    rule.variants
  )
}

function uitvoeringMatches(
  vehicle,
  rule
) {
  if (
    !Array.isArray(
      rule.uitvoeringen
    ) ||
    rule.uitvoeringen.length === 0
  ) {
    return true
  }

  return startsWithAnyNormalized(
    vehicle.uitvoering,
    rule.uitvoeringen
  )
}

function typegoedkeuringMatches(
  vehicle,
  rule
) {
  if (
    !Array.isArray(
      rule.typegoedkeuringPrefixes
    ) ||
    rule.typegoedkeuringPrefixes
      .length === 0
  ) {
    return true
  }

  return startsWithAnyNormalized(
    vehicle.typegoedkeuringsnummer,
    rule.typegoedkeuringPrefixes
  )
}

/*
  ==================================================
  SCORE
  ==================================================
*/

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

  if (
    Array.isArray(
      rule.manufacturers
    ) &&
    rule.manufacturers.length > 0
  ) {
    score += 25
    reasons.push('merk')
  }

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
    TYPE
  */

  if (
    !typeMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (
    Array.isArray(rule.types) &&
    rule.types.length > 0
  ) {
    score += 20
    reasons.push('type')
  }

  /*
    VARIANT
  */

  if (
    !variantMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (
    Array.isArray(
      rule.variants
    ) &&
    rule.variants.length > 0
  ) {
    score += 30
    reasons.push('variant')
  }

  /*
    UITVOERING
  */

  if (
    !uitvoeringMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (
    Array.isArray(
      rule.uitvoeringen
    ) &&
    rule.uitvoeringen.length > 0
  ) {
    score += 25
    reasons.push('uitvoering')
  }

  /*
    TYPEGOEDKEURING
  */

  if (
    !typegoedkeuringMatches(
      vehicle,
      rule
    )
  ) {
    return null
  }

  if (
    Array.isArray(
      rule.typegoedkeuringPrefixes
    ) &&
    rule.typegoedkeuringPrefixes
      .length > 0
  ) {
    score += 35

    reasons.push(
      'typegoedkeuring'
    )
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

  if (
    rule.displacement
  ) {
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

  if (
    rule.powerKw
  ) {
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
  HOOFDRESOLVER
  ==================================================
*/

export function resolveEngine(
  vehicle
) {
  if (!vehicle) {
    return {
      found: false,

      confidence:
        'unknown',

      engine: null
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

      engine: null,

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
          null,

        brandstof:
          vehicle.brandstof ||
          null,

        datumEersteToelating:
          vehicle.datumEersteToelating ||
          null
      }
    }
  }

  const best =
    candidates[0]

  /*
    Controle op twijfelachtige dubbele
    matches.

    Als nummer 1 en nummer 2 bijna even
    hoog scoren maar verschillende
    motorfamilies zijn, geven we geen
    high-confidence resultaat.
  */

  const second =
    candidates[1] ||
    null

  let ambiguous =
    false

  if (
    second &&
    Math.abs(
      best.score -
      second.score
    ) <= 10 &&
    normalize(
      best.rule.result?.family
    ) !==
      normalize(
        second.rule.result?.family
      )
  ) {
    ambiguous =
      true
  }

  let confidence =
    'medium'

  if (
    best.score >= 120 &&
    !ambiguous
  ) {
    confidence =
      'high'
  }

  if (ambiguous) {
    confidence =
      'low'
  }

  return {
    found: true,

    confidence,

    ambiguous,

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
    },

    alternatives:
      candidates
        .slice(1, 4)
        .map(
          (candidate) => ({
            ruleId:
              candidate.rule.id,

            score:
              candidate.score,

            family:
              candidate.rule
                .result?.family ||
              null,

            code:
              candidate.rule
                .result?.code ||
              null,

            name:
              candidate.rule
                .result?.name ||
              null
          })
        )
  }
}
