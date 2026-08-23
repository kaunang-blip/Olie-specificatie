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
      viscositeit: '5W-30',
      oemSpecificatie: 'VW 502 00',

      shell: {
        product: 'Shell Helix Ultra 5W-30',
        viscositeit: '5W-30',
        specificatie: 'VW 502 00 / 505 00',
        status: 'matched'
      },

      ok: {
        product: 'Nog niet bevestigd',
        viscositeit: null,
        specificatie: 'VW 502 00',
        status: 'pending'
      },

      mpm: {
        product: 'MPM Motor Oil 5W-30 Premium Synthetic BMW / MB',
        viscositeit: '5W-30',
        specificatie: 'VW 502 00 / 505 00',
        status: 'matched'
      }
    }
  }
]

export function findOilMatch(vehicle) {
  if (!vehicle) {
    return null
  }

  return (
    oilMatches.find((item) => {
      const match = item.match

      if (
        match.merk &&
        vehicle.merk?.toUpperCase() !==
          match.merk.toUpperCase()
      ) {
        return false
      }

      if (
        match.handelsbenamingContains &&
        !vehicle.handelsbenaming
          ?.toUpperCase()
          .includes(
            match.handelsbenamingContains.toUpperCase()
          )
      ) {
        return false
      }

      if (
        match.brandstofContains &&
        !vehicle.brandstof
          ?.toUpperCase()
          .includes(
            match.brandstofContains.toUpperCase()
          )
      ) {
        return false
      }

      if (
        match.cilinderinhoud &&
        Number(vehicle.cilinderinhoud) !==
          Number(match.cilinderinhoud)
      ) {
        return false
      }

      if (
        match.vermogenKw &&
        Number(vehicle.vermogenKw) !==
          Number(match.vermogenKw)
      ) {
        return false
      }

      return true
    }) || null
  )
}
