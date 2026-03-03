import { run } from './run.js'
import { getTestArtifacts } from './it.js'

interface ScreenshotOptions {
  silentErrors?: boolean
}

export function screenshot(name: string, options: ScreenshotOptions = {}) {
  const artifacts = getTestArtifacts()

  return run('screenshot', {
    args: [artifacts.screenshot(name)],
    silent: options.silentErrors,
  })
}
