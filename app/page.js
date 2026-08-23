'use client'

import { useState } from 'react'
import { findOilMatch } from './lib/oilMatches'

function formatKenteken(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export default function Home() {
  const [kenteken, setKenteken] = useState('')
  const [vehicle, setVehicle] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const oilMatch = findOilMatch(vehicle)

  async function zoeken(e) {
    e.preventDefault()
    setError('')
    setVehicle(null)

    const clean = formatKenteken(kenteken)

    if (clean.length < 6) {
      setError('Vul een geldig Nederlands kenteken in.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/rdw?kenteken=${encodeURIComponent(clean)}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Voertuig niet gevonden.')
      }

      setVehicle(data)
    } catch (err) {
      setError(err.message || 'Er ging iets mis bij het opzoeken.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">OLIEZOEKER</div>

        <h1>Vind de juiste motorolie via kenteken</h1>

        <p>
          Zoek eerst het voertuig op via RDW. Daarna bepalen we de
          motorspecificatie en koppelen we Shell, OK Olie en MPM.
        </p>

        <form onSubmit={zoeken} className="searchForm">
          <div className="plate">
            <span className="eu">NL</span>

            <input
              value={kenteken}
              onChange={(e) => setKenteken(e.target.value)}
              placeholder="AB123C"
              aria-label="Kenteken"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Zoeken…' : 'Zoek voertuig'}
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
              <span className="label">Voertuig gevonden</span>

              <h2>
                {vehicle.merk} {vehicle.handelsbenaming}
              </h2>
            </div>

            <div className="specGrid">
              <div>
                <span>Brandstof</span>
                <strong>{vehicle.brandstof || 'Onbekend'}</strong>
              </div>

              <div>
                <span>Bouwjaar / toelating</span>
                <strong>
                  {vehicle.datumEersteToelating || 'Onbekend'}
                </strong>
              </div>

              <div>
                <span>Cilinderinhoud</span>
                <strong>
                  {vehicle.cilinderinhoud
                    ? `${vehicle.cilinderinhoud} cc`
                    : 'Onbekend'}
                </strong>
              </div>

              <div>
                <span>Variant</span>
                <strong>{vehicle.variant || 'Onbekend'}</strong>
              </div>

              <div>
                <span>Vermogen</span>
                <strong>
                  {vehicle.vermogenKw
                    ? `${vehicle.vermogenKw} kW / ${Math.round(
                        vehicle.vermogenKw * 1.35962
                      )} pk`
                    : 'Onbekend'}
                </strong>
              </div>
            </div>
          </div>

          {oilMatch && (
            <div className="vehicleCard">
              <span className="label">Motor herkend</span>

              <h2>
                {oilMatch.engine.naam} – {oilMatch.engine.vermogenKw} kW /{' '}
                {oilMatch.engine.vermogenPk} pk
              </h2>

              <p>
                <strong>Motorcode:</strong>{' '}
                {oilMatch.engine.motorcode}
              </p>

              <p>
                <strong>Oliespecificatie:</strong>{' '}
                {oilMatch.oil.oemSpecificaties.join(' / ')}
              </p>

              <p>
                <strong>Mogelijke viscositeit:</strong>{' '}
                {oilMatch.oil.viscositeiten.join(' / ')}
              </p>
            </div>
          )}

          <h3>Motorolie</h3>

          <div className="brandGrid">
            <article className="brandCard">
              <span className="brandName">Shell</span>

              <p>
                {oilMatch?.oil?.shell?.product || 'Nog te koppelen'}
              </p>

              {oilMatch?.oil?.shell?.viscositeit && (
                <p>
                  <strong>Viscositeit:</strong>{' '}
                  {oilMatch.oil.shell.viscositeit}
                </p>
              )}

              {oilMatch?.oil?.shell?.specificatie && (
                <p>
                  <strong>Specificatie:</strong>{' '}
                  {oilMatch.oil.shell.specificatie}
                </p>
              )}

              <span className="status">
                {oilMatch?.oil?.shell?.status === 'matched'
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>
            </article>

            <article className="brandCard">
              <span className="brandName">OK Olie</span>

              <p>
                {oilMatch?.oil?.ok?.product || 'Nog te koppelen'}
              </p>

              {oilMatch?.oil?.ok?.viscositeit && (
                <p>
                  <strong>Viscositeit:</strong>{' '}
                  {oilMatch.oil.ok.viscositeit}
                </p>
              )}

              {oilMatch?.oil?.ok?.specificatie && (
                <p>
                  <strong>Specificatie:</strong>{' '}
                  {oilMatch.oil.ok.specificatie}
                </p>
              )}

              <span className="status">
                {oilMatch?.oil?.ok?.status === 'matched'
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>
            </article>

            <article className="brandCard">
              <span className="brandName">MPM</span>

              <p>
                {oilMatch?.oil?.mpm?.product || 'Nog te koppelen'}
              </p>

              {oilMatch?.oil?.mpm?.viscositeit && (
                <p>
                  <strong>Viscositeit:</strong>{' '}
                  {oilMatch.oil.mpm.viscositeit}
                </p>
              )}

              {oilMatch?.oil?.mpm?.specificatie && (
                <p>
                  <strong>Specificatie:</strong>{' '}
                  {oilMatch.oil.mpm.specificatie}
                </p>
              )}

              <span className="status">
                {oilMatch?.oil?.mpm?.status === 'matched'
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
