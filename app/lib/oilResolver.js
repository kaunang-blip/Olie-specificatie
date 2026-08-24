import { findOilMatch } from './oilMatches'
import { findProductByBrand } from './oilProducts'
import { resolveEngine } from './engineResolver'

const VEHICLE_FINDER_BASE =
  'https://api.vehicle-finder.com/v1'

function clean(value = '') {
  return String(value).trim()
}

function normalizeSpec(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getYear(date) {
  if (!date) return null

  const parts = String(date).split('-')

  if (parts.length !== 3) {
    return null
  }

  return parts[2]
}

function getModel(vehicle) {
  if (!vehicle?.handelsbenaming) {
    return ''
  }

  let model =
    String(vehicle.handelsbenaming).trim()

  if (vehicle.merk) {
    const merk =
      String(vehicle.merk).trim()

    if (
      model
        .toUpperCase()
        .startsWith(
          merk.toUpperCase()
        )
    ) {
      model =
        model
          .slice(merk.length)
          .trim()
    }
  }

  return model
}

async function fetchJson(
  url,
  options = {}
) {
  const response =
    await fetch(url, {
      ...options,
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

/*
  ======================================
  PRODUCTMATCH
  ======================================
*/

function buildProducts(oil) {
  if (
    !oil?.specification ||
    !oil?.viscosity
  ) {
    return {
      shell: null,
      ok: null,
      mpm: null
    }
  }

  const spec =
    normalizeSpec(
      oil.specification
    )

  return {
    shell:
      findProductByBrand({
        oemSpec: spec,
        viscosity:
          oil.viscosity,
        brand: 'Shell'
      }),

    ok:
      findProductByBrand({
        oemSpec: spec,
        viscosity:
          oil.viscosity,
        brand: 'OK Olie'
      }),

    mpm:
      findProductByBrand({
        oemSpec: spec,
        viscosity:
          oil.viscosity,
        brand: 'MPM'
      })
  }
}

/*
  ======================================
  VEHICLE FINDER
  ======================================
*/

async function tryVehicleFinder(
  vehicle
) {
  const apiKey =
    process.env
      .VEHICLE_FINDER_API_KEY

  if (!apiKey) {
    return {
      success: false,
      reason: 'missing-api-key'
    }
  }

  const year =
    getYear(
      vehicle.datumEersteToelating
    )

  const make =
    clean(vehicle.merk)

  const model =
    getModel(vehicle)

  if (
    !year ||
    !make ||
    !model
  ) {
    return {
      success: false,
      reason:
        'insufficient-vehicle-data'
    }
  }

  const vehicleUrl =
    `${VEHICLE_FINDER_BASE}/vehicles` +
    `?year=${encodeURIComponent(year)}` +
    `&make=${encodeURIComponent(make)}` +
    `&model=${encodeURIComponent(model)}`

  const vehicleResult =
    await fetchJson(
      vehicleUrl,
      {
        headers: {
          'X-API-Key':
            apiKey
        }
      }
    )

  if (!vehicleResult.ok) {
    return {
      success: false,
      reason:
        'vehicle-not-found',
      status:
        vehicleResult.status
    }
  }

  const vehicles =
    Array.isArray(
      vehicleResult.data?.data
    )
      ? vehicleResult.data.data
      : []

  if (!vehicles.length) {
    return {
      success: false,
      reason:
        'vehicle-list-empty'
    }
  }

  const found =
    vehicles[0]

  if (!found?.id) {
    return {
      success: false,
      reason:
        'missing-vehicle-id'
    }
  }

  const oilResult =
    await fetchJson(
      `${VEHICLE_FINDER_BASE}/vehicles/${encodeURIComponent(
        found.id
      )}/oil-change`,
      {
        headers: {
          'X-API-Key':
            apiKey
        }
      }
    )

  if (!oilResult.ok) {
    return {
      success: false,
      reason:
        'oil-not-found',
      vehicle: found
    }
  }

  const rawOil =
    oilResult.data?.data ||
    oilResult.data

  const spec =
    rawOil?.oil_spec ||
    null

  if (!spec) {
    return {
      success: false,
      reason:
        'oil-spec-missing',
      vehicle: found
    }
  }

  return {
    success: true,

    source:
      'vehicle-finder',

    confidence:
      found.engine
        ? 'high'
        : 'medium',

    vehicle:
      found,

    engine:
      found.engine ||
      null,

    oil: {
      viscosity:
        spec.viscosity ||
        null,

      specification:
        spec.oem_spec ||
        null,

      oilType:
        spec.oil_type ||
        null,

      capacityWithFilter:
        spec.capacity_with_filter ??
        null,

      capacityWithoutFilter:
        spec.capacity_without_filter ??
        null
    }
  }
}

/*
  ======================================
  BESTAANDE LOKALE DATABASE
  ======================================
*/

function resolveLegacyLocalOil(
  vehicle
) {
  const match =
    findOilMatch(vehicle)

  if (!match) {
    return null
  }

  return {
    source:
      'local-database',

    confidence:
      'high',

    engine: {
      name:
        match.engine?.naam ||
        null,

      code:
        match.engine?.motorcode ||
        null,

      family:
        null,

      powerKw:
        match.engine?.vermogenKw ??
        null,

      powerPk:
        match.engine?.vermogenPk ??
        null
    },

    oil: {
      viscosity:
        match.oil?.viscositeit ||
        null,

      specification:
        match.oil?.oemSpecificatie ||
        null,

      acea:
        match.oil?.acea ||
        null,

      capacityWithFilter:
        match.oil?.inhoudMetFilter ??
        null,

      alternativeViscosities:
        match.oil
          ?.alternatieveViscositeiten ||
        [],

      requiresDpfCheck:
        match.oil
          ?.requiresDpfCheck ===
        true,

      variants:
        match.oil?.variants ||
        null
    }
  }
}

/*
  ======================================
  MOTORFAMILIE -> OLIE
  ======================================
*/

function oilFromEngineFamily(
  engineResult
) {
  if (
    !engineResult?.found ||
    !engineResult.engine
  ) {
    return null
  }

  const family =
    String(
      engineResult.engine.family ||
      ''
    ).toUpperCase()

  /*
    Opel B10XE
  */

  if (family === 'B10XE') {
    return {
      viscosity:
        '5W-30',

      specification:
        'GM DEXOS2',

      acea:
        'ACEA C3',

      capacityWithFilter:
        4.0
    }
  }

  /*
    Audi CDHA
  */

  if (
    family === 'EA888' &&
    engineResult.engine.code ===
      'CDHA'
  ) {
    return {
      viscosity:
        '5W-30',

      specification:
        'VW 502 00'
    }
  }

  /*
    Renault M9R
  */

  if (family === 'M9R') {
    return {
      viscosity: null,
      specification: null,

      requiresDpfCheck:
        true,

      variants: {
        withDpf: {
          viscosity:
            '5W-30',

          specification:
            'Renault RN0720',

          acea:
            'ACEA C4'
        },

        withoutDpf: {
          viscosity:
            '5W-40',

          specification:
            'Renault RN0710',

          acea:
            'ACEA A3/B4'
        }
      }
    }
  }

  /*
    PSA / Peugeot 1.2 EB2

    Motor kan al herkend worden,
    maar we geven nog geen
    oliespecificatie totdat die
    betrouwbaar bevestigd is.
  */

  if (family === 'EB2') {
    return {
      viscosity: null,
      specification: null,

      requiresManufacturerOilData:
        true
    }
  }

  return null
}

/*
  ======================================
  HOOFDRESOLVER
  ======================================
*/

export async function resolveOil(
  vehicle
) {
  if (!vehicle) {
    return {
      success: false,
      source: 'none',
      confidence: 'unknown',
      engine: null,
      oil: null,
      products: null
    }
  }

  /*
    STAP 1:
    Motorfamilie herkennen.
  */

  const engineResult =
    resolveEngine(vehicle)

  /*
    STAP 2:
    Bestaande exacte lokale
    match gebruiken als die
    al complete oliegegevens heeft.
  */

  const legacy =
    resolveLegacyLocalOil(
      vehicle
    )

  if (
    legacy?.oil?.viscosity &&
    legacy?.oil?.specification
  ) {
    return {
      success: true,

      vehicle,

      source:
        legacy.source,

      confidence:
        legacy.confidence,

      engine:
        legacy.engine,

      oil:
        legacy.oil,

      products:
        buildProducts(
          legacy.oil
        ),

      engineMatch:
        engineResult
    }
  }

  /*
    STAP 3:
    Vehicle Finder.
  */

  const external =
    await tryVehicleFinder(
      vehicle
    )

  if (
    external.success &&
    external.oil?.specification
  ) {
    const engine =
      engineResult.found
        ? {
            name:
              engineResult.engine
                .name ||
              null,

            code:
              engineResult.engine
                .code ||
              null,

            family:
              engineResult.engine
                .family ||
              null,

            powerKw:
              engineResult.engine
                .powerKw ??
              null,

            powerPk:
              engineResult.engine
                .powerPk ??
              null
          }
        : external.engine
          ? {
              name:
                external.engine,

              code: null,
              family: null
            }
          : null

    return {
      success: true,

      vehicle,

      source:
        external.source,

      confidence:
        external.confidence,

      engine,

      oil:
        external.oil,

      products:
        buildProducts(
          external.oil
        ),

      engineMatch:
        engineResult
    }
  }

  /*
    STAP 4:
    Motorfamilie gebruiken.
  */

  if (engineResult.found) {
    const familyOil =
      oilFromEngineFamily(
        engineResult
      )

    const engine = {
      name:
        engineResult.engine.name ||
        null,

      code:
        engineResult.engine.code ||
        null,

      family:
        engineResult.engine.family ||
        null,

      powerKw:
        engineResult.engine.powerKw ??
        null,

      powerPk:
        engineResult.engine.powerPk ??
        null
    }

    if (
      familyOil?.viscosity &&
      familyOil?.specification
    ) {
      return {
        success: true,

        vehicle,

        source:
          'engine-resolver',

        confidence:
          engineResult.confidence,

        engine,

        oil:
          familyOil,

        products:
          buildProducts(
            familyOil
          ),

        engineMatch:
          engineResult
      }
    }

    /*
      Motor gevonden,
      olie nog niet definitief.
    */

    return {
      success: false,

      vehicle,

      source:
        'engine-resolver',

      confidence:
        engineResult.confidence,

      engine,

      oil:
        familyOil,

      products: {
        shell: null,
        ok: null,
        mpm: null
      },

      needsMoreInformation:
        familyOil
          ?.requiresDpfCheck ===
        true,

      needsManufacturerOilData:
        familyOil
          ?.requiresManufacturerOilData ===
        true,

      engineMatch:
        engineResult,

      message:
        'Motorfamilie herkend, maar de definitieve oliespecificatie is nog niet betrouwbaar bevestigd.'
    }
  }

  /*
    STAP 5:
    Alleen RDW.
  */

  return {
    success: false,

    vehicle,

    source:
      'rdw-only',

    confidence:
      'unknown',

    engine: null,

    oil: null,

    products: {
      shell: null,
      ok: null,
      mpm: null
    },

    externalFailure: {
      reason:
        external.reason ||
        'unknown'
    },

    message:
      'Voertuig gevonden via RDW, maar motor en oliespecificatie konden nog niet betrouwbaar worden bepaald.'
  }
}
