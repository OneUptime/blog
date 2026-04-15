# Validation Summary: How to Avoid Duplicate mTLS When Using Dapr with a Service Mesh

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Configuration CRD, mTLS, sidecar, Helm chart)
- Istio (PeerAuthentication, mTLS modes, istioctl)
- Linkerd (viz extension, edges command)
- Kubernetes (kubectl, pod annotations, namespaces)

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr mTLS Setup: https://docs.dapr.io/operations/security/mtls/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Helm Deployment: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Istio PeerAuthentication API Reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl proxy-config documentation: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-proxy-config
- Linkerd viz extension CLI reference: https://linkerd.io/2/reference/cli/viz/

## Issues Found
1. **`istioctl authn tls-check` is deprecated/removed.** The command `istioctl authn tls-check <pod> -n <namespace>` was deprecated in Istio 1.7 and removed in Istio 1.9 (February 2021). Replaced with the modern equivalent `istioctl proxy-config secret <pod> -n <namespace>`, which verifies TLS certificates loaded by the sidecar proxy.

2. **`linkerd edges` should be `linkerd viz edges`.** Starting with Linkerd 2.10 (mid-2021), the `edges` command was moved from the core CLI to the `linkerd-viz` extension. Updated both occurrences:
   - `linkerd edges deployment -n default` changed to `linkerd viz edges deployment -n default`
   - `linkerd edges pod/<pod-name> -n <namespace>` changed to `linkerd viz edges pod/<pod-name> -n <namespace>`

## Review Notes
- All Dapr configuration details (CRD apiVersion, mTLS field path, Helm values, pod annotations, service invocation URL, default ports) are correct per current official documentation.
- The Istio PeerAuthentication YAML for port-level mTLS exceptions is syntactically correct. It lacks a `selector` field, meaning it applies to all workloads in the namespace rather than only Dapr-enabled pods. This is not technically wrong but could be noted as a best practice improvement.
- Port 50001 is described in the context of sidecar-to-sidecar communication. It also serves as the app-to-sidecar gRPC API endpoint, but this omission does not make the post incorrect in the context of the mTLS discussion.
