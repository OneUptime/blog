# Validation Summary: How to Configure Dapr Sidecar Annotations

## Status
validated

## Post Type
Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (pod annotations, Deployments)
- kubectl CLI

## Sources Consulted
- Dapr official annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes annotations guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/

## Issues Found
1. **Missing `h2c` protocol value in `dapr.io/app-protocol` comment (line 32):** The comment listed `http, grpc, https, grpcs` but omitted `h2c` (HTTP/2 Cleartext), which is a valid protocol option in the official Dapr docs. Fixed by adding `h2c` to the comment.
2. **Deprecation not noted for `dapr.io/http-max-request-size` (line 33):** This annotation is deprecated in favor of the `--max-body-size` daprd argument. Added a deprecation note in the comment.
3. **Deprecation not noted for `dapr.io/http-read-buffer-size` (line 34):** This annotation is deprecated in favor of the `--read-buffer-size` daprd argument. Added a deprecation note in the comment.

## Review Notes
- All annotation names are correct and match the official Dapr documentation.
- The default metrics port of 9090 is correct per official docs.
- Log level values (`debug`, `info`, `warn`, `error`) are correct -- Dapr uses `warn`, not `warning`.
- The `dapr.io/sidecar-listen-addresses` value of `0.0.0.0` shown in the post is a valid custom value; the default in Kubernetes is `[::1],127.0.0.1`.
- The Kubernetes Deployment YAML in the complete example is syntactically correct and well-structured.
- The kubectl verification commands are correct and functional.
