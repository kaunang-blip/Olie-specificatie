'use client'

import { useState } from 'react'

function formatKenteken(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

function pkFromKw(kw) {
  const value = Number(kw)

  if (!Number.isFinite(value)) {
    return null
  }

  return Math.round(
    value * 1.35962
  )
}

function getProductSpecs(product) {
  if (
    !product ||
    !Array.isArray(product.specs)
  ) {
    return ''
  }

  return product.specs.join(' / ')
}

export default function Home() {
  const [
    kenteken,
    setKenteken
  ] = useState('')

  const [
    result,
    setResult
  ] = useState(null)

  const [
    error,
    setError
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(false)

  const [
    dpfChoice,
    setDpfChoice
  ] = useState('unknown')

  async function zoeken(e) {
    e.preventDefault()

    setError('')
    setResult(null)
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
      const response =
        await fetch(
          `/api/oil?kenteken=${encodeURIComponent(
            clean
          )}`
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Het voertuig kon niet worden opgezocht.'
        )
      }

      setResult(data)
    } catch (err) {
      setError(
        err.message ||
          'Er ging iets mis bij het opzoeken.'
      )
    } finally {
      setLoading(false)
    }
  }

  const vehicle =
    result?.vehicle ||
    null

  const engine =
    result?.engine ||
    null

  let oil =
    result?.oil ||
    null

  /*
    ==================================
    DPF-KEUZE
    ==================================

    Als de resolver alleen varianten
    teruggeeft, kiest de gebruiker hier
    welke van toepassing is.
  */

  if (
    oil?.requiresDpfCheck &&
    oil?.variants
  ) {
    if (
      dpfChoice ===
      'with-dpf'
    ) {
      oil = {
        ...oil,
        ...oil.variants.withDpf
      }
    }

    if (
      dpfChoice ===
      'without-dpf'
    ) {
      oil = {
        ...oil,
        ...oil.variants.withoutDpf
      }
    }
  }

  const shell =
    result?.products?.shell ||
    null

  const ok =
    result?.products?.ok ||
    null

  const mpm =
    result?.products?.mpm ||
    null

  const needsDpfChoice =
    result?.oil
      ?.requiresDpfCheck === true

  const needsManufacturerOilData =
    result
      ?.needsManufacturerOilData ===
    true

  const confidence =
    result?.confidence ||
    'unknown'

  return (
    <main className="shell">

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
          het voertuig, de motor en
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

          {/* =========================
              VOERTUIG
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
                  Vermogen
                </span>

                <strong>
                  {vehicle.vermogenKw
                    ? `${vehicle.vermogenKw} kW / ${pkFromKw(
                        vehicle.vermogenKw
                      )} pk`
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
                  Uitvoering
                </span>

                <strong>
                  {vehicle.uitvoering ||
                    'Onbekend'}
                </strong>
              </div>

            </div>

          </div>

          {/* =========================
              MOTOR
          ========================= */}

          {engine && (

            <div className="vehicleCard">

              <span className="label">
                Motor herkend
              </span>

              <h2>
                {engine.name ||
                  'Motorfamilie herkend'}

                {engine.powerKw
                  ? ` – ${engine.powerKw} kW / ${
                      engine.powerPk ||
                      pkFromKw(
                        engine.powerKw
                      )
                    } pk`
                  : ''}
              </h2>

              <div className="specGrid">

                <div>
                  <span>
                    Motorcode
                  </span>

                  <strong>
                    {engine.code ||
                      'Niet beschikbaar'}
                  </strong>
                </div>

                <div>
                  <span>
                    Motorfamilie
                  </span>

                  <strong>
                    {engine.family ||
                      'Niet beschikbaar'}
                  </strong>
                </div>

                <div>
                  <span>
                    Betrouwbaarheid
                  </span>

                  <strong>
                    {confidence === 'high'
                      ? 'Hoog'
                      : confidence ===
                          'medium'
                        ? 'Gemiddeld'
                        : confidence ===
                            'low'
                          ? 'Laag'
                          : 'Onbekend'}
                  </strong>
                </div>

              </div>

            </div>

          )}

          {/* =========================
              DPF KEUZE
          ========================= */}

          {needsDpfChoice && (

            <div className="vehicleCard">

              <span className="label">
                Extra controle nodig
              </span>

              <h2>
                Heeft dit voertuig
                een roetfilter (DPF)?
              </h2>

              <p>
                Voor deze motor hangt
                de juiste olie af van
                de aanwezigheid van
                een roetfilter.
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

            </div>

          )}

          {/* =========================
              OLIE
          ========================= */}

          {oil?.viscosity &&
            oil?.specification && (

              <div className="vehicleCard">

                <span className="label">
                  Olieadvies
                </span>

                <h2>
                  {oil.viscosity}
                </h2>

                <div className="specGrid">

                  <div>
                    <span>
                      Viscositeit
                    </span>

                    <strong>
                      {oil.viscosity}
                    </strong>
                  </div>

                  <div>
                    <span>
                      OEM-specificatie
                    </span>

                    <strong>
                      {oil.specification}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ACEA
                    </span>

                    <strong>
                      {oil.acea ||
                        'Niet opgegeven'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Inhoud met filter
                    </span>

                    <strong>
                      {oil.capacityWithFilter
                        ? `${oil.capacityWithFilter} liter`
                        : 'Niet beschikbaar'}
                    </strong>
                  </div>

                </div>

              </div>

          )}

          {/* =========================
              MOTOR WEL, OLIE NOG NIET
          ========================= */}

          {engine &&
            !oil?.specification &&
            !needsDpfChoice && (

              <div className="message error">

                {needsManufacturerOilData
                  ? 'Motor is herkend, maar de definitieve fabrieksspecificatie voor de olie is nog niet betrouwbaar bevestigd.'
                  : result?.message ||
                    'Motor is herkend, maar de juiste olie kon nog niet veilig worden bepaald.'}

              </div>

          )}

          {/* =========================
              GEEN MOTORHERKENNING
          ========================= */}

          {!engine &&
            result &&
            !result.success && (

              <div className="message error">

                {result.message ||
                  'Voertuig gevonden, maar motor en olie konden nog niet betrouwbaar worden bepaald.'}

              </div>

          )}

          {/* =========================
              PRODUCTEN
          ========================= */}

          <h3>
            Motorolie per merk
          </h3>

          <div className="brandGrid">

            <article className="brandCard">

              <span className="brandName">
                Shell
              </span>

              <p>
                {shell?.product ||
                  'Geen automatische match gevonden'}
              </p>

              {shell?.viscosity && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {shell.viscosity}
                </p>
              )}

              {shell &&
                getProductSpecs(shell) && (
                  <p>
                    <strong>
                      Specificatie:
                    </strong>{' '}
                    {getProductSpecs(
                      shell
                    )}
                  </p>
                )}

              <span className="status">
                {shell
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>

            </article>

            <article className="brandCard">

              <span className="brandName">
                OK Olie
              </span>

              <p>
                {ok?.product ||
                  'Geen automatische match gevonden'}
              </p>

              {ok?.viscosity && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {ok.viscosity}
                </p>
              )}

              {ok &&
                getProductSpecs(ok) && (
                  <p>
                    <strong>
                      Specificatie:
                    </strong>{' '}
                    {getProductSpecs(ok)}
                  </p>
                )}

              <span className="status">
                {ok
                  ? 'Match gevonden'
                  : 'Nog te koppelen'}
              </span>

            </article>

            <article className="brandCard">

              <span className="brandName">
                MPM
              </span>

              <p>
                {mpm?.product ||
                  'Geen automatische match gevonden'}
              </p>

              {mpm?.viscosity && (
                <p>
                  <strong>
                    Viscositeit:
                  </strong>{' '}
                  {mpm.viscosity}
                </p>
              )}

              {mpm &&
                getProductSpecs(mpm) && (
                  <p>
                    <strong>
                      Specificatie:
                    </strong>{' '}
                    {getProductSpecs(mpm)}
                  </p>
                )}

              <span className="status">
                {mpm
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
