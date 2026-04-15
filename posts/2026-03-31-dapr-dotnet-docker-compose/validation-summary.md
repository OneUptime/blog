# Validation Summary: How to Deploy Dapr .NET Apps with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14)
- .NET 9.0 (ASP.NET Core)
- Docker Compose
- Redis (state store)
- Zipkin (distributed tracing)
- Docker multi-stage builds

## Sources Consulted
- Dapr self-hosted with Docker documentation: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Zipkin tracing setup: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr CLI flag rename (--components-path to --resources-path): https://github.com/dapr/cli/issues/953

## Issues Found

1. **Deprecated `--components-path` flag**: Both sidecar containers used `--components-path=/components`, which was deprecated in Dapr 1.11+ in favor of `--resources-path`. Since the post targets Dapr 1.14, updated both sidecars to use `--resources-path=/components`.

2. **Inconsistent project structure listing**: The project structure listed `zipkin.yaml` in the components directory, but the compose file referenced `--config=/components/config.yaml`. Zipkin tracing in Dapr is configured via a `kind: Configuration` resource (not a Component), so the project structure was updated to list `config.yaml` instead of `zipkin.yaml` to match the compose file reference.

3. **Missing `--config` flag on inventory-service-dapr**: The `order-service-dapr` sidecar included `--config=/components/config.yaml` for Zipkin tracing configuration, but `inventory-service-dapr` was missing this flag entirely. Added the `--config=/components/config.yaml` flag to ensure both sidecars have tracing enabled.

## Review Notes
- The `version: "3.9"` field in docker-compose.yml is ignored by Docker Compose V2 and produces a warning. It is not incorrect but could be omitted in modern setups.
- The `inventory-service-dapr` sets `--dapr-http-port=3501`, which is unnecessary since it shares a separate network namespace from `order-service-dapr` (via `network_mode`). The default port 3500 would work without conflict. Not incorrect, but potentially confusing.
- The official Dapr Docker Compose examples also include `--placement-host-address` and `--scheduler-host-address` flags. These may be needed depending on which Dapr features are used (e.g., actors require the placement service). The post omits these, which is fine for basic state store and pub/sub usage but could cause issues if readers extend the example to use actors.
- The state store component uses an empty `redisPassword`, which is fine for local development but should be noted as insecure for any other environment.
