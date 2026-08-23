'use client'

import { useState } from 'react'

function formatKenteken(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export default function Home() {
  const [kenteken, setKenteken] = useState('')
  const [vehicle, setVehicle] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      const response = await fetch(`/api/vehicle?kenteken=${encodeURIComponent(clean)}`)
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
        <p>Zoek eerst het voertuig op via RDW. In de volgende stap koppelen we Shell, OK Olie en MPM.</p>

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

        {error && <div className="message error">{error}</div>}
      </section>

      {vehicle && (
        <section className="results">
          <div className="vehicleCard">
            <div>
              <span className="label">Voertuig gevonden</span>
              <h2>{vehicle.merk} {vehicle.handelsbenaming}</h2>
            </div>
            <div className="specGrid">
              <div><span>Brandstof</span><strong>{vehicle.brandstof || 'Onbekend'}</strong></div>
              <div><span>Bouwjaar / toelating</span><strong>{vehicle.datumEersteToelating || 'Onbekend'}</strong></div>
              <div><span>Cilinderinhoud</span><strong>{vehicle.cilinderinhoud ? `${vehicle.cilinderinhoud} cc` : 'Onbekend'}</strong></div>
              <div><span>Variant</span><strong>{vehicle.variant || 'Onbekend'}</strong></div>
            </div>
          </div>

          <h3>Motorolie</h3>
          <div className="brandGrid">
            {['Shell', 'OK Olie', 'MPM'].map((brand) => (
              <article className="brandCard" key={brand}>
                <span className="brandName">{brand}</span>
                <p>Wordt in stap 2 gekoppeld aan de exacte motorspecificatie.</p>
                <span className="status">Nog te koppelen</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
