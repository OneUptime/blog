# Validation Summary: How to Fix mTLS Handshake Failures Between Services

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio service mesh
- Istio PeerAuthentication
- Istio DestinationRule
- Istio automatic mTLS
- Kubernetes
- Envoy sidecars
- TLS certificates and trust bundles

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Security Problems guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post said Istio has three mTLS modes. Istio's PeerAuthentication `MutualTLS.Mode` also includes `UNSET`, so the section now describes the three explicit enforcement modes plus `UNSET` inheritance behavior.
- The certificate inspection examples used positional JSON array indexes from `istioctl proxy-config secret -o json`. Official Istio examples use `.dynamicActiveSecrets[]` and select secrets by name, so the commands now select `default` and `ROOTCA` explicitly.
- The Root CA Mismatch section described incompatible CAs as a trust domain problem. Trust domain and CA trust bundle configuration are related but distinct, so the wording now calls out CA/trust bundle configuration and mentions checking `trustDomainAliases` for multi-cluster or migration setups.
- The port-level mTLS example used Istio's `15021` sidecar status port in `portLevelMtls`. Istio documents that `portLevelMtls` refers to workload container ports, not Kubernetes Service ports or sidecar status ports, so the example now uses only workload port `8080` and explains that distinction.

## Review Notes
The remaining Istio API snippets and troubleshooting commands are technically sound for current sidecar-mode Istio usage. The post is primarily about sidecar mode; ambient mesh has different mTLS behavior and diagnostics, which could be covered separately in a future update.
