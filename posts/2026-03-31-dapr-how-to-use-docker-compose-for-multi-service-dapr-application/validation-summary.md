# Validation Summary: How to Use Docker Compose for Multi-Service Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr 1.14.0 (daprd sidecar, placement service)
- Docker Compose (V2 syntax)
- Redis (state store and pub/sub backend)
- Zipkin (distributed tracing)
- Python / Flask (order service)
- Go (notification service)
- Dapr HTTP API (service invocation, state management, pub/sub)

## Sources Consulted
- Dapr documentation: self-hosted with Docker Compose (https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/)
- Dapr documentation: state management API (https://docs.dapr.io/reference/api/state_api/)
- Dapr documentation: pub/sub API (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr documentation: service invocation API (https://docs.dapr.io/reference/api/service_invocation_api/)
- Dapr documentation: Redis state store component (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr documentation: Redis pub/sub component (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- Dapr documentation: Dapr Configuration (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr CLI reference: daprd flags (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Docker Compose specification (https://docs.docker.com/compose/compose-file/)

## Issues Found
- **Project structure listed `zipkin.yaml` instead of `config.yaml`**: The project structure tree showed `components/zipkin.yaml`, but the actual Dapr Configuration file containing the Zipkin tracing setup is named `config.yaml` (as shown in the component definitions section). Changed `zipkin.yaml` to `config.yaml` in the project structure listing to match the actual file referenced throughout the post.

## Review Notes
- The `version: "3.9"` field in the docker-compose.yaml is obsolete in Docker Compose V2 (which the post correctly uses via `docker compose` syntax). It still works but produces a deprecation warning. This is a minor cosmetic issue and not a functional error.
- The Python code uses `os.environ.get("DAPR_HTTP_PORT", 3501)` where the default is an int while the env var value would be a string. Both work correctly in f-strings, so this is not a bug, just a minor style inconsistency.
- The notification-service does not declare a `depends_on` for Redis, which is fine since its Redis dependency is indirect (through the Dapr sidecar and components).
- The `network_mode: "service:<app>"` pattern is the standard and correct way to pair Dapr sidecars with application containers in Docker Compose.
- All Dapr HTTP API paths (`/v1.0/invoke/...`, `/v1.0/state/...`, `/v1.0/publish/...`) are correct for Dapr 1.14.x.
- The Go notification service correctly implements the programmatic subscription model via `/dapr/subscribe`.
