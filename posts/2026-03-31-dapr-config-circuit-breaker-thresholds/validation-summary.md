# Validation Summary: How to Use Dapr Configuration for Circuit Breaker Thresholds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API (configuration.redis component)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Redis (as Dapr configuration store backend)
- sony/gobreaker circuit breaker library (`github.com/sony/gobreaker`)
- Go

## Sources Consulted
- Dapr Go SDK source code — `github.com/dapr/go-sdk/client/configuration.go` (Client interface, `GetConfigurationItems`, `SubscribeConfigurationItems`, `UnsubscribeConfigurationItems`, `ConfigurationHandleFunction` type)
- Dapr Configuration API documentation — https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr Redis Configuration Store component spec — https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- sony/gobreaker source code — `github.com/sony/gobreaker` (`Settings` struct fields, `Counts` struct, `MaxRequests` semantics)

## Issues Found

### Issue 1: `SubscribeConfigurationItems` return type used incorrectly
- **What was wrong:** The code assigned the return value to `sub` and called `defer sub.Close()`. However, `SubscribeConfigurationItems` returns `(string, error)` — a subscription ID string, not a closeable object. `sub.Close()` would not compile.
- **What was changed:** Replaced `sub, err :=` with `_, err :=` and replaced `defer sub.Close()` with a comment explaining that canceling the context unsubscribes the client, which is the recommended approach per the Dapr Go SDK.

### Issue 2: `MaxRequests` set to failure threshold instead of half-open max calls
- **What was wrong:** `gobreaker.Settings.MaxRequests` was set to `uint32(failThreshold)` (the failure threshold). However, `MaxRequests` controls the maximum number of requests allowed through when the circuit breaker is in the half-open state — it is not a failure threshold. The failure threshold is correctly handled by `ReadyToTrip`. The `cb-half-open-max-calls` config key was seeded in Redis but never used.
- **What was changed:** Added parsing of `cb-half-open-max-calls` from `cbConfig` and set `MaxRequests: uint32(halfOpenMax)`.

### Issue 3: `cb-half-open-max-calls` missing from subscription watch list
- **What was wrong:** The `watchCBConfig` function subscribed to changes for only 3 keys (`cb-failure-threshold`, `cb-success-threshold`, `cb-timeout-ms`), but omitted `cb-half-open-max-calls`. Since that key is now used in `reloadCircuitBreaker()`, changes to it would not trigger a reconfiguration.
- **What was changed:** Added `"cb-half-open-max-calls"` to the `keys` slice in `watchCBConfig`.

## Review Notes
- The `cb-success-threshold` key is seeded in Redis and watched for updates, but never actually used in `reloadCircuitBreaker()`. This is not technically wrong (it could be used by a more advanced ReadyToTrip function), but readers may wonder why it exists. A future revision could either use it or remove it for clarity.
- The `reloadCircuitBreaker()` function creates a new `CircuitBreaker` instance each time, but the returned value is not stored anywhere visible in the code. In a real application, the caller would need to swap the active breaker reference atomically. This is acceptable for a tutorial-level example but worth noting.
- Error handling on `strconv.Atoi` calls is silently ignored (using `_`). In production code, invalid config values would silently default to 0, which could cause unexpected behavior (e.g., `MaxRequests: 0` means gobreaker allows only 1 request in half-open state).
