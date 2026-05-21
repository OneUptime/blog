# Validation Summary: How to Configure Workload-Specific Peer Authentication in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS (mTLS)
- Kubernetes labels and selectors
- Kubernetes kubectl commands
- istioctl diagnostics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio WorkloadSelector reference: https://istio.io/latest/docs/reference/config/type/workload-selector/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Clarified that a PeerAuthentication selector matching no pods is not rejected by `kubectl apply`, but the policy has no effect on any workload. The original wording said this would never produce any error messages, which was too absolute for Istio tooling and validation workflows.
- Clarified that `portLevelMtls` keys are workload/container ports, not Kubernetes Service ports, and that Istio only applies port-level mTLS when the workload port is bound by a Service.
- Corrected the sidecar-only debugging note. PeerAuthentication applies in sidecar mode through Envoy sidecars and in ambient mode through ztunnel; ambient mode does not use injected sidecars and does not support `DISABLE` mode.

## Review Notes
The YAML examples use the current `security.istio.io/v1` API and valid PeerAuthentication fields and modes for sidecar-mode Istio. The examples that use `DISABLE` should be understood as sidecar-mode examples because Istio ambient mode does not support `DISABLE`.
