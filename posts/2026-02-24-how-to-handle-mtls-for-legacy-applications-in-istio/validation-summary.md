# Validation Summary: How to Handle mTLS for Legacy Applications in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Istio mutual TLS (mTLS)
- Kubernetes Deployments and Services
- Istio PeerAuthentication
- Istio DestinationRule
- Istio Sidecar resource
- Istio telemetry metrics and Prometheus queries
- istioctl diagnostics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio protocol selection guide: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The post implied that `STRICT` mTLS means the application itself receives and verifies Istio mTLS. Updated the wording to clarify that, in sidecar mode, the destination sidecar enforces mTLS and the proxies handle Istio certificate exchange.
- The problem list said a legacy HTTP service can break because it receives TLS. Updated this to the more accurate failure mode: problems occur when the service is reached without compatible sidecar or client TLS configuration.
- The per-port `PeerAuthentication` explanation did not state that `portLevelMtls` keys are workload ports, not Kubernetes Service ports. Updated the wording accordingly.
- The no-sidecar strategy did not mention Istio auto mTLS behavior. Added a caveat that Istio normally sends plaintext to workloads without sidecars unless explicit destination rules force TLS.
- The double-TLS section described `DestinationRule` `tls.mode: DISABLE` as sidecar passthrough without noting the destination-side mTLS requirement. Updated it to clarify that disabling Istio mTLS sends the application TLS stream as-is, and the destination must have no sidecar or a plaintext-compatible peer authentication policy on that workload port.
- The metrics section treated `connection_security_policy="none"` as universally available for plaintext traffic. Updated it to clarify that this is destination-reported plaintext traffic and source reports use `unknown` for this label.

## Review Notes
The examples use current Istio `security.istio.io/v1` and `networking.istio.io/v1` APIs. The guidance is specific to sidecar-based Istio meshes; ambient mode has different behavior, including unsupported `DISABLE` mode in `PeerAuthentication`.
