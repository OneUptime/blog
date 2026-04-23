# Validation Summary: How to Enable Istio mTLS in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Istio `PeerAuthentication`
- Istio `DestinationRule`
- `istioctl`
- mTLS and X.509 certificates
- Kiali

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio command reference (`istioctl`): https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl describe` guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio security FAQ: https://istio.io/latest/about/faq/security/
- Istio Plug in CA Certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kiali security docs: https://kiali.io/docs/features/security/

## Issues Found
- The post used older API versions (`security.istio.io/v1beta1` and `networking.istio.io/v1alpha3`). I updated them to the current `v1` APIs used in the latest Istio references.
- The post used `istioctl authn tls-check`, which is not part of the current `istioctl` command reference. I replaced those examples with supported diagnostics based on `istioctl experimental describe pod`.
- The mesh-wide policy text implied `istio-system` is always the required namespace. I clarified that mesh-wide `PeerAuthentication` must be created in Istio's root namespace, which is commonly `istio-system`.
- The DestinationRule section implied a manual `DestinationRule` is always required for mTLS. I corrected this to reflect Istio auto mTLS behavior when there is no conflicting TLS configuration.
- The certificate inspection example described `/var/run/secrets/istio/root-cert.pem` as if it were the workload certificate. I corrected the wording to identify it as the mesh root CA certificate and kept `istioctl proxy-config secret` as the workload-certificate inspection step.
- The verification examples used older or less precise command forms. I updated them to current `istioctl proxy-config` resource syntax and a fully qualified service host in the DestinationRule example.
- The introduction and mode summary slightly overstated current behavior. I adjusted the wording to describe auto mTLS for sidecar workloads more accurately and added `UNSET`, which is a current supported `PeerAuthentication` mode.

## Review Notes
- The guide assumes Istio sidecar mode. In ambient mode, Istio handles mTLS differently and `DISABLE` is not supported for `PeerAuthentication`.
- The review was performed against the current Istio and Kiali documentation available on 2026-04-23. The Istio pages consulted were published under the `latest` documentation stream.
- The commands and manifests were documentation-validated during review, but they were not executed against a live Rancher or Istio cluster in this workspace.
