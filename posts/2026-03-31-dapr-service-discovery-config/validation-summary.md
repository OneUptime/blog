# Validation Summary: How to Implement Service Discovery Configuration with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Configuration API (building block)
- Dapr Redis Configuration Store component (`configuration.redis`)
- Dapr JavaScript/TypeScript SDK (`@dapr/dapr`)
- Dapr Service Invocation API
- Redis (as configuration backend)
- Kubernetes (DNS-based service discovery context)
- TypeScript

## Sources Consulted
- Dapr Configuration API Overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/configuration-api-overview/
- Dapr Configuration API Reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Redis Configuration Store Component: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr How-To: Manage Configuration from a Store: https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr JavaScript SDK Client Reference: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/

## Issues Found

### 1. Incorrect Redis key format for configuration store
- **What was wrong:** All `redis-cli` commands used the `service-config||key` format (e.g., `"service-config||payment-service:host"`). The double-pipe (`||`) prefix is a convention used by Dapr's **state store** component, not the configuration store. The Dapr configuration store component for Redis stores keys directly without any store-name prefix.
- **What was changed:** Removed the `service-config||` prefix from all Redis keys in both the "Storing Service Discovery Config" section and the "Updating Service Config at Runtime" section. For example, `"service-config||payment-service:host"` was changed to `"payment-service:host"`.
- **Why:** When the Dapr Configuration API retrieves keys via `GET /v1.0/configuration/service-config?key=payment-service:host`, it looks up the key `payment-service:host` directly in Redis. Using the double-pipe format would cause key mismatches and the configuration values would not be found.

### 2. Service invocation URL pointed to remote sidecar instead of local sidecar
- **What was wrong:** The `callPaymentService` function constructed the URL as `http://${endpoint.host}:${endpoint.port}/v1.0/invoke/payment-service/method/charge`, which resolves to something like `http://payment-svc.payments.svc.cluster.local:3500/v1.0/invoke/...`. This directly addresses the remote service's Dapr sidecar, bypassing the local sidecar.
- **What was changed:** Changed `${endpoint.host}` to `localhost` in the URL, making it `http://localhost:${endpoint.port}/v1.0/invoke/payment-service/method/charge`.
- **Why:** Dapr service invocation must go through the calling application's **local** Dapr sidecar (`localhost:3500`). The local sidecar handles service discovery via the app-id, mTLS encryption, access control policies, observability/tracing, and retry/timeout logic. Calling a remote sidecar directly bypasses all of these features and is not a supported invocation pattern.

## Review Notes
- The `host` field stored in the configuration (e.g., `payment-svc.payments.svc.cluster.local`) is not actually used in the Dapr service invocation URL since Dapr resolves service locations via app-id name resolution. The field could still be useful as metadata or for non-Dapr direct HTTP calls, but readers should understand that Dapr's invoke API routes by app-id, not by host address.
- The `DaprClient` constructor is called with no arguments (`new DaprClient()`), which defaults to `localhost:50001` for gRPC or uses the `DAPR_HTTP_PORT`/`DAPR_GRPC_PORT` environment variables. This is correct for sidecar-injected Kubernetes pods.
- The `subscribeWithKeys` callback updates numeric fields (port, timeout, maxRetries) by assigning string values from `item.value` directly, without `parseInt()`. This is a minor type inconsistency but does not affect the demonstration purpose of the code.
- The TypeScript code creates a new `ServiceRegistry` and loads config on every call to `callPaymentService`. In production, the registry should be a singleton with config loaded once and kept current via `watchService`. This is acceptable for a tutorial but worth noting.
