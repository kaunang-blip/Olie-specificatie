'use client'

import { useState } from 'react'
import { findOilMatch } from './lib/oilMatches'
import { findProductByBrand } from './lib/oilProducts'

function formatKenteken(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

function getYear(date) {
  if (!date) return null

  const parts = String(date).split('-')

  if (parts.length !== 3) {
    return null
  }

  return parts[2]
}

function getVehicleFinderModel(vehicle) {
  if (!vehicle?.handelsbenaming) {
    return ''
  }

  let model =
    vehicle.handelsbenaming.trim()

  if (vehicle.merk) {
    const merk =
      vehicle.merk.trim()

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

function normalizeOilSpec(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function Home() {
  const [
    kenteken,
    setKenteken
  ] = useState('')

  const [
    vehicle,
    setVehicle
  ] = useState(null)

  const [
    vehicleFinder,
    setVehicleFinder
  ] = useState(null)

  const [
    error,
    setError
  ] = useState('')

  const [
    oilError,
    setOilError
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(false)

  /*
    unknown
    with-dpf
    without-dpf
  */

  const [
    dpfChoice,
    setDpfChoice
  ] = useState('unknown')

  const fallbackOilMatch =
    findOilMatch(vehicle)

  async function zoeken(e) {
    e.preventDefault()

    setError('')
    setOilError('')
    setVehicle(null)
    setVehicleFinder(null)
    setDpfChoice('unknown')

    const clean =
      formatKenteken(kenteken)

    if (clean.length < 6) {
      setError(
        'Vul een geldig Nederlands kenteken in.'
      )

      return
    }

    setLoading(true)

    try {
      /*
        STAP 1
        RDW
      */

      const rdwResponse =
        await fetch(
          `/api/rdw?kenteken=${encodeURIComponent(
            clean
          )}`
        )

      const rdwData =
        await rdwResponse.json()

      if (!rdwResponse.ok) {
        throw new Error(
          rdwData.error ||
            'Voertuig niet gevonden.'
        )
      }

      setVehicle(rdwData)

      /*
        STAP 2
        Vehicle Finder
      */

      const year =
        getYear(
          rdwData.datumEersteToelating
        )

      const make =
        rdwData.merk

      const model =
        getVehicleFinderModel(
          rdwData
        )

      if (
        !year ||
        !make ||
        !model
      ) {
        return
      }

      try {
        const oilResponse =
          await fetch(
            `/api/vehicle-oil?year=${encodeURIComponent(
              year
            )}` +
              `&make=${encodeURIComponent(
                make
              )}` +
              `&model=${encodeURIComponent(
                model
              )}` +
              `&cilinderinhoud=${encodeURIComponent(
                rdwData.cilinderinhoud ||
                  ''
              )}` +
              `&vermogenKw=${encodeURIComponent(
                rdwData.vermogenKw ||
                  ''
              )}`
          )

        const oilData =
          await oilResponse.json()

        /*
          Onze vehicle-oil route kan
          fallbackRequired teruggeven.

          Dat is geen harde fout.
        */

        if (!oilResponse.ok) {
          setOilError(
            oilData.error ||
              'Automatische oliegegevens konden niet worden gevonden.'
          )

          return
        }

        setVehicleFinder(
          oilData
        )
      } catch (
        oilLookupError
      ) {
        console.error(
          'Vehicle oil fout:',
          oilLookupError
        )
      }
    } catch (err) {
      setError(
        err.message ||
          'Er ging iets mis bij het opzoeken.'
      )
    } finally {
      setLoading(false)
    }
  }

  /*
    ==================================================
    VEHICLE FINDER OLIE
    ==================================================
  */

  const automaticOil =
    vehicleFinder?.oil?.oil_spec ||
    vehicleFinder?.oil?.data
      ?.oil_spec ||
    vehicleFinder?.oil_spec ||
    null

  /*
    ==================================================
    LOKALE MOTOR / OLIE
    ==================================================
  */

  let localOil = null

  if (fallbackOilMatch) {
    const oil =
      fallbackOilMatch.oil

    /*
      Normale motor zonder
      DPF-keuze.
    */

    if (
      !oil?.requiresDpfCheck
    ) {
      localOil = {
        viscosity:
          oil?.viscositeit ||
          null,

        oem_spec:
          oil?.oemSpecificatie ||
          null,

        acea:
          oil?.acea ||
          null,

        source:
          'local'
      }
    }

    /*
      Motor waarvoor DPF-status
      nodig is.
    */

    if (
      oil?.requiresDpfCheck &&
      dpfChoice ===
        'with-dpf'
    ) {
      const variant =
        oil.variants?.withDpf

      localOil = {
        viscosity:
          variant?.viscositeit ||
          null,

        oem_spec:
          variant?.oemSpecificatie ||
          null,

        acea:
          variant?.acea ||
          null,

        source:
          'local-dpf'
      }
    }

    if (
      oil?.requiresDpfCheck &&
      dpfChoice ===
        'without-dpf'
    ) {
      const variant =
        oil.variants
          ?.withoutDpf

      localOil = {
        viscosity:
          variant?.viscositeit ||
          null,

        oem_spec:
          variant?.oemSpecificatie ||
          null,

        acea:
          variant?.acea ||
          null,

        source:
          'local-no-dpf'
      }
    }
  }

  /*
    Vehicle Finder heeft voorrang
    wanneer daar echte oliegegevens
    beschikbaar zijn.

    Anders gebruiken we de lokale
    motorherkenning.
  */

  const oilForProducts =
    automaticOil ||
    localOil

  const normalizedSpec =
    normalizeOilSpec(
      oilForProducts?.oem_spec ||
        ''
    )

  /*
    ==================================================
    PRODUCTMATCHES
    ==================================================
  */

  const shellProduct =
    oilForProducts
      ? findProductByBrand({
          oemSpec:
            normalizedSpec,

          viscosity:
            oilForProducts
              .viscosity,

          brand:
            'Shell'
        })
      : null

  const okProduct =
    oilForProducts
      ? findProductByBrand({
          oemSpec:
            normalizedSpec,

          viscosity:
            oilForProducts
              .viscosity,

          brand:
            'OK Olie'
        })
      : null

  const mpmProduct =
    oilForProducts
      ? findProductByBrand({
          oemSpec:
            normalizedSpec,

          viscosity:
            oilForProducts
              .viscosity,

          brand:
            'MPM'
        })
      : null

  const matchedVehicle =
    vehicleFinder?.vehicle ||
    null

  const requiresDpfChoice =
    fallbackOilMatch?.oil
      ?.requiresDpfCheck ===
      true

  return (
    <main className="shell">

      {/* =========================
          ZOEKEN
      ========================= */}

      <section className="hero">

        <div className="eyebrow">
          OLIEZOEKER
        </div>

        <h1>
          Vind de juiste motorolie
          via kenteken
        </h1>

        <p>
          Voer je kenteken in.
          De app zoekt automatisch
          het voertuig en de
          beschikbare oliegegevens
          op.
        </p>

        <form
          onSubmit={zoeken}
          className="searchForm"
        >

          <div className="plate">

            <span className="eu">
              NL
            </span>

            <input
              value={kenteken}
              onChange={(e) =>
                setKenteken(
                  e.target.value
                )
              }
              placeholder="AB123C"
              aria-label="Kenteken"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
            />

          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Zoeken…'
              : 'Zoek voertuig'}
          </button>

        </form>

        {error && (
          <div className="message error">
            {error}
          </div>
        )}

      </section>

      {vehicle && (

        <section className="results">

          {/* =========================
              RDW
          ========================= */}

          <div className="vehicleCard">

            <span className="label">
              Voertuig gevonden
            </span>

            <h2>
              {vehicle.merk}{' '}
              {vehicle.handelsbenaming}
            </h2>

            <div className="specGrid">

              <div>
                <span>
                  Brandstof
                </span>

                <strong>
                  {vehicle.brandstof ||
                    'Onbekend'}
                </strong>
              </div>

              <div>
                <span>
                  Bouwjaar / toelating
                </span>

                <strong>
                  {vehicle.datumEersteToelating ||
                    'Onbekend'}
                </strong>
              </div>

              <div>
                <span>
                  Cilinderinhoud
                </span>

                <strong>
                  {vehicle.cilinderinhoud
                    ? `${vehicle.cilinderinhoud} cc`
                    : 'Onbekend'}
                </strong>
              </div>

              <div>
                <span>
                  Variant
                </span>

                <strong>
                  {vehicle.variant ||
                    'Onbekend'}
                </strong>
              </div>

              <div>
                <span>
                  Vermogen
                </span>

                <strong>
                  {vehicle.vermogenKw
                    ? `${vehicle.vermogenKw} kW / ${Math.round(
                        vehicle.vermogenKw *
                          1.35962
                      )} pk`
                    : 'Onbekend'}
                </strong>
              </div>

            </div>

          </div>

          {/* =========================
              VEHICLE FINDER
          ========================= */}

          {matchedVehicle && (

            <div className="vehicleCard">

              <span className="label">
                Automatische voertuigmatch
              </span>

              <h2>
                {matchedVehicle.make}{' '}
                {matchedVehicle.model}
              </h2>

              <div className="specGrid">

                <div>
                  <span>
                    Vehicle ID
                  </span>

                  <strong>
                    {matchedVehicle.id ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    Bouwjaar
                  </span>

                  <strong>
                    {matchedVehicle.year ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    Motor
                  </span>

                  <strong>
                    {matchedVehicle.engine ||
                      'Niet beschikbaar'}
                  </strong>
                </div>

                <div>
                  <span>
                    Oliegegevens
                  </span>

                  <strong>
                    {automaticOil
                      ? 'Gevonden'
                      : 'Niet gevonden'}
                  </strong>
                </div>

              </div>

            </div>

          )}

          {/* =========================
              MOTORHERKENNING
          ========================= */}

          {fallbackOilMatch && (

            <div className="vehicleCard">

              <span className="label">
                Motor herkend
              </span>

              <h2>
                {fallbackOilMatch
                  .engine.naam}{' '}
                –{' '}
                {fallbackOilMatch
                  .engine.vermogenKw}{' '}
                kW /{' '}
                {fallbackOilMatch
                  .engine.vermogenPk}{' '}
                pk
              </h2>

              <p>
                <strong>
                  Motorcode:
                </strong>{' '}
                {fallbackOilMatch
                  .engine.motorcode}
              </p>

            </div>

          )}

          {/* =========================
              DPF KEUZE
          ========================= */}

          {requiresDpfChoice &&
            !automaticOil && (

              <div className="vehicleCard">

                <span className="label">
                  Roetfilter controleren
                </span>

                <h2>
                  Heeft dit voertuig
                  een roetfilter (DPF)?
                </h2>

                <p>
                  Voor deze motor hangt
                  de juiste
                  oliespecificatie af
                  van de aanwezigheid
                  van een roetfilter.
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginTop: '20px'
                  }}
                >

                  <button
                    type="button"
                    onClick={() =>
                      setDpfChoice(
                        'with-dpf'
                      )
                    }
                  >
                    Ja, met roetfilter
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDpfChoice(
                        'without-dpf'
                      )
                    }
                  >
                    Nee, zonder roetfilter
                  </button>

                </div>

                {dpfChoice ===
                  'with-dpf' && (

                  <p
                    style={{
                      marginTop: '20px'
                    }}
                  >
                    Gekozen:
                    {' '}
                    <strong>
                      met roetfilter
                    </strong>
                  </p>

                )}

                {dpfChoice ===
                  'without-dpf' && (

                  <p
                    style={{
                      marginTop: '20px'
                    }}
                  >
                    Gekozen:
                    {' '}
                    <strong>
                      zonder roetfilter
                    </strong>
                  </p>

                )}

              </div>

          )}

          {/* =========================
              AUTOMATISCH OLIEADVIES
          ========================= */}

          {automaticOil && (

            <div className="vehicleCard">

              <span className="label">
                Automatisch olieadvies
              </span>

              <h2>
                {automaticOil.viscosity ||
                  'Motorolie'}
              </h2>

              <div className="specGrid">

                <div>
                  <span>
                    Viscositeit
                  </span>

                  <strong>
                    {automaticOil.viscosity ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    OEM-specificatie
                  </span>

                  <strong>
                    {automaticOil.oem_spec ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    Type olie
                  </span>

                  <strong>
                    {automaticOil.oil_type ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    Inhoud met filter
                  </span>

                  <strong>
                    {automaticOil.capacity_with_filter
                      ? `${automaticOil.capacity_with_filter} liter`
                      : 'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    Inhoud zonder filter
                  </span>

                  <strong>
                    {automaticOil.capacity_without_filter
                      ? `${automaticOil.capacity_without_filter} liter`
                      : 'Onbekend'}
                  </strong>
                </div>

              </div>

            </div>

          )}

          {/* =========================
              LOKAAL OLIEADVIES
          ========================= */}

          {!automaticOil &&
            localOil && (

              <div className="vehicleCard">

                <span className="label">
                  Olieadvies
                </span>

                <h2>
                  {localOil.viscosity}
                </h2>

                <div className="specGrid">

                  <div>
                    <span>
                      Viscositeit
                    </span>

                    <strong>
                      {localOil.viscosity ||
                        'Onbekend'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      OEM-specificatie
                    </span>

                    <strong>
                      {localOil.oem_spec ||
                        'Onbekend'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ACEA
                    </span>

                    <strong>
                      {localOil.acea ||
                        'Onbekend'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      DPF
                    </span>

                    <strong>
                      {dpfChoice ===
                      'with-dpf'
                        ? 'Met roetfilter'
                        : dpfChoice ===
                            'without-dpf'
                          ? 'Zonder roetfilter'
                          : 'Niet van toepassing'}
                    </strong>
                  </div>

                </div>

              </div>

          )}

          {oilError && (

            <div className="message error">
              {oilError}
            </div>

          )}

          {/* =========================
              PRODUCTEN
          ========================= */}

          <h3>
            Motorolie per merk
          </h3>

          <div className="brandGrid">

            {/* SHELL */}

            <article className="brandCard">

              <span className="brandName">
                Shell
              </span>

              <p>
                {shellProduct?.product ||
                  'Geen automatische match gevonden'}
              </p>

              {shellProduct?.viscosity && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {shellProduct.viscosity}
                </p>
              )}

              {shellProduct?.specs?.length >
                0 && (
                <p>
                  <strong>
                    Specificatie:
                  </strong>{' '}
                  {shellProduct.specs.join(
                    ' / '
                  )}
                </p>
              )}

              <span className="status">
                {shellProduct
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>

            </article>

            {/* OK OLIE */}

            <article className="brandCard">

              <span className="brandName">
                OK Olie
              </span>

              <p>
                {okProduct?.product ||
                  'Geen automatische match gevonden'}
              </p>

              {okProduct?.viscosity && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {okProduct.viscosity}
                </p>
              )}

              {okProduct?.specs?.length >
                0 && (
                <p>
                  <strong>
                    Specificatie:
                  </strong>{' '}
                  {okProduct.specs.join(
                    ' / '
                  )}
                </p>
              )}

              <span className="status">
                {okProduct
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>

            </article>

            {/* MPM */}

            <article className="brandCard">

              <span className="brandName">
                MPM
              </span>

              <p>
                {mpmProduct?.product ||
                  'Geen automatische match gevonden'}
              </p>

              {mpmProduct?.viscosity && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {mpmProduct.viscosity}
                </p>
              )}

              {mpmProduct?.specs?.length >
                0 && (
                <p>
                  <strong>
                    Specificatie:
                  </strong>{' '}
                  {mpmProduct.specs.join(
                    ' / '
                  )}
                </p>
              )}

              <span className="status">
                {mpmProduct
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>

            </article>

          </div>

        </section>

      )}

    </main>
  )
}
