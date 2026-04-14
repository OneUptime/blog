# Validation Summary: How to Understand Dapr API Versioning Scheme

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP API versioning
- Dapr gRPC API versioning
- Dapr Configuration resources (Kubernetes)
- Go SDK proto imports

## Sources Consulted
- Dapr official documentation on API versioning: https://docs.dapr.io/operations/support/support-versioning/
- Dapr HTTP API reference: https://docs.dapr.io/reference/api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Publish/Subscribe API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Go SDK and proto package paths: https://github.com/dapr/dapr/tree/master/pkg/proto
- Dapr Configuration resource spec: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### 1. Beta version prefix incorrect in stability table
- **What was wrong:** The "Version Stability Levels" table listed `v1.0` as the prefix for both Stable and Beta APIs. This made it impossible to distinguish between the two levels.
- **What was changed:** Changed the Beta row prefix from `v1.0` to `v1.0-beta1`.
- **Why:** Dapr uses `v1.0-beta1` as the version prefix for beta APIs (e.g., the Workflow API used `v1.0-beta1` after graduating from alpha). Using `v1.0` for beta was incorrect and contradicted the post's own explanation of the versioning scheme.

### 2. Incorrect Go SDK proto import path
- **What was wrong:** The Go import path was `github.com/dapr/go-sdk/dapr/proto/runtime/v1`.
- **What was changed:** Corrected to `github.com/dapr/dapr/pkg/proto/runtime/v1`.
- **Why:** The Dapr proto definitions for the runtime are located in the main `dapr/dapr` repository under `pkg/proto/runtime/v1`, not in the `dapr/go-sdk` repository. The Go SDK provides a high-level client abstraction; developers who need direct proto access import from the main dapr repo.

### 3. Summary text used wrong prefix for beta APIs
- **What was wrong:** The summary stated pre-stable features use `/v1.0-alpha1/` or `/v1.0/`, replicating the table error.
- **What was changed:** Changed `/v1.0/` to `/v1.0-beta1/` in the summary sentence about pre-stable features.
- **Why:** Consistent with the table fix; beta APIs use the `/v1.0-beta1/` prefix, not `/v1.0/`.

## Review Notes
- The Workflow API example uses the `v1.0-alpha1` prefix. In recent Dapr versions (1.13+), the Workflow API graduated to beta (`v1.0-beta1`). The alpha prefix is still valid as an illustrative example of the versioning scheme, but readers working with current Dapr versions should use the beta endpoint.
- The post correctly describes the metadata endpoint, stable API guarantees, and the Configuration resource for enabling alpha features.
- The gRPC proto package naming convention (`dapr.proto.runtime.v1` and `dapr.proto.runtime.v1alpha1`) is accurate.
