export const oilMatches = [
  {
    id: 'audi-a4-18tfsi-88kw-cdha',

    match: {
      merk: 'AUDI',
      handelsbenamingContains: 'A4',
      brandstofContains: 'Benzine',
      cilinderinhoud: 1798,
      vermogenKw: 88
    },

    engine: {
      naam: '1.8 TFSI',
      motorcode: 'CDHA',
      vermogenKw: 88,
      vermogenPk: 120
    },

    oil: {
      oemSpecificaties: [
        'VW 502 00',
        'VW 504 00'
      ],

      viscositeiten: [
        '5W-30',
        '5W-40'
      ],

      shell: {
        product: 'Shell Helix Ultra Professional AV-L 5W-30',
        viscositeit: '5W-30',
        specificatie: 'VW 504 00 / 507 00',
        status: 'matched'
      },

      ok: {
        product: 'Nog te koppelen',
        viscositeit: null,
        specificatie: null,
        status: 'pending'
      },

      mpm: {
        product: 'MPM Motor Oil 5W-30 Premium Synthetic ESP-X',
        viscositeit: '5W-30',
        specificatie: 'VW 504 00 / 507 00',
        status: 'matched'
      }
    }
  }
]

export function findOilMatch(vehicle) {
  if (!vehicle) return null

  return (
    oilMatches.find((item) => {
      const m = item.match

      if (
        m.merk &&
        vehicle.merk?.toUpperCase() !== m.merk.toUpperCase()
      ) {
        return false
      }

      if (
        m.handelsbenamingContains &&
        !vehicle.handelsbenaming
          ?.toUpperCase()
          .includes(m.handelsbenamingContains.toUpperCase())
      ) {
        return false
      }

      if (
        m.brandstofContains &&
        !vehicle.brandstof
          ?.toUpperCase()
          .includes(m.brandstofContains.toUpperCase())
      ) {
        return false
      }

      if (
        m.cilinderinhoud &&
        Number(vehicle.cilinderinhoud) !== m.cilinderinhoud
      ) {
        return false
      }

      if (
        m.vermogenKw &&
        Number(vehicle.vermogenKw) !== m.vermogenKw
      ) {
        return false
      }

      return true
    }) || null
  )
}
