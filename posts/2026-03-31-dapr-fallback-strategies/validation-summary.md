# Validation Summary: How to Implement Fallback Strategies with Dapr Resiliency

## Status
validated

## Post Type
Tutorial / Pattern Guide

## Technologies Covered
- Dapr (runtime and resiliency policies)
- Dapr Python SDK (`dapr-client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Resiliency YAML spec (circuit breakers)

## Sources Consulted
- Dapr Python SDK source and API reference — https://github.com/dapr/python-sdk
- Dapr JavaScript SDK source and API reference — https://github.com/dapr/js-sdk
- Dapr Go SDK source — https://github.com/dapr/go-sdk
- Dapr Resiliency documentation — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency policy spec — https://docs.dapr.io/operations/resiliency/policies/

## Issues Found

1. **JavaScript SDK `invoker.invoke()` parameter order was wrong.** The blog passed `(appId, methodName, data, { method: 'GET' })` but the correct signature is `(appId, methodName, HttpMethod.GET)` where the HTTP method is the third positional argument, not a property in an options object. Also added the missing `HttpMethod` import from `@dapr/dapr`. Fixed both `getAppConfig()` and `getRecommendations()` calls.

2. **Go code missing `"fmt"` import.** The `processPayment` function used `fmt.Errorf()` but the import block did not include `"fmt"`. Added the missing import.

3. **Resiliency YAML `trip` field used invalid syntax.** `trip: consecutiveFailures(3)` is not valid — Dapr uses a comparison expression, not a function-call syntax. Changed to `trip: consecutiveFailures > 3`.

## Review Notes
- The Python SDK code (Pattern 1) and the Python graceful degradation code (Pattern 4) are correct.
- The Go code uses a helper function `invokeService()` and types `Payment`/`PaymentResult` that are not defined in the snippet — this is acceptable for a pattern demonstration.
- The post correctly states that Dapr does not provide built-in fallback callbacks, which is accurate — fallback logic must be implemented in application code.
- Pattern 4 modifies `self.features["fraud_detection"]` in-place, which permanently disables fraud detection for the instance after a single failure. This is a design choice the author made intentionally to illustrate the pattern, but readers should be aware it may be too aggressive for production use. A time-based re-enable would be more robust.
