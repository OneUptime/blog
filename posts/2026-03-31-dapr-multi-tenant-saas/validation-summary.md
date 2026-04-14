# Validation Summary: How to Build a Multi-Tenant SaaS Application with Dapr

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — state management, pub/sub, secrets, component scoping
- Go (standard library `net/http`, `context`, `encoding/json`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`, `github.com/dapr/go-sdk/service/common`)
- Kubernetes (namespace isolation, component deployment)
- Redis (as Dapr state store backend)

## Sources Consulted
- Dapr component schema specification — `scopes` is a top-level field on the Component CRD, not nested under `spec` (https://docs.dapr.io/operations/components/component-scopes/)
- Dapr Go SDK client interface — `SaveState`, `GetState`, `PublishEvent`, `GetSecret` method signatures (https://docs.dapr.io/developing-applications/sdks/go/go-client/)
- Dapr state management building block — key-prefixed isolation patterns (https://docs.dapr.io/developing-applications/building-blocks/state-management/)
- Dapr secrets building block — `GetSecret` returns `map[string]string` (https://docs.dapr.io/developing-applications/building-blocks/secrets/)
- Dapr pub/sub building block — programmatic subscriptions via `common.Subscription` (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Go standard library — `context.WithValue` key pattern using unexported struct type (https://pkg.go.dev/context)

## Issues Found
1. **Component YAML `scopes` field incorrectly nested under `spec`**: In both the enterprise and standard tier component definitions, the `scopes` field was indented as a child of `spec`. In the Dapr Component CRD, `scopes` is a top-level field (sibling of `apiVersion`, `kind`, `metadata`, and `spec`). When placed under `spec`, Dapr silently ignores it, which means component scoping — a critical security feature for tenant isolation — would not be enforced. Fixed by moving `scopes` to the root level in both component blocks.

## Review Notes
- The Go code snippets are illustrative fragments (not full compilable programs) which is appropriate for a tutorial. Missing imports (`fmt`, `encoding/json`, `time`, Dapr SDK packages) are expected in this context.
- The `record["id"].(string)` type assertion in the API handler would panic if `id` is missing or not a string. This is acceptable for a blog example but would need guarding in production code.
- The `data any` type parameter in `publishTenantEvent` uses the Go 1.18+ `any` alias, which is current and correct.
- The `common.Subscription` struct for programmatic pub/sub subscription is correct for the Dapr Go SDK.
