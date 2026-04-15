# Validation Summary: How to Implement Backend for Frontend (BFF) with Dapr

## Status
validated

## Post Type
Tutorial / Architectural Pattern Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — service invocation building block
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Go (Golang) — standard library `net/http`, `encoding/json`, concurrency patterns
- Backend for Frontend (BFF) architectural pattern

## Sources Consulted
- Dapr Go SDK client interface: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK repository: https://github.com/dapr/go-sdk
- Dapr service invocation documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr breaking changes and deprecations: https://docs.dapr.io/operations/support/breaking-changes-and-deprecations/
- Go standard library `net/http` documentation (for `r.PathValue` — Go 1.22+)
- Go built-in `min` function (Go 1.21+)

## Issues Found
1. **Web BFF incomplete response assembly** (lines 144-148): The `handleDashboard` function fetched results from 6 microservices (user, orders, promotions, analytics, recommendations, notifications) but only unmarshaled 3 of them (user, orders, recommendations) into the `WebDashboardResponse` struct. The `Promotions`, `Analytics`, and `Notifications` fields would always be zero-valued in the JSON response. Fixed by adding the missing three `json.Unmarshal` calls for promotions, analytics, and notifications.

## Review Notes
- The `InvokeMethod` API signature `(ctx, appID, methodName, verb) -> ([]byte, error)` is confirmed correct for the current Dapr Go SDK (v1.8+).
- The code uses `r.PathValue("id")` (Go 1.22+) and the built-in `min()` function (Go 1.21+), which require Go 1.22 or later. This is not stated in the post but is reasonable for new code written in 2026.
- Error handling is minimal throughout (errors from `InvokeMethod` and `json.Unmarshal` are silently ignored). This is acceptable for a tutorial focused on the BFF pattern, but production code should handle these errors.
- As of Dapr v1.9.0+, `InvokeMethod` no longer provides a default `application/json` content-type header. For GET requests (as used throughout this post), this is not an issue since there is no request body.
