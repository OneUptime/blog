# Validation Summary: How to Configure Strict mTLS Mode in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- PeerAuthentication
- Mutual TLS (mTLS)
- Envoy sidecar proxy
- Prometheus metrics
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio health checking of services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The health probe section said TCP probes go directly to the container and are not affected by mTLS. Istio documentation says HTTP, TCP, and gRPC probes are rewritten by default so kubelet checks are handled through the sidecar agent. Updated the text to describe the current probe rewrite behavior and clarify that exec probes run inside the container.
- The port-level mTLS exception example used `portLevelMtls` without a workload `selector`. Istio's PeerAuthentication reference states that port-level settings only apply when a workload selector is specified, and that the port numbers are workload ports rather than Kubernetes Service ports. Updated the example to include a selector and clarified the explanation.
- The Envoy stats command used `pilot-agent request GET /stats`. Istio's pilot-agent and Envoy stats examples use `pilot-agent request GET stats`. Updated the command to match the official example.

## Review Notes
The post is technically relevant and the remaining PeerAuthentication examples use the current `security.istio.io/v1` API. The article is written for sidecar mode; ambient mode has different mTLS behavior, including unsupported `DISABLE` mode, but the post consistently frames strict mode around sidecar-injected services.
