import fs from 'fs'
import Papa from 'papaparse'

export const loadJsonFile = (filePath: string): JSON => {
  const buffer = fs.readFileSync(filePath)
  return JSON.parse(buffer.toString())
}

export const loadCsvFile = <T>(filePath: string): Papa.ParseResult<T> => {
  const buffer = fs.readFileSync(filePath)
  return Papa.parse<T>(buffer.toString(), { header: true, skipEmptyLines: true })
}
