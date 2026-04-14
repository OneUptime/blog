# Validation Summary: How to Use the Dapr Metadata API Reference

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Dapr (sidecar runtime)
- Dapr Metadata API (`/v1.0/metadata`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- curl / jq (CLI tools)

## Sources Consulted
- Dapr official Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr runtime source code (`/pkg/api/http/metadata.go`): https://github.com/dapr/dapr
- Dapr proto definition (`/dapr/proto/runtime/v1/metadata.proto`): https://github.com/dapr/dapr
- Dapr JS SDK metadata interface (`src/interfaces/Client/IClientMetadata.ts`): https://github.com/dapr/js-sdk
- Dapr components-contrib capability constants (`state/feature.go`, `pubsub/feature.go`): https://github.com/dapr/components-contrib

## Issues Found

### 1. Incorrect field name: `activeActorsCount` (renamed in current Dapr)
- **What was wrong:** The sample JSON response used `"activeActorsCount"` as a top-level array field. In current Dapr versions (1.12+), actor information is nested under `"actorRuntime"` which contains `"runtimeStatus"`, `"activeActors"`, `"hostReady"`, and `"placement"` fields. The old `"activeActorsCount"` was never the actual JSON key — the deprecated alias is `"actors"`, and the current structure is `"actorRuntime.activeActors"`.
- **What was changed:** Replaced `"activeActorsCount": [...]` with the full `"actorRuntime"` object containing `runtimeStatus`, `activeActors`, `hostReady`, and `placement` fields.
- **Why:** To match the actual API response structure in current Dapr versions.

### 2. Incorrect field name: `registeredComponents` → `components`
- **What was wrong:** The sample JSON response used `"registeredComponents"` as the field name. The actual JSON serialization key is `"components"` (the Go struct field is named `RegisteredComponents` internally, but the JSON tag is `"components"`).
- **What was changed:** Replaced `"registeredComponents"` with `"components"` in the sample response.
- **Why:** To match the actual JSON field name returned by the API.

### 3. Incorrect subscription structure: `routes.default` → `rules` array
- **What was wrong:** The subscription object used `"routes": {"default": "/orders-handler"}`. The actual structure uses a `"rules"` array where each rule has `"match"` and `"path"` properties. Subscriptions also include `"type"`, `"deadLetterTopic"`, and `"metadata"` fields.
- **What was changed:** Replaced the `routes` object with a proper `rules` array containing `{match, path}` objects, and added the missing `type`, `deadLetterTopic`, and `metadata` fields.
- **Why:** To match the actual subscription structure returned by the metadata endpoint.

### 4. Incorrect jq filter: `.registeredComponents[].name`
- **What was wrong:** Used `.registeredComponents[].name` which would produce no output since the field is actually `"components"`.
- **What was changed:** Changed to `.components[].name`.
- **Why:** To use the correct JSON field name.

### 5. Incorrect jq filter: `.activeActorsCount`
- **What was wrong:** Used `.activeActorsCount` which references a non-existent field.
- **What was changed:** Changed to `.actorRuntime.activeActors`.
- **Why:** To use the correct path to active actor data in current Dapr versions.

## Review Notes
- The `PUT /v1.0/metadata/{attributeName}` endpoint, content type, and usage pattern are correct.
- The JavaScript SDK usage (`client.metadata.set()`) is correct per the `@dapr/dapr` SDK interface.
- The capability strings `ETAG`, `TRANSACTIONAL`, `QUERY_API`, and `TTL` are valid state store capabilities. `SUBSCRIBE_WILDCARDS` is a valid pub/sub capability. The blog correctly associates them with the right component types.
- The `extended` field for custom metadata is correct.
- The `.subscriptions` and `.extended` jq filters are correct.
