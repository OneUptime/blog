# Validation Summary: Dapr vs Linkerd: Application Runtime vs Service Mesh

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Linkerd (service mesh)
- Kubernetes
- Python (Dapr SDK example)
- kubectl CLI

## Sources Consulted
- Linkerd official documentation (https://linkerd.io/2/reference/architecture/)
- Linkerd features page (https://linkerd.io/2/features/)
- Linkerd proxy injection docs (https://linkerd.io/2/features/proxy-injection/)
- Linkerd load balancing docs (https://linkerd.io/2/features/load-balancing/)
- Linkerd2-proxy GitHub repository (https://github.com/linkerd/linkerd2-proxy)
- Dapr official documentation (https://docs.dapr.io/)
- Dapr GitHub repository (https://github.com/dapr/dapr) — confirmed Go as primary language
- Dapr Python SDK source (https://github.com/dapr/python-sdk) — verified DaprClient context manager and method signatures
- Dapr building blocks documentation (https://docs.dapr.io/developing-applications/building-blocks/)
- Dapr mTLS / security documentation (https://docs.dapr.io/operations/security/)
- Dapr Configuration resource documentation (https://docs.dapr.io/operations/configuration/)

## Issues Found
No technical issues found.

## Review Notes
- The Dapr Configuration YAML example uses the name `appconfig`. The official Dapr docs typically use `daprsystem` as the configuration name for the system-wide mTLS setting. The name `appconfig` is valid but readers should be aware the configuration must be referenced by the Dapr system to take effect globally.
- The post notes that disabling Dapr's mTLS avoids redundancy when Linkerd is present. Worth noting that even with `spec.mtls.enabled: false`, the Dapr control plane (Sentry) will continue to use mTLS internally — this setting only affects sidecar-to-sidecar communication.
- All code examples (Python Dapr SDK, kubectl annotation, Dapr Configuration YAML) are syntactically correct and use current, non-deprecated APIs.
- The EWMA load balancing claim for Linkerd is accurate and well-documented.
- The comparison table accurately reflects the architectural differences between the two tools.
