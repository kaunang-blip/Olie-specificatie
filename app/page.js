'use client'

import { useState } from 'react'
import { findOilMatch } from './lib/oilMatches'

function formatKenteken(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
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

    if (model.toUpperCase().startsWith(merk.toUpperCase())) {
      model = model.slice(merk.length).trim()
    }
  }

  return model
}

export default function Home() {
  const [kenteken, setKenteken] = useState('')
  const [vehicle, setVehicle] = useState(null)
  const [vehicleFinder, setVehicleFinder] = useState(null)

  const [error, setError] = useState('')
  const [oilError, setOilError] = useState('')
  const [loading, setLoading] = useState(false)

  const oilMatch = findOilMatch(vehicle)

  async function zoeken(e) {
    e.preventDefault()

    setError('')
    setOilError('')
    setVehicle(null)
    setVehicleFinder(null)

    const clean = formatKenteken(kenteken)

    if (clean.length < 6) {
      setError('Vul een geldig Nederlands kenteken in.')
      return
    }

    setLoading(true)

    try {
      // STAP 1: RDW
      const rdwResponse = await fetch(
        `/api/rdw?kenteken=${encodeURIComponent(clean)}`
      )

      const rdwData = await rdwResponse.json()

      if (!rdwResponse.ok) {
        throw new Error(
          rdwData.error || 'Voertuig niet gevonden.'
        )
      }

      setVehicle(rdwData)

      // STAP 2: gegevens voorbereiden voor Vehicle Finder
      const year = getYear(rdwData.datumEersteToelating)
      const make = rdwData.merk
      const model = getVehicleFinderModel(rdwData)

      if (!year || !make || !model) {
        setOilError(
          'Niet genoeg voertuiggegevens om automatisch oliegegevens op te halen.'
        )
        return
      }

      // STAP 3: Vehicle Finder
      try {
        const vfResponse = await fetch(
         `/api/vehicle-finder?year=${encodeURIComponent(year)}` +
`&make=${encodeURIComponent(make)}` +
`&model=${encodeURIComponent(model)}` +
`&cilinderinhoud=${encodeURIComponent(rdwData.cilinderinhoud || '')}` +
`&vermogenKw=${encodeURIComponent(rdwData.vermogenKw || '')}`        

        const vfData = await vfResponse.json()

        if (!vfResponse.ok) {
          setOilError(
            vfData.error ||
            'Automatische oliegegevens konden niet worden gevonden.'
          )
          return
        }

        setVehicleFinder(vfData)
      } catch (vfError) {
        console.error(vfError)

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

  const automaticOil = vehicleFinder?.oil?.oil_spec

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
          Voer je kenteken in. De app zoekt automatisch het voertuig
          en de beschikbare oliegegevens op.
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
                setKenteken(e.target.value)
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
            <div>
              <span className="label">
                Voertuig gevonden
              </span>

              <h2>
                {vehicle.merk}{' '}
                {vehicle.handelsbenaming}
              </h2>
            </div>

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

          {vehicleFinder?.vehicle && (
            <div className="vehicleCard">
              <span className="label">
                Automatische voertuigmatch
              </span>

              <h2>
                {vehicleFinder.vehicle.make}{' '}
                {vehicleFinder.vehicle.model}
              </h2>

              <p>
                <strong>
                  Vehicle ID:
                </strong>{' '}
                {vehicleFinder.vehicle.id}
              </p>

              <p>
                <strong>
                  Bouwjaar:
                </strong>{' '}
                {vehicleFinder.vehicle.year}
              </p>
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
                    Olie-inhoud met filter
                  </span>

                  <strong>
                    {automaticOil.capacity_with_filter
                      ? `${automaticOil.capacity_with_filter} liter`
                      : 'Onbekend'}
                  </strong>
                </div>

                <div>
                  <span>
                    Olie-inhoud zonder filter
                  </span>

                  <strong>
                    {automaticOil.capacity_without_filter
                      ? `${automaticOil.capacity_without_filter} liter`
                      : 'Onbekend'}
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
              </div>
            </div>
          )}

          {oilError && (
            <div className="message error">
              {oilError}
            </div>
          )}

          {oilMatch && (
            <div className="vehicleCard">
              <span className="label">
                Motor herkend
              </span>

              <h2>
                {oilMatch.engine.naam} –{' '}
                {oilMatch.engine.vermogenKw}{' '}
                kW /{' '}
                {oilMatch.engine.vermogenPk}{' '}
                pk
              </h2>

              <p>
                <strong>
                  Motorcode:
                </strong>{' '}
                {oilMatch.engine.motorcode}
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
                {oilMatch?.oil?.shell
                  ?.product ||
                  'Nog geen productmatch gevonden'}
              </p>

              {oilMatch?.oil?.shell
                ?.viscositeit && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {
                    oilMatch.oil.shell
                      .viscositeit
                  }
                </p>
              )}

              {oilMatch?.oil?.shell
                ?.specificatie && (
                <p>
                  <strong>
                    Specificatie:
                  </strong>{' '}
                  {
                    oilMatch.oil.shell
                      .specificatie
                  }
                </p>
              )}

              <span className="status">
                {oilMatch?.oil?.shell
                  ?.status === 'matched'
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>
            </article>

            <article className="brandCard">
              <span className="brandName">
                OK Olie
              </span>

              <p>
                {oilMatch?.oil?.ok
                  ?.product ||
                  'Nog geen productmatch gevonden'}
              </p>

              {oilMatch?.oil?.ok
                ?.viscositeit && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {
                    oilMatch.oil.ok
                      .viscositeit
                  }
                </p>
              )}

              {oilMatch?.oil?.ok
                ?.specificatie && (
                <p>
                  <strong>
                    Specificatie:
                  </strong>{' '}
                  {
                    oilMatch.oil.ok
                      .specificatie
                  }
                </p>
              )}

              <span className="status">
                {oilMatch?.oil?.ok
                  ?.status === 'matched'
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>
            </article>

            <article className="brandCard">
              <span className="brandName">
                MPM
              </span>

              <p>
                {oilMatch?.oil?.mpm
                  ?.product ||
                  'Nog geen productmatch gevonden'}
              </p>

              {oilMatch?.oil?.mpm
                ?.viscositeit && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {
                    oilMatch.oil.mpm
                      .viscositeit
                  }
                </p>
              )}

              {oilMatch?.oil?.mpm
                ?.specificatie && (
                <p>
                  <strong>
                    Specificatie:
                  </strong>{' '}
                  {
                    oilMatch.oil.mpm
                      .specificatie
                  }
                </p>
              )}

              <span className="status">
                {oilMatch?.oil?.mpm
                  ?.status === 'matched'
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
