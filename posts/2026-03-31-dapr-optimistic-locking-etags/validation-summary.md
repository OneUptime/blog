# Validation Summary: How to Implement Optimistic Locking with Dapr ETags

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- Dapr HTTP State API (v1.0)
- Dapr Distributed Lock API (alpha)
- JavaScript (Node.js with Fetch API)
- ETag-based optimistic concurrency control

## Sources Consulted
- Dapr State Management How-To Guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr State API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management Overview (concurrency patterns): https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr Distributed Lock Building Block: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/
- Dapr runtime source code (pkg/api/http/http.go) for ETag mismatch HTTP status confirmation

## Issues Found
1. **Unused DaprClient import and instantiation**: The first code example (`getWithETag` function) imported `DaprClient` from `@dapr/dapr` and created a `const client = new DaprClient()` instance, but neither was used anywhere in the function — it uses the raw Fetch API instead. Removed the two unused lines to avoid misleading readers into thinking the SDK client is needed for this approach.

## Review Notes
- The 409 status code for ETag mismatch is correct in practice (confirmed via Dapr runtime source code), but the official API reference docs only list 204/400/500 as response codes. The docs appear incomplete in this regard — the blog's usage is accurate.
- The Dapr distributed lock API referenced for pessimistic locking is currently in alpha (`v1.0-alpha1` endpoint prefix). The blog refers to it simply as "Dapr lock API" which is acceptable, but readers should be aware it is not yet stable.
- The conceptual Dapr docs use "first-write-wins" and "last-write-wins" as pattern names, while the actual API option values are `"first-write"` and `"last-write"` (no "-wins" suffix). The blog correctly uses the API values in code and the shorter form in descriptions, which is appropriate.
