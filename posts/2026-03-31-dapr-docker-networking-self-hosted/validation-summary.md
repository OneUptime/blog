# Validation Summary: How to Configure Docker Networking for Dapr Self-Hosted

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (self-hosted mode, daprd sidecar)
- Docker (bridge networking, container DNS)
- Docker Compose (custom networks, sidecar pattern)
- Redis (as example Dapr component store)

## Sources Consulted
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr self-hosted with Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr release policy and supported versions: https://docs.dapr.io/operations/support/support-release-policy/
- Dapr GitHub releases: https://github.com/dapr/dapr/releases
- Docker Compose Specification (legacy versions): https://docs.docker.com/reference/compose-file/legacy-versions/

## Issues Found

1. **Outdated daprd image version**: The post used `daprio/daprd:1.13.0`, which is significantly outdated (from 2023) and outside the supported version window. Updated to `daprio/daprd:1.17.4` (current stable release as of April 2026).

2. **Deprecated Docker Compose version field**: The post included `version: "3.9"` at the top of the Docker Compose file. The top-level `version` field is now obsolete per the modern Compose Specification and may trigger deprecation warnings in current Docker Compose versions. Removed the `version: "3.9"` line.

## Review Notes
- The `--app-channel-address` flag usage is correct and well-explained. This flag was introduced in Dapr v1.11 and is the proper way to configure sidecar-to-app communication in containerized environments.
- The Dapr HTTP service invocation URL format (`/v1.0/invoke/{appID}/method/{method-name}`) is accurate.
- The Docker Compose sidecar pattern (running daprd as a separate container alongside the app container) is the recommended approach per official Dapr documentation.
- The troubleshooting commands are practical and correct.
- The `DAPR_HTTP_PORT` environment variable set on the `order-service` container is informational only for the app to know where to reach its sidecar; the actual sidecar port is configured on the daprd container via `--dapr-http-port`.
