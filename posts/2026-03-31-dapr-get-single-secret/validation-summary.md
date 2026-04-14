# Validation Summary: How to Get a Single Secret from a Dapr Secret Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — Secrets building block
- Dapr HTTP Secrets API (v1.0)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- AWS Secrets Manager (as a Dapr secret store backend)
- Kubernetes Secrets (referenced for multi-key secret explanation)

## Sources Consulted
- Dapr Secrets API Reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Go SDK documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK guide: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr AWS Secrets Manager component source (components-contrib): metadata key constants for `version_id` and `version_stage`
- Dapr Secrets overview: https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/

## Issues Found

### Issue 1: Missing `fmt` import in Go example
- **What was wrong:** The Go code example in "Retrieving in Go" used `fmt.Errorf` on two lines but did not include `"fmt"` in the import block.
- **What was changed:** Added `"fmt"` to the import list.
- **Why:** Without the `fmt` import, the Go code would not compile.

### Issue 2: Incorrect AWS Secrets Manager metadata key (3 occurrences)
- **What was wrong:** The metadata key for AWS Secrets Manager version retrieval was written as `versionId` (camelCase) in both the curl examples and the Go SDK example.
- **What was changed:** Replaced `versionId` with `version_id` (snake_case) in:
  1. The first curl example (`?metadata.version_id=AWSPREVIOUS`)
  2. The second curl example (`?metadata.version_id=abc123`)
  3. The Go metadata map key (`"version_id": "AWSPREVIOUS"`)
- **Why:** The Dapr AWS Secrets Manager component uses `version_id` (snake_case) as the metadata key, not `versionId` (camelCase). Using the wrong key would silently ignore the version parameter and return the current/default version instead.

## Review Notes
- The `"log"` package is imported in the Go example but unused within that specific function (it is only used in the separate error-handling snippet). This is acceptable since these are illustrative snippets, not standalone compilable programs.
- The Node.js `DaprClient` constructor omits `daprHost`, which is fine since the SDK defaults to `127.0.0.1`. This is a reasonable simplification for a tutorial.
- The caching example uses `sync.Map` without showing the full import block, which is acceptable for a code snippet demonstrating a pattern.
