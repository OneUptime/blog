# Validation Summary: How to Migrate from Self-Managed TLS to Istio mTLS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio service mesh
- Istio mutual TLS and PeerAuthentication
- Istio ServiceEntry and DestinationRule
- Istio CA and custom CA integration
- Kubernetes Deployments, Services, Secrets, and ConfigMaps
- cert-manager Certificate resources
- Python requests

## Sources Consulted
- Istio Mutual TLS Migration: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Authentication Policy / Auto mTLS: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Egress TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Custom CA Integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The Kubernetes Deployment examples were missing the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added selectors and `template.metadata.labels` so the examples are valid.
- The Istio examples used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. Updated the snippets to the stable `v1` APIs used in current Istio documentation.
- The post said applications send plaintext HTTP to localhost. Clarified that applications call the Kubernetes service address and the sidecar intercepts the traffic, which matches Istio sidecar behavior.
- The external service example mentioned ServiceEntries but only showed a DestinationRule, and the TLS origination settings were not scoped to the HTTP port. Added a ServiceEntry and changed the DestinationRule to use `portLevelSettings` for port 80 with `targetPort: 443`.
- The sidecarless legacy service section implied that PeerAuthentication exceptions apply directly to workloads that cannot run sidecars. Clarified that auto mTLS sends plaintext to workloads without sidecars unless DestinationRules override TLS, and that PeerAuthentication exceptions are for sidecar-injected legacy workloads that must accept plaintext.
- The custom CA section implied that setting `EXTERNAL_CA=ISTIOD_RA_KUBERNETES_API` alone makes Istio use an existing CA. Clarified that Kubernetes CSR integration requires an external signer/controller, and separately described plugging a CA certificate/key into `istiod` with the `cacerts` secret.

## Review Notes
The guide assumes classic sidecar mode. Istio ambient mesh has different behavior and does not support `DISABLE` PeerAuthentication mode, but the post's migration flow is sidecar-focused and remains valid in that context.
