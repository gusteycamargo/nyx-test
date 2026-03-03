import { expect } from 'vitest'
import { run } from './run.js'

function normalizeSnapshot(raw: string) {
  return raw
    .replace(/\[ref=e\d+\]/g, '')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:-]+(?:\.\d+)?Z?/g, '<TIMESTAMP>')
    .replace(/[a-f0-9]{8}-[a-f0-9-]{27}/gi, '<UUID>')
    .trim()
}

export function matchSnapshot() {
  const content = run('snapshot -i')

  if (!content) throw new Error('Cannot match snapshot. Snapshot not found')

  expect(normalizeSnapshot(content)).toMatchSnapshot()

  return content
}
