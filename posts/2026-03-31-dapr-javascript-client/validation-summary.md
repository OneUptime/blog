# Validation Summary: How to Use Dapr JavaScript Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js
- State management API
- Pub/Sub API
- Service Invocation API
- Secrets API
- Configuration API
- Distributed Lock API

## Sources Consulted
- Dapr JavaScript SDK source code: https://github.com/dapr/js-sdk (main branch, v3.6.x)
- Dapr JS SDK type definitions: `src/types/DaprClientOptions.ts`, `src/types/lock/LockResponse.ts`, `src/types/lock/UnlockResponse.ts`
- Dapr JS SDK client interfaces: `IClientState`, `IClientPubSub`, `IClientInvoker`, `IClientSecret`, `IClientConfiguration`, `IClientLock`
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/js/

## Issues Found

### Issue 1: Configuration API — incorrect unsubscribe pattern
- **What was wrong:** The post showed `subscribeWithKeys` returning `{ subscriptionId }` and then calling `client.configuration.unsubscribe("configstore", subscriptionId)`. The `unsubscribe()` method does not exist on the configuration client.
- **What was changed:** Updated to show the correct pattern: `subscribeWithKeys` returns a stream object, and you call `stream.stop()` to unsubscribe.
- **Why:** The actual return type of `subscribeWithKeys` is `Promise<SubscribeConfigurationStream>` which has a `stop()` method. There is no `unsubscribe` method on `IClientConfiguration`.

### Issue 2: Distributed Lock — incorrect method names
- **What was wrong:** The post used `client.lock.acquire()` and `client.lock.release()`. The actual method names in the SDK are `client.lock.lock()` and `client.lock.unlock()`.
- **What was changed:** Renamed `acquire` to `lock` and `release` to `unlock`.
- **Why:** The `IClientLock` interface defines `lock()` and `unlock()`, not `acquire()` and `release()`.

### Issue 3: Distributed Lock — incorrect return type and LockStatus usage
- **What was wrong:** The post checked `lockResponse.status === LockStatus.Success` and imported `LockStatus` from `@dapr/dapr`. The `lock()` method returns `{ success: boolean }`, not `{ status: LockStatus }`. Additionally, `LockStatus` is not part of the package's public exports.
- **What was changed:** Removed the `LockStatus` import and changed the check to `lockResponse.success`.
- **Why:** The `LockResponse` type is `{ success: boolean }`. `LockStatus` is only used internally for `UnlockResponse` and is not exported from the package index.

## Review Notes
- Configuration subscription (`subscribeWithKeys`) only works with the gRPC communication protocol. The HTTP client throws `HTTPNotSupportedError` for subscribe operations. The post does not mention this limitation, which could confuse readers using the default HTTP transport. A future revision could add a note about this.
- The `daprHost` default in the SDK is `127.0.0.1` (without protocol prefix), while the post uses `"http://localhost"`. The SDK handles both forms, so this works in practice but differs from the documented default.
