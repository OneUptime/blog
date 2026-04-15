# Validation Summary: How to Use Dapr with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14.0) — sidecar architecture, state management, pub/sub, service invocation
- Docker Compose — multi-container orchestration, network_mode sharing
- Redis — state store and pub/sub broker
- Python / Flask — application code example
- Zipkin — distributed tracing
- daprio/daprd and daprio/dapr Docker images

## Sources Consulted
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr self-hosted with Docker documentation: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr security concepts (mTLS / Sentry): https://docs.dapr.io/concepts/security-concept/
- Dapr State Management API: https://docs.dapr.io/reference/api/state_api/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Docker Compose `network_mode` documentation: https://docs.docker.com/compose/compose-file/05-services/#network_mode

## Issues Found

1. **Config file path inconsistency**: The project structure listed `config.yaml` at the project root, but the Docker Compose file mounted `./config:/config` as a directory and referenced `--config /config/config.yaml`. This would fail at runtime because `./config` doesn't exist as a directory. Fixed by updating the project structure to show `config/config.yaml` inside a `config/` directory, and updating the config file comment to `# config/config.yaml`.

2. **Incorrect mTLS claim in diagram**: The Mermaid diagram labeled sidecar-to-sidecar communication as `gRPC mTLS`. In self-hosted mode (Docker Compose), mTLS is NOT enabled by default — it requires the Sentry service to be running, which is not included in this setup. Changed the label to `gRPC`.

3. **Circular dependency in health check advice**: The post suggested adding `depends_on: dapr-order-service` to the `order-service`, but `dapr-order-service` already depends on `order-service` in the compose file. This would create a circular dependency that Docker Compose rejects. Furthermore, with `network_mode: "service:order-service"`, the app container must start first to create the network namespace. Replaced the `depends_on` suggestion with an explanation of why it doesn't work and kept only the polling approach.

## Review Notes
- The `version: "3.8"` field in docker-compose.yaml is considered obsolete by Docker Compose V2 (it's ignored), but including it is harmless and still very common in tutorials.
- The placement service uses port 50005 (the traditional default). The official Dapr docs Docker Compose example now uses port 50006; both work fine with the explicit `-port` flag.
- The post uses `daprio/dapr:1.14.0` for the placement service. A more targeted image `daprio/placement:1.14.0` also exists. Both work since `daprio/dapr` bundles all Dapr binaries.
- The Python code uses `app.run()` directly at module level rather than under `if __name__ == '__main__':`, which is a common Flask antipattern but not technically wrong for a Docker container tutorial.
