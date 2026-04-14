# Validation Summary: How to Use Dapr Resiliency for Database Connection Failures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Resiliency (retry, timeout, circuit breaker policies)
- Dapr State Store API (state.postgresql v1)
- PostgreSQL (as a Dapr state store backend)
- Dapr Go SDK (github.com/dapr/go-sdk/client)
- Kubernetes (kubectl for deployment and testing)

## Sources Consulted
- Dapr PostgreSQL State Store v1 reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr Resiliency Overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Targets — https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Spec Schema — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit Breaker Policies — https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Go SDK source (Client interface, StateItem, SaveState) — https://github.com/dapr/go-sdk
- Dapr components-contrib PostgreSQL metadata source — https://github.com/dapr/components-contrib/blob/main/common/authentication/postgresql/metadata.go

## Issues Found
1. **Invalid metadata field `maxIdleConns`** — Changed to `maxConns`. The Dapr PostgreSQL state store component does not have a `maxIdleConns` metadata field. The correct field for controlling maximum pooled connections is `maxConns` (maps to pgxpool `MaxConns`). There is no separate "max idle connections" concept in pgxpool.

2. **Invalid metadata field `connMaxIdleTime`** — Changed to `connectionMaxIdleTime`. The correct Dapr metadata field name is `connectionMaxIdleTime` (maps to pgxpool `MaxConnIdleTime`). The field `connMaxIdleTime` is not recognized by the component.

3. **Missing `outbound` wrapper in resiliency component target** — Added `outbound:` wrapper under the `statestore` component target. Dapr resiliency component targets require an `outbound` and/or `inbound` direction specifier. For state store operations (app calling into the component), `outbound` is the correct direction.

## Review Notes
- The Go SDK code examples are correct. `GetState` returns `(*StateItem, error)` and `SaveState` accepts `(ctx, storeName, key, data, meta, ...StateOption)` — both match the current Dapr Go SDK Client interface.
- The circuit breaker `trip` expression uses `consecutiveFailures >= 3` which is valid CEL syntax. The official docs typically show `>` (e.g., `consecutiveFailures > 5`), but `>=` works correctly.
- The exponential retry policy omits the optional `duration` field (initial backoff interval), which means Dapr will use its default. This is acceptable but could be mentioned for completeness.
- The `state.postgresql` component type with `version: v1` is current and valid.
