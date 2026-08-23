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
        product: 'Nog te koppelen',
        status: 'pending'
      },

      ok: {
        product: 'Nog te koppelen',
        status: 'pending'
      },

      mpm: {
        product: 'Nog te koppelen',
        status: 'pending'
      }
    }
  }
]

export function findOilMatch(vehicle) {
  if (!vehicle) return null

  return oilMatches.find((item) => {
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
}
