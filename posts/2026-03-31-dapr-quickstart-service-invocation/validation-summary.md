# Validation Summary: How to Run Dapr Quickstart for Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block)
- Python (Flask, requests)
- Docker (for Dapr init containers)
- Kubernetes (Dapr sidecar annotations)
- gRPC (app protocol option)
- mTLS (sidecar-to-sidecar encryption)

## Sources Consulted
- Dapr Service Invocation API reference (v1.17) - https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI `dapr run` reference - https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Name Resolution component specs - https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Kubernetes annotations reference - https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Quickstarts GitHub repository - https://github.com/dapr/quickstarts (service_invocation/python/http directory structure verified)
- Dapr `dapr init` documentation - https://docs.dapr.io/getting-started/install-dapr-selfhost/

## Issues Found
1. **Misleading Docker prerequisite comment**: The comment `# Docker for Redis container` implied Redis was specifically needed for this quickstart. Redis is not used by service invocation; Docker is needed for `dapr init` which sets up Redis, Zipkin, placement, and scheduler containers. Changed to `# Docker for dapr init containers`.
2. **Incorrect code comment for checkout service**: The code comment said `# checkout-service/app.py` but the actual directory in the Dapr quickstarts repo is `checkout/`, not `checkout-service/`. The run command correctly used `cd checkout`. Changed the comment to `# checkout/app.py`.

## Review Notes
- The Dapr HTTP invoke API URL format `/v1.0/invoke/{appId}/method/{method-name}` is correct and current.
- The `--app-protocol grpc` flag is verified correct with valid values: http, grpc, https, grpcs, h2c.
- mDNS as the default name resolution in self-hosted mode is confirmed.
- All Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are verified correct.
- The quickstarts repo directory structure (`order-processor/` and `checkout/` under `service_invocation/python/http/`) is confirmed.
- The code examples shown are representative/simplified versions rather than exact copies from the quickstart repo, which is appropriate for a tutorial blog post.
- The post references Dapr CLI 1.14+ which is reasonable for the post date.
