# Validation Summary: How to Get Bulk Secrets from a Dapr Secret Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secrets API (bulk secrets endpoint)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- AWS Secrets Manager (as example backend)
- Go (sync.Once caching pattern)
- Dapr Configuration secret scoping

## Sources Consulted
- Dapr Secrets API Reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr How To - Retrieve a Secret: https://docs.dapr.io/developing-applications/building-blocks/secrets/howto-secrets/
- Dapr Secret Scoping Configuration: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Go SDK package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Python SDK examples: https://github.com/dapr/python-sdk/tree/master/examples/secret_store
- Dapr AWS Secrets Manager component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/

## Issues Found

### 1. Missing `fmt` import in Go code example
**What was wrong:** The Go code used `fmt.Errorf` on line 75 but the import block only included `"context"`, `"log"`, and the Dapr client package. This would cause a compilation error.
**What was changed:** Added `"fmt"` to the import block.

### 2. Incorrect metadata filtering claim for AWS Secrets Manager
**What was wrong:** The post claimed that `?metadata.path=myapp/prod` could be used with AWS Secrets Manager to filter secrets by prefix in the bulk endpoint. AWS Secrets Manager does not support a `metadata.path` parameter. Its supported metadata keys are `version_id` and `version_stage`.
**What was changed:** Rewrote the section to use `metadata.version_stage=AWSCURRENT` as the example and added a note that supported metadata keys vary by backend.

### 3. Incorrect access control YAML structure
**What was wrong:** The post showed `allowedSecrets` as a field directly under a component's `spec:` alongside `type` and `version`. In Dapr, secret scoping with `allowedSecrets` is configured in the Dapr **Configuration** resource under `spec.secrets.scopes`, not in the component definition.
**What was changed:** Replaced the YAML with the correct Dapr Configuration resource format including `apiVersion`, `kind`, `metadata`, and the proper `spec.secrets.scopes` structure. Updated the preceding text from "your component" to "your Dapr configuration".

## Review Notes
- The caching Go snippet uses `sync.Once` and references an undefined `countFields` function. These are acceptable since the snippet is clearly a partial example continuing from the earlier code, not a standalone program.
- The Go SDK's `GetBulkSecret` method signature accepts `(ctx, storeName, metadata)` where metadata is `map[string]string`. Passing `nil` as shown is valid Go.
- The Python SDK usage is correct: `get_bulk_secret(store_name=...)` returns a `GetBulkSecretResponse` object and `.secrets` is the correct attribute to access the map data.
- The HTTP API endpoint, response format, and general technical explanation of the bulk secrets pattern are all accurate.
