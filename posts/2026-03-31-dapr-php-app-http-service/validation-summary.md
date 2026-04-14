# Validation Summary: How to Use Dapr PHP App for HTTP Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr PHP SDK (`dapr/php-sdk`)
- PHP 8+ (typed properties, arrow functions, named arguments)
- PHP built-in web server
- Dapr service invocation building block
- Dapr pub/sub building block
- Dapr state management building block
- Dapr CLI

## Sources Consulted
- Dapr PHP SDK source code: https://github.com/dapr/php-sdk
- `DaprClient.php` abstract class — confirmed method signatures for `saveState`, `getState`, `trySaveState`, `publishEvent`, `invokeMethod`, `getStateAndEtag`
- `AppId.php` — confirmed constructor signature `new AppId(string $id, string $namespace = '')`
- Dapr PHP SDK `DaprClient::invokeMethod()` signature: `invokeMethod(string $httpMethod, AppId $appId, string $methodName, mixed $data = null, array $metadata = []): ResponseInterface`
- Dapr pub/sub subscription API contract (https://docs.dapr.io/) — confirmed `/dapr/subscribe` GET endpoint format
- Dapr CLI documentation — confirmed `dapr invoke` flags (`--app-id`, `--method`, `--verb`, `--data`) and `dapr run` flag deprecation (`--components-path` replaced by `--resources-path` since CLI ~1.13)
- Previously validated Dapr PHP SDK state management post (`posts/2026-03-31-dapr-php-sdk-state-management/validation-summary.md`) — confirmed `trySaveState` requires etag, `tryGetState` does not exist, and `getState` returns value directly

## Issues Found

### 1. `trySaveState` used without required `etag` parameter (line 91)
- **What was wrong:** The code called `$this->dapr->trySaveState('statestore', $orderId, $body)` with only 3 parameters, but `trySaveState` requires an `etag` parameter (4th argument) for optimistic concurrency control.
- **What was changed:** Changed to `$this->dapr->saveState('statestore', $orderId, $body)`, which does not require an etag and is the correct method for simple state saves.
- **Why:** `trySaveState` is designed for optimistic concurrency with etags. For unconditional saves, `saveState` is the correct method.

### 2. `tryGetState` does not exist in the SDK (line 97)
- **What was wrong:** The code called `$this->dapr->tryGetState('statestore', $orderId, 'array')`, but no `tryGetState` method exists on `DaprClient`.
- **What was changed:** Changed to `$this->dapr->getState('statestore', $orderId, 'array')`.
- **Why:** The SDK provides `getState()` for basic retrieval and `getStateAndEtag()` for concurrency-aware retrieval. There is no `tryGetState` method.

### 3. Object property access `$state->value` instead of direct value (line 98)
- **What was wrong:** The code used `$state->value` to access the retrieved state, but `getState()` returns the deserialized value directly (not wrapped in an object).
- **What was changed:** Changed `return $state->value ?? ['error' => 'not found']` to `return $state ?? ['error' => 'not found']`.
- **Why:** When `getState()` is called with `asType: 'array'`, it returns the array value directly, or `null` if the key doesn't exist.

### 4. `invokeMethod` incorrect parameter order and types (lines 164-167)
- **What was wrong:** The code called `$client->invokeMethod('order-php-service', 'orders', 'POST', [...])`, passing `appId` as the first parameter and HTTP method as the third. The actual SDK signature is `invokeMethod(string $httpMethod, AppId $appId, string $methodName, mixed $data, array $metadata)` — the HTTP method comes first, and the app ID must be an `AppId` object, not a string.
- **What was changed:** Fixed to `$client->invokeMethod('POST', new AppId('order-php-service'), 'orders', [...])` and added `use Dapr\Client\AppId;` import.
- **Why:** The SDK's `invokeMethod` requires the HTTP method as the first parameter and an `AppId` instance as the second parameter, per the abstract method signature in `DaprClient.php`.

### 5. Deprecated `--components-path` CLI flag (line 143)
- **What was wrong:** The `dapr run` command used `--components-path`, which was deprecated in Dapr CLI ~1.13.
- **What was changed:** Replaced with `--resources-path`, which is the current recommended flag.
- **Why:** `--components-path` was renamed to `--resources-path` to reflect that the directory can contain both component definitions and other Dapr resources.

## Review Notes
- The custom `Router` class is a reasonable minimal implementation for a tutorial. It only supports exact path matching (no path parameters), which means the `get` method on `OrderHandler` is never wired to a route in `index.php`. This is a gap in the tutorial but not a technical error in the code shown.
- The `publishEvent('pubsub', 'orders', $body)` call is correct per the SDK signature: `publishEvent(string $pubsubName, string $topicName, mixed $data, array $metadata = [], string $contentType = 'application/json')`.
- The `/dapr/subscribe` endpoint correctly returns the subscription array format expected by the Dapr sidecar.
- The `handleUpdate` method correctly returns `['status' => 'SUCCESS']` which is the expected acknowledgment format for Dapr pub/sub messages.
- The `DaprClient::clientBuilder()->build()` instantiation pattern is correct.
- The `dapr invoke` CLI command flags (`--app-id`, `--method`, `--verb`, `--data`) are all correct.
- The `invokeMethod` return type is `ResponseInterface` (PSR-7), so `$response->getBody()` returns a `StreamInterface` which can be echoed directly via its `__toString()` method — this usage is correct.
- The `echo` statement inside `handleUpdate` would send output to the PHP built-in server's stdout, which is fine for debugging but would also be included in the HTTP response body before the JSON. In production, logging should be used instead.
