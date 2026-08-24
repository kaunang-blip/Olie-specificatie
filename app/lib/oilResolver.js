import { findOilMatch } from './oilMatches'
import { findProductByBrand } from './oilProducts'

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

  const parts =
    String(date).split('-')

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
    String(
      vehicle.handelsbenaming
    ).trim()

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
    data =
      await response.json()
  } catch {
    data = null
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  }
}

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
      vehicle
        .datumEersteToelating
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
          'X-API-Key': apiKey
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

  /*
    Vehicle Finder geeft soms maar één
    generieke modelregel terug.

    Daarom behandelen we dit NIET als
    "high confidence" tenzij er ook
    motorinformatie aanwezig is.
  */

  const foundVehicle =
    vehicles[0]

  if (!foundVehicle?.id) {
    return {
      success: false,
      reason:
        'missing-vehicle-id'
    }
  }

  const oilUrl =
    `${VEHICLE_FINDER_BASE}/vehicles/` +
    `${encodeURIComponent(
      foundVehicle.id
    )}/oil-change`

  const oilResult =
    await fetchJson(
      oilUrl,
      {
        headers: {
          'X-API-Key': apiKey
        }
      }
    )

  if (!oilResult.ok) {
    return {
      success: false,
      reason:
        'oil-not-found',
      vehicle:
        foundVehicle
    }
  }

  const rawOil =
    oilResult.data?.data ||
    oilResult.data

  const oilSpec =
    rawOil?.oil_spec ||
    rawOil?.data?.oil_spec ||
    null

  if (!oilSpec) {
    return {
      success: false,
      reason:
        'oil-spec-missing',
      vehicle:
        foundVehicle
    }
  }

  return {
    success: true,

    source:
      'vehicle-finder',

    confidence:
      foundVehicle.engine
        ? 'high'
        : 'medium',

    vehicle:
      foundVehicle,

    engine:
      foundVehicle.engine ||
      null,

    oil: {
      viscosity:
        oilSpec.viscosity ||
        null,

      specification:
        oilSpec.oem_spec ||
        null,

      oilType:
        oilSpec.oil_type ||
        null,

      capacityWithFilter:
        oilSpec
          .capacity_with_filter ??
        null,

      capacityWithoutFilter:
        oilSpec
          .capacity_without_filter ??
        null
    },

    raw:
      rawOil
  }
}

function resolveLocalOil(
  vehicle
) {
  const match =
    findOilMatch(vehicle)

  if (!match) {
    return null
  }

  /*
    Als de motor wel wordt herkend maar
    er nog aanvullende informatie nodig
    is, bijvoorbeeld DPF, kunnen
    viscositeit en specificatie null zijn.

    De motorherkenning blijft dan wel
    bruikbaar.
  */

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

      powerKw:
        match.engine
          ?.vermogenKw ??
        null,

      powerPk:
        match.engine
          ?.vermogenPk ??
        null
    },

    oil: {
      viscosity:
        match.oil
          ?.viscositeit ||
        null,

      specification:
        match.oil
          ?.oemSpecificatie ||
        null,

      acea:
        match.oil?.acea ||
        null,

      capacityWithFilter:
        match.oil
          ?.inhoudMetFilter ??
        null,

      alternativeViscosities:
        match.oil
          ?.alternatieveViscositeiten ||
        [],

      requiresDpfCheck:
        match.oil
          ?.requiresDpfCheck ===
        true,

      dpfStatus:
        match.oil
          ?.dpfStatus ||
        null,

      variants:
        match.oil
          ?.variants ||
        null
    },

    matchInfo:
      match.matchInfo ||
      null
  }
}

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

  const specification =
    normalizeSpec(
      oil.specification
    )

  return {
    shell:
      findProductByBrand({
        oemSpec:
          specification,

        viscosity:
          oil.viscosity,

        brand:
          'Shell'
      }),

    ok:
      findProductByBrand({
        oemSpec:
          specification,

        viscosity:
          oil.viscosity,

        brand:
          'OK Olie'
      }),

    mpm:
      findProductByBrand({
        oemSpec:
          specification,

        viscosity:
          oil.viscosity,

        brand:
          'MPM'
      })
  }
}

export async function resolveOil(
  vehicle
) {
  if (!vehicle) {
    return {
      success: false,
      confidence: 'unknown',
      source: 'none',
      engine: null,
      oil: null,
      products: null
    }
  }

  /*
    ===================================
    1. LOKALE EXACTE MOTORHERKENNING
    ===================================

    Onze lokale database is zeer specifiek:
    merk + model + brandstof +
    cilinderinhoud + vermogen + bouwjaar.

    Als die match bestaat, vertrouwen we
    hem meer dan een generieke externe
    modelmatch.
  */

  const local =
    resolveLocalOil(vehicle)

  if (
    local &&
    local.oil?.viscosity &&
    local.oil?.specification
  ) {
    return {
      success: true,

      vehicle,

      source:
        local.source,

      confidence:
        local.confidence,

      engine:
        local.engine,

      oil:
        local.oil,

      products:
        buildProducts(
          local.oil
        ),

      matchInfo:
        local.matchInfo
    }
  }

  /*
    ===================================
    2. VEHICLE FINDER
    ===================================
  */

  const external =
    await tryVehicleFinder(
      vehicle
    )

  if (
    external.success &&
    external.oil
      ?.specification
  ) {
    const result = {
      success: true,

      vehicle,

      externalVehicle:
        external.vehicle,

      source:
        external.source,

      confidence:
        external.confidence,

      engine:
        local?.engine ||
        (
          external.engine
            ? {
                name:
                  external.engine,
                code: null
              }
            : null
        ),

      oil:
        external.oil,

      products:
        buildProducts(
          external.oil
        )
    }

    /*
      Als we lokaal wel exact de motor
      kennen maar nog geen definitieve
      olie konden kiezen, bewaren we die
      informatie.
    */

    if (local) {
      result.localMatch = {
        engine:
          local.engine,

        oil:
          local.oil,

        matchInfo:
          local.matchInfo
      }
    }

    return result
  }

  /*
    ===================================
    3. LOKALE MOTOR ZONDER OLIEKEUZE
    ===================================

    Bijvoorbeeld Renault M9R wanneer
    DPF-status nog niet gekozen is.
  */

  if (local) {
    return {
      success: true,

      vehicle,

      source:
        local.source,

      confidence:
        local.confidence,

      engine:
        local.engine,

      oil:
        local.oil,

      products:
        buildProducts(
          local.oil
        ),

      needsMoreInformation:
        local.oil
          ?.requiresDpfCheck ===
        true,

      matchInfo:
        local.matchInfo
    }
  }

  /*
    ===================================
    4. NIETS GEVONDEN
    ===================================

    We geven het voertuig nog steeds
    terug, maar verzinnen geen olie.
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
      'Voertuig gevonden via RDW, maar er is nog geen betrouwbare oliespecificatie beschikbaar.'
  }
}
