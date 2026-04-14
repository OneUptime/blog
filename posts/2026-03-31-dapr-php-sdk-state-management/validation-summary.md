# Validation Summary: How to Use Dapr PHP SDK for State Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr PHP SDK (`dapr/php-sdk`)
- PHP 8+ (named arguments, attributes)
- Redis (as default state store backend)

## Sources Consulted
- Dapr PHP SDK source code: https://github.com/dapr/php-sdk
- `DaprClient.php` — client method signatures (`saveState`, `getState`, `deleteState`, `getStateAndEtag`, `getBulkState`, `trySaveState`, `tryDeleteState`, `executeStateTransaction`)
- `DaprClientBuilder.php` — builder pattern confirmation
- `StateTransactionRequest.php` — transaction operation format (`::upsert()`, `::delete()` static methods)
- `StateStore.php` attribute — namespace and parameters
- Consistency classes under `Dapr\consistency\` namespace
- Dapr CLI documentation for `dapr run` command flags

## Issues Found

1. **`trySaveState` used without required `etag` parameter (Basic State Operations section)**: The blog called `trySaveState` with only `storeName`, `key`, and `value`, but `trySaveState` requires an `etag` parameter. Changed to `saveState()` which does not require an etag for simple saves.

2. **`tryGetState` does not exist**: The blog used `tryGetState()` which is not a method on `DaprClient`. Changed to `getState()` for the basic example (returns the value directly) and `getStateAndEtag()` for the concurrency example (returns an associative array with `'value'` and `'etag'` keys).

3. **Object property access instead of array access**: The blog used `$state->value` and `$state->etag` to access state results, but the SDK returns associative arrays, not objects. Changed to `$state['value']` and `$state['etag']` access patterns.

4. **`tryDeleteState` used without required `etag` parameter**: Changed to `deleteState()` which does not require an etag for simple deletes.

5. **`tryGetBulkState` does not exist**: Changed to `getBulkState()`. Also removed the `asType` parameter (not supported on bulk operations) and fixed the iteration pattern to use associative array access (`$key => $item` with `$item['value']`).

6. **Wrong transaction operation format**: The blog passed raw arrays with `'operation'` and `'request'` keys to `executeStateTransaction()`. The correct API requires `StateTransactionRequest::upsert()` and `StateTransactionRequest::delete()` objects. Fixed the import from `Dapr\State\TransactionalState` to `Dapr\Client\StateTransactionRequest` and used the proper static factory methods.

7. **Non-existent `concurrency` parameter on `trySaveState`**: The blog passed `concurrency: 'first-write'` as a string. The correct parameter is `consistency` which takes a `Consistency` object. Changed to `consistency: \Dapr\consistency\StrongFirstWrite::instance()`.

8. **Non-existent `AppState` base class**: `Dapr\State\AppState` does not exist in the SDK. State classes are plain PHP classes annotated with the `#[StateStore]` attribute and managed via `StateManager`. Removed the `extends \Dapr\State\AppState`.

9. **Wrong namespace casing for consistency classes**: The blog used `\Dapr\Consistency\EventualLastWrite::class` (capital C) but the correct namespace is `\Dapr\consistency\EventualLastWrite::class` (lowercase c). Fixed the casing.

## Review Notes
- The `TransactionalState` abstract class exists in the SDK and provides a higher-level OOP approach to transactions (with `begin()`/`commit()` semantics), but the blog chose to demonstrate the lower-level `executeStateTransaction` approach, which is also valid.
- The typed state class example shows the attribute usage correctly after fixes, but does not demonstrate how to load/save these objects via `StateManager`. A future revision could add a brief example showing `StateManager->load_object()` and `StateManager->save_object()`.
- The `dapr/php-sdk` package and `dapr run` CLI commands were correct as written.
