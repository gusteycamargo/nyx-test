import { AsyncLocalStorage } from 'node:async_hooks'
import { createArtifacts, FlowArtifacts } from './artifacts.js'
import { run } from './run.js'
import path from 'node:path'
import { expect, it as vitestIt } from 'vitest'
import { randomUUID } from 'node:crypto'

interface TestStore {
  name: string
  artifacts: FlowArtifacts
  sessionId: string
}

const storage = new AsyncLocalStorage<TestStore>()

function withLifecycle(name: string, fn: (...args: unknown[]) => unknown) {
  const testPath = expect.getState().testPath
  const fileName = testPath ? path.basename(testPath) : 'unknown'

  const artifacts = createArtifacts(fileName)
  const sessionId = randomUUID()

  return async (...args: unknown[]) => {
    return storage.run({ name, artifacts, sessionId }, async () => {
      run('record start', {
        args: [artifacts.videoPath],
      })

      try {
        return await fn(...args)
      } finally {
        run('record stop')
        run('close')
      }
    })
  }
}

function wrapTestCallback(args: unknown[]) {
  if (!args.length) return args

  const callbackIndex = args.length - 1
  const callback = args[callbackIndex]

  if (typeof callback !== 'function') return args

  const nameCandidate = args[0]
  const hasTestName =
    typeof nameCandidate === 'string' || typeof nameCandidate === 'function'

  if (!hasTestName) return args

  const testName =
    typeof nameCandidate === 'string'
      ? nameCandidate
      : nameCandidate?.name || 'unknown'

  const wrappedArgs = [...args]
  wrappedArgs[callbackIndex] = withLifecycle(
    testName,
    callback as (...fnArgs: unknown[]) => unknown,
  )

  return wrappedArgs
}

const proxyCache = new WeakMap<object, unknown>()

function proxify<T>(value: T): T {
  if (typeof value !== 'function') return value

  const cached = proxyCache.get(value as object)
  if (cached) return cached as T

  const proxy = new Proxy(value, {
    apply(target, thisArg, argArray: unknown[] = []) {
      const wrappedArgs = wrapTestCallback(argArray)
      const result = Reflect.apply(target, thisArg ?? target, wrappedArgs)
      return proxify(result)
    },
    get(target, prop, receiver) {
      const nested = Reflect.get(target, prop, receiver)
      return proxify(nested)
    },
  })

  proxyCache.set(value as object, proxy)
  return proxy as T
}

export const it = proxify(vitestIt) as typeof vitestIt

export function getTestName() {
  const store = storage.getStore()

  if (!store) throw new Error('Test name not found')

  return store.name
}

export function getTestArtifacts() {
  const store = storage.getStore()

  if (!store) throw new Error('Test artifacts not found')

  return store.artifacts
}

export function getTestSessionId() {
  const store = storage.getStore()
  if (!store) throw new Error('Test session not found')
  return store.sessionId
}
