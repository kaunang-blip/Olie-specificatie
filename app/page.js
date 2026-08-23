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

  const parts = date.split('-')

  if (parts.length !== 3) return null

  return parts[2]
}

function getVehicleFinderModel(vehicle) {
  if (!vehicle?.handelsbenaming) return ''

  let model = vehicle.handelsbenaming.trim()

  if (vehicle.merk) {
    const merk = vehicle.merk.trim()

    if (
      model
        .toUpperCase()
        .startsWith(merk.toUpperCase())
    ) {
      model = model
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
  const [kenteken, setKenteken] = useState('')
  const [vehicle, setVehicle] = useState(null)
  const [vehicleFinder, setVehicleFinder] = useState(null)

  const [error, setError] = useState('')
  const [oilError, setOilError] = useState('')
  const [loading, setLoading] = useState(false)

  const fallbackOilMatch = findOilMatch(vehicle)

  async function zoeken(e) {
    e.preventDefault()

    setError('')
    setOilError('')
    setVehicle(null)
    setVehicleFinder(null)

    const clean = formatKenteken(kenteken)

    if (clean.length < 6) {
      setError(
        'Vul een geldig Nederlands kenteken in.'
      )
      return
    }

    setLoading(true)

    try {
      const rdwResponse = await fetch(
        `/api/rdw?kenteken=${encodeURIComponent(clean)}`
      )

      const rdwData = await rdwResponse.json()

      if (!rdwResponse.ok) {
        throw new Error(
          rdwData.error ||
            'Voertuig niet gevonden.'
        )
      }

      setVehicle(rdwData)

      const year = getYear(
        rdwData.datumEersteToelating
      )

      const make = rdwData.merk

      const model =
        getVehicleFinderModel(rdwData)

      if (!year || !make || !model) {
        setOilError(
          'Niet genoeg voertuiggegevens om automatisch oliegegevens op te halen.'
        )
        return
      }

      try {
        const vfResponse = await fetch(
          `/api/vehicle-finder?year=${encodeURIComponent(year)}` +
            `&make=${encodeURIComponent(make)}` +
            `&model=${encodeURIComponent(model)}` +
            `&cilinderinhoud=${encodeURIComponent(
              rdwData.cilinderinhoud || ''
            )}` +
            `&vermogenKw=${encodeURIComponent(
              rdwData.vermogenKw || ''
            )}`
        )

        const vfData =
          await vfResponse.json()

        if (!vfResponse.ok) {
          setOilError(
            vfData.error ||
              'Automatische oliegegevens konden niet worden gevonden.'
          )
          return
        }

        setVehicleFinder(vfData)

        if (
          vfData.safeMatch === false &&
          vfData.warning
        ) {
          setOilError(vfData.warning)
        }
      } catch (vfError) {
        console.error(
          'Vehicle Finder fout:',
          vfError
        )

        setOilError(
          'Vehicle Finder kon tijdelijk niet worden bereikt.'
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

  const safeAutomaticMatch =
    vehicleFinder?.safeMatch === true

  const automaticOil =
    safeAutomaticMatch
      ? vehicleFinder?.oil?.oil_spec
      : null

  const fallbackOil =
    !automaticOil && fallbackOilMatch
      ? {
          viscosity:
            fallbackOilMatch.oil?.viscositeit ||
            fallbackOilMatch.oil?.shell?.viscositeit ||
            null,
          oem_spec:
            fallbackOilMatch.oil?.oemSpecificatie ||
            fallbackOilMatch.oil?.shell?.specificatie ||
            null
        }
      : null

  const oilForProducts =
    automaticOil || fallbackOil

  const normalizedSpec =
    normalizeOilSpec(
      oilForProducts?.oem_spec || ''
    )

  const shellProduct =
    oilForProducts
      ? findProductByBrand({
          oemSpec: normalizedSpec,
          viscosity:
            oilForProducts.viscosity,
          brand: 'Shell'
        })
      : null

  const okProduct =
    oilForProducts
      ? findProductByBrand({
          oemSpec: normalizedSpec,
          viscosity:
            oilForProducts.viscosity,
          brand: 'OK Olie'
        })
      : null

  const mpmProduct =
    oilForProducts
      ? findProductByBrand({
          oemSpec: normalizedSpec,
          viscosity:
            oilForProducts.viscosity,
          brand: 'MPM'
        })
      : null

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">
          OLIEZOEKER
        </div>

        <h1>
          Vind de juiste motorolie via kenteken
        </h1>

        <p>
          Voer je kenteken in. De app zoekt
          automatisch het voertuig en de
          beschikbare oliegegevens op.
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
                <span>Brandstof</span>
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
                <span>Variant</span>
                <strong>
                  {vehicle.variant ||
                    'Onbekend'}
                </strong>
              </div>

              <div>
                <span>Vermogen</span>
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

          {vehicleFinder?.vehicle && (
            <div className="vehicleCard">
              <span className="label">
                Automatische voertuigmatch
              </span>

              <h2>
                {vehicleFinder.vehicle.make}{' '}
                {vehicleFinder.vehicle.model}
              </h2>

              <div className="specGrid">
                <div>
                  <span>Vehicle ID</span>
                  <strong>
                    {vehicleFinder.vehicle.id ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>Bouwjaar</span>
                  <strong>
                    {vehicleFinder.vehicle.year ||
                      'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>Motor</span>
                  <strong>
                    {vehicleFinder.vehicle
                      .engine ||
                      'Niet beschikbaar'}
                  </strong>
                </div>

                <div>
                  <span>
                    Exacte match
                  </span>
                  <strong>
                    {safeAutomaticMatch
                      ? 'Ja'
                      : 'Nog niet'}
                  </strong>
                </div>
              </div>
            </div>
          )}

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

          {oilError && (
            <div className="message error">
              {oilError}
            </div>
          )}

          {fallbackOilMatch && (
            <div className="vehicleCard">
              <span className="label">
                Motor herkend
              </span>

              <h2>
                {fallbackOilMatch.engine.naam}{' '}
                –{' '}
                {
                  fallbackOilMatch.engine
                    .vermogenKw
                }{' '}
                kW /{' '}
                {
                  fallbackOilMatch.engine
                    .vermogenPk
                }{' '}
                pk
              </h2>

              <p>
                <strong>
                  Motorcode:
                </strong>{' '}
                {
                  fallbackOilMatch.engine
                    .motorcode
                }
              </p>
            </div>
          )}

          <h3>
            Motorolie per merk
          </h3>

          <div className="brandGrid">
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

              {shellProduct?.specs?.length > 0 && (
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

              {okProduct?.specs?.length > 0 && (
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

              {mpmProduct?.specs?.length > 0 && (
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
