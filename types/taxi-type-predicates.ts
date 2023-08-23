export const isTaxiAssetType = (value: unknown): value is TaxiAssetType => {
  if (typeof value !== 'string') {
    return false
  }
  const validTypes = ['taxi-registry-standard', 'taxi-registry-minivan', 'taxi-registry-special-need']
  return validTypes.includes(value)
}

export const isTaxiAssetTypeList = (value: unknown): value is TaxiAssetType[] => {
  if (!Array.isArray(value)) {
    return false
  }
  return value.reduce?.(
    (acc: boolean, curr: string) => acc && isTaxiAssetType(curr)
    , true
  )
}
