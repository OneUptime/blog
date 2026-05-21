# Validation Summary: How to Debug Why mTLS is Failing Between Services

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Istio sidecar mode
- Istio mTLS and PeerAuthentication
- Istio DestinationRule TLS settings
- Kubernetes workloads and sidecar injection labels
- Envoy SDS and proxy diagnostics
- istioctl proxy-config commands

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio trust domain migration documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Envoy SDS documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/security/secret.html
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- Updated Istio API versions in YAML examples from `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` to the current documented `v1` APIs.
- Changed "three levels" of PeerAuthentication to "three scopes" because mesh, namespace, and workload placement are scopes, while `PERMISSIVE`, `STRICT`, `DISABLE`, and `UNSET` are modes.
- Expanded the namespace injection check to include both legacy `istio-injection` and revision-based `istio.io/rev` labels.
- Corrected the trust domain explanation to account for compatible trust domains, trust domain aliases, and shared trust roots rather than requiring identical trust domains in every case.
- Added the Istio-documented caveat that `portLevelMtls` keys refer to workload container ports, not Kubernetes Service ports.
- Replaced the curl command described as bypassing the sidecar. Resolving a service name to a pod IP from an injected workload is still usually captured by Istio traffic redirection, so the post now uses a temporary pod with sidecar injection disabled for a plaintext test.
- Replaced the generic `sds.key_rotation_failed` stat with the per-secret `sds.<secret-name>.key_rotation_failed` form and added `ssl_context_update_by_sds` as the SDS update signal.

## Review Notes
The remaining commands and examples are consistent with Istio sidecar-mode troubleshooting patterns. `istioctl` and `kubectl` were not installed in the local workspace, so command verification was performed against official documentation rather than local `--help` output.
