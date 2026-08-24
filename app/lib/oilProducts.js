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

  /*
    ============================================
    SHELL
    ============================================
  */

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra 5W-30',
    viscosity: '5W-30',
    specs: [
      'VW 502 00',
      'VW 505 00',
      'BMW LL-01',
      'MB 229.5',
      'MB 226.5',
      'Renault RN0700',
      'Renault RN0710'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra 5W-40',
    viscosity: '5W-40',
    specs: [
      'VW 502 00',
      'VW 505 00',
      'BMW LL-01',
      'MB 229.5',
      'MB 226.5',
      'Porsche A40',
      'Renault RN0700',
      'Renault RN0710',
      'PSA B71 2296'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra Professional AR-L 5W-30',
    viscosity: '5W-30',
    specs: [
      'Renault RN0720',
      'ACEA C4'
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
    brand: 'Shell',
    product: 'Shell Helix Ultra ECT 5W-30',
    viscosity: '5W-30',
    specs: [
      'VW 504 00',
      'VW 507 00',
      'BMW LL-04',
      'MB 229.51',
      'Porsche C30'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra ECT C3 5W-30',
    viscosity: '5W-30',
    specs: [
      'BMW LL-04',
      'MB 229.31',
      'MB 229.51',
      'GM DEXOS2'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra Professional AM-L 5W-30',
    viscosity: '5W-30',
    specs: [
      'BMW LL-04',
      'MB 229.51'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra Professional AP-L 5W-30',
    viscosity: '5W-30',
    specs: [
      'PSA B71 2290',
      'FIAT 9.55535-S1'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra Professional AF 5W-30',
    viscosity: '5W-30',
    specs: [
      'FORD WSS-M2C913-C',
      'JLR STJLR.03.5003'
    ]
  },

  {
    brand: 'Shell',
    product: 'Shell Helix Ultra Professional AF-L 5W-30',
    viscosity: '5W-30',
    specs: [
      'FORD WSS-M2C934-B',
      'JLR STJLR.03.5005'
    ]
  },

  /*
    ============================================
    OK OLIE
    ============================================
  */

  {
    brand: 'OK Olie',
    product: 'OK 1016 X Long Life 5W-30',
    viscosity: '5W-30',
    specs: [
      'VW 504 00',
      'VW 507 00',
      'BMW LL-04',
      'MB 229.31',
      'MB 229.51',
      'MB 229.52',
      'Porsche C30'
    ]
  },

  {
    brand: 'OK Olie',
    product: 'OK 1025 V-LL 0W-30',
    viscosity: '0W-30',
    specs: [
      'VW 504 00',
      'VW 507 00',
      'BMW LL-04',
      'MB 229.31',
      'MB 229.51',
      'MB 229.52',
      'Porsche C30'
    ]
  },

  /*
    Nog geen OK-product toegevoegd voor
    RN0710 of RN0720 zolang we dat niet
    betrouwbaar uit officiële OK-data hebben.
  */

  /*
    ============================================
    MPM
    ============================================
  */

  {
    brand: 'MPM',
    product: 'MPM Motor Oil 5W-30 Premium Synthetic C4 Renault',
    viscosity: '5W-30',
    specs: [
      'Renault RN0720',
      'ACEA C4',
      'MB 226.51',
      'FIAT 9.55535-S4'
    ]
  },

  {
    brand: 'MPM',
    product: 'MPM Motor Oil 5W-40 Premium Synthetic',
    viscosity: '5W-40',
    specs: [
      'VW 502 00',
      'VW 505 00',
      'BMW LL-01',
      'MB 229.3',
      'GM-LL-B-025',
      'PSA B71 2296',
      'Porsche A40',
      'Renault RN0700',
      'Renault RN0710'
    ]
  },

  {
    brand: 'MPM',
    product: 'MPM Motor Oil 5W-30 Premium Synthetic ESP-X',
    viscosity: '5W-30',
    specs: [
      'VW 504 00',
      'VW 507 00',
      'BMW LL-04',
      'MB 229.51',
      'MB 229.52',
      'OPEL OV 040 1547 D30',
      'OPEL OV 040 1547 G30',
      'Porsche C30',
      'Renault RN0700',
      'Renault RN0710',
      'FIAT 9.55535-S3'
    ]
  },

  {
    brand: 'MPM',
    product: 'MPM Motor Oil 5W-30 Premium Synthetic ST',
    viscosity: '5W-30',
    specs: [
      'PSA B71 2290',
      'PSA B71 2297',
      'STELLANTIS FPW9.55535/03'
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
      ) ===
      wantedViscosity
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
        item.brand.toUpperCase() ===
        String(brand).toUpperCase()
    ) || null
  )
}
