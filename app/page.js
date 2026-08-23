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

