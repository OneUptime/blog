# Validation Summary: How to Configure Istio Peer Authentication for mTLS with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- Kustomize
- Istio PeerAuthentication
- Istio DestinationRule
- Istio mTLS
- istioctl
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS Configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The mesh-wide PeerAuthentication comments implied that `istio-system` is always the mesh-wide namespace. Updated the wording to refer to the configured Istio root namespace and note that `istio-system` is mesh-wide only when it is the configured root namespace.
- The workload exception section described service-level exceptions, but Istio PeerAuthentication selectors apply to workloads. Updated the heading and text to use workload-level terminology.
- The `portLevelMtls` comment said plaintext was allowed on the metrics port. Updated it to the more precise behavior: mTLS is disabled on that workload port.
- The DestinationRule section was labeled as validation, but DestinationRule configures outbound TLS behavior. Updated the heading and comments to explain that explicit DestinationRule mTLS is optional because Istio auto mTLS already uses mTLS between mesh workloads when possible.
- The verification commands used `istioctl experimental authz check`, which checks AuthorizationPolicy configuration rather than mTLS. Replaced it with `istioctl experimental describe pod`, which is the Istio diagnostic command documented for inspecting pod mesh and strict mTLS configuration.
- The `istioctl proxy-status` comment said it showed mTLS. Updated it to say it checks Envoy xDS sync status.
- The plaintext rejection test ran from an injected production client, which would normally use Istio mTLS automatically. Updated the example to run from a pod without an Istio sidecar and target the production service by fully qualified service DNS name.
- The `istioctl analyze` best-practice note overclaimed that it directly reports plaintext dependencies. Updated it to accurately describe supported configuration analysis categories such as selector, namespace injection, and missing sidecar issues.

## Review Notes
- The API versions used in the examples (`security.istio.io/v1`, `networking.istio.io/v1`, and `kustomize.toolkit.fluxcd.io/v1`) are current in the official Istio and Flux documentation.
- `portLevelMtls` applies only when a workload selector is present, and the example includes one. The port values refer to workload/container ports, not Kubernetes Service ports.
- In ambient mode, Istio does not support `DISABLE` PeerAuthentication mode. The post prerequisites mention Istio-injected namespaces, so the reviewed examples are sidecar-mode examples.
