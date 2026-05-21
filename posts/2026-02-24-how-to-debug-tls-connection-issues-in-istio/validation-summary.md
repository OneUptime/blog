# Validation Summary: How to Debug TLS Connection Issues in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio service mesh
- Istio mutual TLS
- Istio `PeerAuthentication`
- Istio `DestinationRule`
- Istio ingress gateway TLS
- Envoy proxy logging and secrets
- Kubernetes `kubectl`
- OpenSSL TLS diagnostics

## Sources Consulted
- Istio security problems documentation, including `istioctl proxy-config secret` certificate inspection: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio TLS configuration documentation for `PeerAuthentication`, `DestinationRule`, and Auto mTLS behavior: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio `PeerAuthentication` reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio `istioctl` command reference for `proxy-config log`, `proxy-config secret`, and related flags: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl analyze` diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio `istioctl x describe` documentation, including strict mTLS conflict reporting: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio secure ingress gateway documentation for TLS secrets and `credentialName`: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes node debugging documentation for `kubectl debug node`: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The certificate extraction commands selected `.dynamicActiveSecrets[0]` and `[1]`, which assumes Envoy secret order. Updated them to select the `default` workload certificate and `ROOTCA` CA secret by name, matching Istio's documented examples.
- The Envoy logging command used `tls:debug`, but logger names should be taken from the proxy's logger list or Envoy logger components and can vary by proxy build. Updated the example to `--level debug`, which Istio documents as applying a valid level to all active loggers.
- The manual mTLS test suggested copying sidecar cert files with shell redirection and then connecting to `<service>:15006`. The redirection would write to the local machine, not into the pod, and Kubernetes Services normally do not expose Envoy's inbound capture port. Replaced it with a meshed application-container request, where the sidecar originates Istio mTLS, and kept `openssl s_client` for gateway or external TLS checks from a container that actually has OpenSSL installed.

## Review Notes
The remaining commands and explanations are consistent with current Istio documentation. `istioctl proxy-config log` logger names can vary by proxy build, so operators should list available loggers with `istioctl proxy-config log <pod>` before setting very specific logger scopes.
