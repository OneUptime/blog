# Validation Summary: How to Configure TLS Termination at Sidecar Level in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Sidecar API
- Istio PeerAuthentication
- Istio EnvoyFilter
- Envoy sidecar TLS termination
- Kubernetes Secrets
- kubectl
- istioctl
- OpenSSL

## Sources Consulted
- Istio Ingress Sidecar TLS Termination task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sidecar-tls-termination/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The original Sidecar examples used `credentialName` under `spec.ingress[].tls`. Istio's current sidecar ingress TLS documentation notes that `credentialName` is not currently supported for this configuration, so the examples were changed to mount Kubernetes Secrets into the `istio-proxy` sidecar and reference `privateKey`, `serverCertificate`, and `caCertificates` file paths.
- The original post did not mention that sidecar ingress TLS termination is an experimental Istio feature requiring `ENABLE_TLS_ON_SIDECAR_INGRESS=true`. Added that prerequisite.
- The original mutual TLS example put the client CA into the same secret and referenced it through `credentialName`. Updated it to create a separate CA secret, mount it into the proxy, and use `caCertificates`.
- The EnvoyFilter example added a new listener on the same inbound port and referenced SDS by secret name, which is risky and not aligned with the documented Sidecar approach. Replaced it with guidance to inspect the generated listener first and use EnvoyFilter only for version-sensitive patches that the Sidecar API cannot express.
- The troubleshooting section referenced `credentialName` as the likely source of certificate mismatch. Updated it to check mounted secret annotations and file paths instead.

## Review Notes
The post is technically relevant and valid after correction. Sidecar ingress TLS termination remains experimental in the current Istio documentation, so future readers should verify the feature gate and API details for their installed Istio version.
