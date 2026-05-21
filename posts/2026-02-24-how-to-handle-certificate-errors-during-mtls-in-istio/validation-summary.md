# Validation Summary: How to Handle Certificate Errors During mTLS in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Istio mutual TLS
- Envoy proxy
- Kubernetes
- OpenSSL
- jq

## Sources Consulted
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio mutual TLS migration guide: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/

## Issues Found
- The post treated a generic Envoy connection reset as always meaning a TLS handshake failure. Changed the wording to clarify that this is true when the reset is caused by mTLS.
- The workload certificate inspection commands used `.dynamicActiveSecrets[0]`, which can select `ROOTCA` instead of the workload certificate. Changed these commands to select the `default` SDS secret, matching Istio's documented examples.
- The intermediate CA section stated that the chain should always contain at least two certificates. Changed it to account for Istio's default self-signed root CA setup and only require intermediates when an intermediate CA is actually used.
- The expired certificate explanation said rotation had definitely failed. Changed this to include the case where the proxy is not receiving SDS updates.
- The OpenSSL debugging example used `openssl s_client` inside the `istio-proxy` container with file paths that are not generally available in current SDS-based Istio sidecars. Replaced it with the official `istioctl proxy-config secret -o json | openssl` inspection pattern.
- The "find pods without sidecars" command only looked for pods with exactly one container, which misses multi-container pods without Istio sidecars. Changed it to check for the absence of an `istio-proxy` container.

## Review Notes
The remaining commands and configuration snippets are broadly correct for current Istio sidecar mode. The exact Envoy log messages and logger scopes can vary by Envoy/Istio version, so operators may need to list available scopes with `istioctl proxy-config log <pod-name>` before setting a specific scope.
