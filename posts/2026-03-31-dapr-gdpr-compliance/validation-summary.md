# Validation Summary: How to Implement GDPR Compliance with Dapr

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — state management, pub/sub, configuration CRDs
- Go (Dapr Go SDK — `github.com/dapr/go-sdk/client`)
- Python (Dapr Python SDK — `dapr` package)
- Kubernetes (CRD manifests for Subscription and Configuration)
- GDPR concepts (erasure, consent, data portability, audit logging)

## Sources Consulted
- Dapr Go SDK source code — `github.com/dapr/go-sdk` (`client/client.go`, `client/state.go`, `client/pubsub.go`)
- Dapr Python SDK source code — `github.com/dapr/python-sdk` (`dapr/clients/__init__.py`, `dapr/clients/grpc/client.py`, `dapr/clients/grpc/_response.py`)
- Dapr core source code — `github.com/dapr/dapr` (`pkg/apis/subscriptions/v1alpha1/types.go`, `pkg/apis/configuration/v1alpha1/types.go`)
- Dapr official documentation for State TTL, Subscription CRDs, and Configuration CRDs

## Issues Found
1. **Subscription CRD `scopes` placement (YAML):** The `scopes` field was incorrectly nested inside `spec`. In the Dapr Subscription CRD (`v1alpha1`), `scopes` is a top-level field on the Subscription resource, sibling to `spec`, not a child of it. The Go struct definition confirms: `Scopes []string \`json:"scopes,omitempty"\`` is on the `Subscription` struct, not on `SubscriptionSpec`. Fixed by moving `scopes` and its list items out of the `spec` block to the top level of the resource.

## Review Notes
- All Go SDK API calls (`DeleteState`, `PublishEvent`, `GetBulkState`) match the current Dapr Go SDK interface signatures exactly.
- All Python SDK API calls (`save_state` with `state_metadata`, `get_state` returning `StateResponse` with `.data` as bytes) are correct.
- The `ttlInSeconds` state metadata key and string value format are correct per Dapr documentation.
- The Configuration CRD fields (`spec.logging.apiLogging.enabled`, `spec.tracing.samplingRate`) are verified against source code struct definitions.
- The `pubsubname` field (all lowercase) in the Subscription spec is correct per the JSON struct tag.
- `datetime.now(timezone.utc)` is the modern, non-deprecated way to get UTC time in Python (vs `datetime.utcnow()`).
