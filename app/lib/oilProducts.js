function normalizeSpec(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeViscosity(value = '') {
  return String(value)
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim()
}

export const oilProducts = [
  {
    brand: 'Shell',
    product: 'Shell Helix Ultra 5W-30',
    viscosity: '5W-30',
    specs: [
      'VW 502 00',
      'VW 505 00'
    ]
  },

  {
    brand: 'MPM',
    product: 'MPM Motor Oil 5W-30 Premium Synthetic BMW / MB',
    viscosity: '5W-30',
    specs: [
      'VW 502 00',
      'VW 505 00'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra Professional AV-L 5W-30',
    viscosity: '5W-30',
    specs: [
      'VW 504 00',
      'VW 507 00'
    ]
  },

  {
    brand: 'OK Olie',
    product: 'OK 1016 X Long Life 5W-30',
    viscosity: '5W-30',
    specs: [
      'VW 504 00',
      'VW 507 00'
    ]
  }
]

export function findProductsForOil({
  oemSpec,
  viscosity
}) {
  if (!oemSpec) {
    return []
  }

  const wantedSpec =
    normalizeSpec(oemSpec)

  const wantedViscosity =
    normalizeViscosity(viscosity)

  return oilProducts.filter((item) => {
    const specMatch =
      item.specs.some(
        (spec) =>
          normalizeSpec(spec) ===
          wantedSpec
      )

    if (!specMatch) {
      return false
    }

    if (!wantedViscosity) {
      return true
    }

    return (
      normalizeViscosity(
        item.viscosity
      ) === wantedViscosity
    )
  })
}

export function findProductByBrand({
  oemSpec,
  viscosity,
  brand
}) {
  const products =
    findProductsForOil({
      oemSpec,
      viscosity
    })

  return (
    products.find(
      (item) =>
        item.brand
          .toUpperCase() ===
        String(brand)
          .toUpperCase()
    ) || null
  )
}
