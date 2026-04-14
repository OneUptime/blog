# Validation Summary: How to Use Dapr Name Resolution for Service Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, name resolution components)
- mDNS (Multicast DNS)
- Kubernetes DNS and headless services
- HashiCorp Consul (service discovery)
- SQLite (local name resolution registry)
- Dapr CLI

## Sources Consulted
- Dapr name resolution component documentation: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Consul name resolution spec: https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr service invocation how-to (namespace-aware invocation): https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr CLI reference: https://docs.dapr.io/reference/cli/

## Issues Found

1. **DNS template code block language**: The Kubernetes DNS format `{app-id}-dapr.{namespace}.svc.cluster.local` was in a ` ```json ` code block, but it is not JSON — it is a DNS name template. Changed to ` ```text `.

2. **Incorrect namespace-aware invocation with header**: The second namespace invocation example mixed two different invocation methods. It used the direct invoke API URL (`/v1.0/invoke/service-b/method/hello`) with the `dapr-app-id` header set to `service-b.production`. This is wrong because: (a) the app ID in the URL path (`service-b`) conflicts with the one in the header (`service-b.production`), and (b) the `dapr-app-id` header is used with Dapr's HTTP proxy approach, where the URL should be just the method endpoint (`http://localhost:3500/hello`), not the full invoke API path. Fixed the URL to use the proxy format: `http://localhost:3500/hello` with the header `-H "dapr-app-id: service-b.production"`.

## Review Notes
- The `dapr logs --app-id service-a` command shown in the debugging section may require the `-k` (Kubernetes) flag when used in a Kubernetes context. In self-hosted mode, sidecar logs are typically viewed from the terminal where `dapr run` was executed, not via `dapr logs`. The section is not wrong per se since it shows both `dapr logs` and `kubectl logs`, but readers may be confused about which applies where.
- The post refers to name resolution as a "building block" in the opening paragraph but correctly calls it a "pluggable subsystem" in the summary. Strictly speaking, name resolution is a component type used by the service invocation building block, not a building block itself. This is a minor terminology nuance that does not affect the technical accuracy of the post.
- The SQLite name resolution component (`nameresolution.sqlite`) is a newer addition to Dapr. Readers on older Dapr versions may not have it available.
