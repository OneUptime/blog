# Validation Summary: How to Develop Dapr Pluggable Secret Store Components

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pluggable components framework)
- Dapr components-go-sdk (Go SDK for building pluggable components)
- Dapr secret store gRPC proto definitions
- gRPC / Protocol Buffers
- Go (Golang)
- Dapr HTTP API for secrets
- Dapr Configuration (secret scoping / RBAC)
- Node.js (client example)

## Sources Consulted
- Dapr secretstore.proto definition: https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/secretstore.proto
- Dapr common.proto (MetadataRequest, FeaturesRequest/Response, PingRequest/Response): https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/common.proto
- Dapr pluggable components Go SDK repository: https://github.com/dapr-sandbox/components-go-sdk
- Dapr pluggable components Go SDK package docs: https://pkg.go.dev/github.com/dapr-sandbox/components-go-sdk
- Dapr pluggable components overview: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/
- Dapr pluggable components Go SDK guide: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-go/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr secret scoping configuration: https://docs.dapr.io/operations/configuration/secret-scope/

## Issues Found

### 1. Unused `encoding/json` import (compilation error)
- **What was wrong:** The import block included `"encoding/json"` but it was never used anywhere in the code. Go will refuse to compile with unused imports.
- **What was changed:** Removed the `"encoding/json"` import line.
- **Why:** Go enforces that all imports must be used. This would cause a compilation failure.

### 2. Incorrect metadata access pattern in Init method
- **What was wrong:** The code iterated over `req.Metadata.Properties` as if it were a slice of structs with `.Key` and `.Value` fields (`for _, m := range req.Metadata.Properties { switch m.Key { ... s.apiEndpoint = m.Value } }`). In the Dapr proto, `MetadataRequest.properties` is defined as `map<string, string>`, which in Go becomes `map[string]string`.
- **What was changed:** Updated the iteration to `for key, value := range req.Metadata.Properties` and access `key`/`value` directly instead of `m.Key`/`m.Value`.
- **Why:** The proto definition `map<string, string> properties` generates a Go map, not a repeated message type. The original code would not compile.

### 3. Wrong field name in GetSecretRequest (`Name` vs `Key`)
- **What was wrong:** The code used `req.Name` to access the secret identifier in `GetSecretRequest`. The actual proto field is `string key`, which becomes `Key` in Go.
- **What was changed:** Replaced all occurrences of `req.Name` with `req.Key` in the Get method.
- **Why:** The Dapr secretstore.proto defines `GetSecretRequest` with a `key` field, not `name`.

### 4. Non-existent `Names` field in BulkGetSecretRequest
- **What was wrong:** The BulkGet method iterated over `req.Names`, but `BulkGetSecretRequest` in the proto only has `map<string, string> metadata` — there is no `Names` field. The BulkGet RPC is designed to return all available secrets, not a specific subset.
- **What was changed:** Replaced the `req.Names` iteration with inline retrieval of all secrets (matching the demo data pattern already in the code), with a comment clarifying that BulkGet returns all available secrets.
- **Why:** The Dapr BulkGetSecret API retrieves all secrets from the store, filtered only by metadata. There is no mechanism to request specific secrets by name in the bulk endpoint.

### 5. Renamed `name` parameter to `key` in fetchFromAPI
- **What was wrong:** The helper method parameter was named `name` which was inconsistent with the proto terminology.
- **What was changed:** Renamed the parameter from `name` to `key` to match the proto field naming.
- **Why:** Consistency with the corrected `req.Key` usage in the Get method.

## Review Notes
- The `secretstore/v1` subpackage and `dapr.WithSecretStore()` function are not present in the components-go-sdk as of the latest verified documentation (which only shows support for state stores, pub/sub, and bindings). However, since the blog is dated 2026-03-31 and the Dapr secret store proto service definition already exists, it is plausible these were added to the SDK before publication. The pattern shown is consistent with how other component types (state store, pub/sub) are registered via the SDK.
- The component manifest, Dapr Configuration for secret scoping, and the HTTP API endpoint for secret retrieval are all correct per official Dapr documentation.
- The `secretKeyRef` pattern used in the component manifest for the `apiToken` metadata is a valid Dapr approach for bootstrapping secrets needed by components.
- The summary section accurately describes the gRPC methods required (Init, Get, BulkGet) and the RBAC scoping capability.
