# Validation Summary: How to Use API Token Authentication for Dapr APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar API token authentication)
- Kubernetes (secrets, pod annotations)
- Node.js (axios HTTP client, Dapr JS SDK)
- curl (HTTP API testing)
- Dapr State Management API
- Dapr Metadata API

## Sources Consulted
- Dapr API token authentication docs: https://docs.dapr.io/operations/security/api-token/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/

## Issues Found
No technical issues found.

## Review Notes
- The `DAPR_API_TOKEN` environment variable, `dapr-api-token` HTTP header, and `dapr.io/api-token-secret` Kubernetes annotation are all verified correct for Dapr API token authentication (app-to-sidecar direction).
- The Kubernetes secret key name `token` (used in `--from-literal=token=...`) matches the official documentation exactly.
- The State API endpoint format (`/v1.0/state/<storename>`) and the Metadata API endpoint (`/v1.0/metadata`) are both correct.
- The Dapr Node.js SDK usage (`@dapr/dapr` package, `DaprClient` class, `client.state.save()` method signature) matches the official SDK documentation.
- The 401 Unauthorized response for missing tokens is consistent with documented behavior.
- Note: Dapr also has a separate "App API token authentication" feature (sidecar-to-app direction, using `APP_API_TOKEN`). This post correctly covers only the Dapr API token auth feature (app-to-sidecar direction) and does not conflate the two.
