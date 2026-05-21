# Validation Summary: How to Troubleshoot mTLS Connection Failures in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Istio mTLS
- Istio PeerAuthentication
- Istio DestinationRule
- istioctl
- Envoy TLS statistics
- Kubernetes kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio sidecar injection guide: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio security best practices, traffic capture limitations: https://istio.io/latest/docs/ops/best-practices/security/
- Envoy TLS troubleshooting documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl.html

## Issues Found
- The post said both pods need sidecars for mTLS to work without scoping that statement. This is correct for Istio-managed mTLS in sidecar mode, but Istio also has ambient mode and non-sidecar workloads are not enforced by a sidecar proxy. Updated the wording to explicitly refer to sidecar mode and clarified what happens when the destination has no sidecar.
- The certificate check recommended comparing ROOTCA serial numbers. Serial numbers are a weak shorthand because trust is based on the root CA/trust bundle. Updated the wording to compare ROOTCA trust bundles instead.
- The direct pod-IP curl example claimed it bypasses both sidecars. In a normal sidecar-injected Istio pod, outbound and inbound TCP traffic are captured by sidecar redirection, so a pod-IP request does not generally bypass sidecars. Rewrote the example as a plaintext-client comparison from a pod without a sidecar and kept the STRICT-mode expectation accurate.

## Review Notes
The Istio API snippets use current stable API versions (`security.istio.io/v1` and `networking.istio.io/v1`). The `istioctl x describe pod`, `istioctl proxy-config secret`, and `istioctl proxy-config cluster --fqdn` commands match the current official command reference. Auto mTLS remains documented in MeshConfig as `enableAutoMtls` with a default of true.
