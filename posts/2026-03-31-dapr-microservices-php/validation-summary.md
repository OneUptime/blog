# Validation Summary: How to Build Microservices with Dapr and PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- PHP (built-in web server)
- Dapr PHP SDK (`dapr/php-sdk`)
- Dapr State Management API
- Dapr Pub/Sub API
- Dapr Service Invocation
- Dapr CLI

## Sources Consulted
- Dapr PHP SDK source code: https://github.com/dapr/php-sdk (specifically `src/lib/Client/DaprClient.php` for method signatures)
- Dapr CLI reference documentation: https://docs.dapr.io/reference/cli/
- Dapr Pub/Sub subscription specification: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/

## Issues Found

### 1. Incorrect state save method: `trySaveState` should be `saveState`
- **What was wrong:** The post used `$client->trySaveState('statestore', $orderId, $order)` with three arguments. The `trySaveState` method in the Dapr PHP SDK requires a mandatory `$etag` parameter (4th argument) for optimistic concurrency control. For a simple unconditional save, the correct method is `saveState()`.
- **What was changed:** Replaced `trySaveState` with `saveState`.
- **Why:** `trySaveState` is designed for conditional writes using etags. `saveState` is the correct method for unconditional state persistence.

### 2. Non-existent method: `tryGetState` should be `getState`
- **What was wrong:** The post used `$client->tryGetState('statestore', $orderId, 'array')` in two places. The method `tryGetState` does not exist in the Dapr PHP SDK. The correct method is `getState()`, which returns the deserialized value directly.
- **What was changed:** Replaced `tryGetState` with `getState` in both occurrences.
- **Why:** The method simply doesn't exist in the SDK. `getState()` is the correct method name.

### 3. Incorrect return value access: `$state->value` should be `$state` or `$state['status']`
- **What was wrong:** The post accessed `$state->value` (object property syntax) on the return value of the state retrieval. The `getState()` method returns the deserialized value directly (e.g., an array when `'array'` is passed as the type), not a wrapper object with a `value` property.
- **What was changed:** Changed `$state->value ?? ['error' => 'not found']` to `$state ?? ['error' => 'not found']`, and `$state->value['status']` to `$state['status']`.
- **Why:** `getState()` returns the value directly, not a wrapper object. The alternative `getStateAndEtag()` returns an associative array `['value' => ..., 'etag' => ...]`, but would use array syntax `$result['value']`, not object syntax.

## Review Notes
- The post correctly uses the modern `Dapr\Client\DaprClient` namespace (v1.2+), not the deprecated `\Dapr\DaprClient`.
- The `/dapr/subscribe` endpoint format with `pubsubname`, `topic`, and `route` fields is correct for programmatic subscriptions.
- The `dapr run` and `dapr invoke` CLI commands use correct flags and syntax.
- The `publishEvent()` call is correct with the 3-argument form (pubsub name, topic, data), as `metadata` and `contentType` have default values.
- The notification service correctly extracts event data from `$body['data']`, which matches Dapr's CloudEvents envelope format.
