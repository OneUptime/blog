# Validation Summary: How to Use Dapr with Docker Compose for Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar, service invocation, state management, pub/sub)
- Docker Compose v2
- Redis (state store and pub/sub backend)
- Zipkin (distributed tracing)
- Node.js / Python (example microservices)

## Sources Consulted
- Dapr self-hosted Docker documentation: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr CLI arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Docker Compose `network_mode` documentation: https://docs.docker.com/compose/how-tos/networking/

## Issues Found

### 1. Circular dependency in `depends_on` (critical)
**What was wrong:** `order-service` had `depends_on: order-service-dapr` and `inventory-service` had `depends_on: inventory-service-dapr`, but the sidecars use `network_mode: "service:<app>"` which creates an implicit dependency in the opposite direction. This circular dependency would cause Docker Compose to fail at startup.
**What was changed:** Removed sidecar from each app service's `depends_on`. Added the app service to each sidecar's `depends_on` instead, matching the official Dapr Docker Compose pattern (sidecar depends on app, not the reverse).

### 2. Dapr HTTP port not exposed to host (functional)
**What was wrong:** The `curl http://localhost:3500/...` command in the "Running the Environment" section would fail because port 3500 was not mapped in the `order-service` ports. Since the sidecar uses `network_mode: "service:order-service"`, its ports must be exposed through the app service's `ports` section.
**What was changed:** Added `"3500:3500"` to the `order-service` ports mapping.

### 3. Deprecated `--components-path` flag (deprecation)
**What was wrong:** Both sidecar services used the `-components-path` flag, which is deprecated in Dapr 1.11+ in favor of `--resources-path`. Since the post uses Dapr 1.13.0, the deprecated flag still works but should use the current replacement.
**What was changed:** Replaced `-components-path` with `-resources-path` in both sidecar command definitions.

### 4. Missing `config/` directory in project structure (inconsistency)
**What was wrong:** The `order-service-dapr` sidecar references `-config /config/config.yaml` and mounts `./config:/config`, but the project structure listing did not include a `config/` directory.
**What was changed:** Added `config/config.yaml` to the project structure tree.

## Review Notes
- The `version: "3.8"` field in the Docker Compose file is obsolete in Docker Compose V2 (which the post requires as a prerequisite). It still works but produces a deprecation warning. Not changed since it does not cause errors.
- The post uses single-dash flags (e.g., `-app-id` instead of `--app-id`) for daprd. Both forms work with Go's flag package, but official Dapr documentation consistently uses double-dash. Not changed since both are functionally equivalent.
- The post does not show the contents of `config/config.yaml`. This would typically contain Dapr tracing configuration pointing to the Zipkin service. A future improvement could add this sample configuration.
- Dapr 1.13.0 is not the latest version. The post is still accurate for this version but readers should check for newer releases.
