# Validation Summary: How to Enable mTLS for Specific Services in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Mutual TLS (mTLS)
- PeerAuthentication
- DestinationRule / auto mTLS
- istioctl
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The port-level mTLS example disabled mTLS on port `15014` and described it as an Istio control plane port. `portLevelMtls` entries refer to workload/container ports and are only applied when the port is bound to a Kubernetes Service, so using a control-plane port in an application workload example was misleading. Changed the example to use workload port `8081` and added the workload-port / Service-bound caveat.
- The "Protect High-Value Services First" commands used `kubectl label deployment ...`, which labels the Deployment object, not the pod template labels matched by PeerAuthentication selectors. Changed the commands to patch `spec.template.metadata.labels` so new pods get the label matched by the policy.

## Review Notes
- The core PeerAuthentication examples use the current `security.istio.io/v1` API and valid `STRICT`, `PERMISSIVE`, and `DISABLE` mTLS modes.
- The policy precedence explanation matches Istio's documented workload-specific, namespace-wide, and mesh-wide behavior.
- The examples assume sidecar mode and that `istio-system` is the Istio root namespace. Istio installations can use a different root namespace, and ambient mode has different behavior for `DISABLE`.
