# Validation Summary: How to Fix 'mTLS' Configuration Errors in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxies
- Mutual TLS (mTLS)
- PeerAuthentication
- DestinationRule
- ServiceEntry
- IstioOperator
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio mutual TLS migration guide: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio authentication policy guide: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio egress TLS origination guide: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio traffic management troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- Updated Istio networking and security examples from `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` to the current `v1` API versions used in Istio documentation.
- Fixed the `portLevelMtls` example by adding a workload selector and clarifying that the key is the workload port. Istio only supports port-level mTLS overrides on workload-specific PeerAuthentication policies.
- Corrected the certificate inspection command to select the `default` secret before decoding the workload certificate chain, matching Istio's documented `istioctl proxy-config secret -o json` usage.
- Reworked the external ServiceEntry example to avoid double TLS. The corrected example uses HTTP port 80 with `targetPort: 443` and applies `mode: SIMPLE` only to that HTTP port for TLS origination.
- Replaced `istioctl x authz check` as an mTLS diagnostic command with `istioctl experimental describe pod`, because `authz check` inspects AuthorizationPolicy rather than the TLS configuration affecting a pod.
- Changed the connectivity test to run `curl` from the application container over HTTP, letting the sidecar transparently apply mTLS. Running `curl` from the `istio-proxy` container with an HTTPS URL to a service port was misleading.

## Review Notes
The post is now technically valid for current Istio documentation. The local environment did not have `istioctl` or `kubectl` installed, so CLI verification was performed against official Istio command documentation rather than local `--help` output.
