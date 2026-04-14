# Validation Summary: How to Run Dapr Alongside Linkerd Service Mesh

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Linkerd 2.x (service mesh)
- Kubernetes
- Helm
- mTLS (mutual TLS)

## Sources Consulted
- Linkerd2 proxy default port configuration (environment variables: `LINKERD2_PROXY_INBOUND_LISTEN_ADDR`, `LINKERD2_PROXY_OUTBOUND_LISTEN_ADDR`, `LINKERD2_PROXY_ADMIN_LISTEN_ADDR`, `LINKERD2_PROXY_CONTROL_LISTEN_ADDR`)
- Dapr Kubernetes annotations documentation (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr Configuration CRD specification (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr mTLS documentation (https://docs.dapr.io/operations/security/mtls/)
- Dapr service invocation API reference (https://docs.dapr.io/reference/api/service_invocation_api/)
- Dapr Helm chart installation guide (https://docs.dapr.io/getting-started/install-dapr-kubernetes/)
- Linkerd installation guide (https://linkerd.io/2/tasks/install/)
- Linkerd proxy injection annotations (https://linkerd.io/2/reference/proxy-configuration/)

## Issues Found

### 1. Incorrect Linkerd proxy port numbers
- **What was wrong:** The post stated "Linkerd reserves ports 4140, 4141, and 4190." Port 4141 is a Linkerd1 (legacy) port and is not used by Linkerd2. The list was also incomplete.
- **What was changed:** Updated to "Linkerd reserves ports 4140 (outbound), 4143 (inbound), 4190 (control), and 4191 (admin)." These are the correct Linkerd2 proxy default ports.
- **Why:** The Linkerd2 Rust-based proxy uses different ports than the original Linkerd1. Correct ports are 4140, 4143, 4190, and 4191.

### 2. Incorrect Dapr mTLS configuration scope
- **What was wrong:** The post said "Apply this configuration to all namespaces where Linkerd mTLS is active," implying mTLS can be disabled per-namespace.
- **What was changed:** Updated to explain that Dapr mTLS is a global setting controlled by the Sentry certificate authority, and should be disabled cluster-wide via the system-level configuration or Helm values (`global.mtls.enabled=false`).
- **Why:** Dapr mTLS is managed globally by the Sentry service, not per-app or per-namespace. The `mtls` field in a per-app Configuration resource does not control mTLS behavior — it must be set at the system level.

## Review Notes
- The section "Configure Dapr to Skip Linkerd Proxy for Internal Traffic" has a misleading title. The body text discusses routing Dapr traffic through Linkerd for observability, but the Configuration resource shown only sets up tracing (`samplingRate: "1"`), which does not affect traffic routing. The YAML is syntactically valid but does not achieve what the section title or description claims. A future revision could either rename the section or add the actual configuration needed to route Dapr sidecar-to-sidecar traffic through Linkerd.
- The port skip annotation `config.linkerd.io/skip-inbound-ports: "3500,50001"` is correct for inbound traffic. Depending on the deployment, `config.linkerd.io/skip-outbound-ports` may also be needed for Dapr's outbound sidecar-to-sidecar communication, but this depends on whether Linkerd observability of that traffic is desired.
- All Dapr annotations, API paths, Helm chart URLs, and Configuration CRD apiVersions were verified as correct.
- The Linkerd CLI commands (`linkerd install`, `linkerd check`, `linkerd viz stat`) are correct for Linkerd 2.12+.
