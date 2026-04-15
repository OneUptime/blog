# Validation Summary: How to Configure Dapr Internal gRPC Port

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- gRPC
- Kubernetes (Deployments, NetworkPolicy, Annotations)
- mTLS (mutual TLS via Dapr Sentry)

## Sources Consulted
- Dapr Arguments and Annotations Reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration Overview — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr mTLS Setup — https://docs.dapr.io/operations/security/mtls/
- Dapr Service Invocation Overview — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Logging Troubleshooting — https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Sentry Helm Chart (GitHub) — dapr/dapr repository, charts/dapr/charts/dapr_sentry/templates/
- Dapr Placement Helm Chart (GitHub) — dapr/dapr repository, charts/dapr/charts/dapr_placement/templates/

## Issues Found

### 1. Incorrect claim about control-plane communication (Description + first paragraph)
**What was wrong:** The post stated the internal gRPC port (50002) is used for "sidecar-to-control-plane communication with the Dapr operator and sentry." The Dapr documentation confirms the internal gRPC port is used exclusively for sidecar-to-sidecar communication. Control plane services (Sentry, Placement, Operator) are contacted by the sidecar on their own service endpoints and ports — not via port 50002.
**What was changed:** Removed the "sidecar-to-control-plane communication" claim from both the Description line and the introductory paragraph. Replaced with accurate language about the port being used for sidecar-to-sidecar communication during service invocation and actor placement.

### 2. Incorrect debugging command (Debugging section)
**What was wrong:** The post included the command `kubectl exec POD_NAME -c daprd -- daprd --log-level debug 2>&1 | grep "internal"`. This would attempt to start a second `daprd` process inside the already-running container, which would fail due to port conflicts. The `--log-level` flag is a startup argument, not a runtime toggle.
**What was changed:** Replaced with `kubectl logs POD_NAME -c daprd | grep "internal"` and added a comment explaining that debug logging must be enabled via the `dapr.io/log-level: "debug"` annotation followed by a pod redeploy.

## Review Notes
- The `ss` and `openssl` debugging commands exec into the `daprd` container, which typically uses a minimal/distroless base image where these tools may not be available. The commands are syntactically correct but may not work in practice without ephemeral debug containers or a custom sidecar image.
- The NetworkPolicy example uses the label `app.kubernetes.io/part-of: dapr-mesh`, which is not a label Dapr applies automatically. Users would need to add this label to their pods manually. The example is illustrative and reasonable but should be understood as a template rather than a copy-paste solution.
- All Dapr annotation names, default port values, and mTLS Configuration CRD fields were verified as correct against official documentation.
