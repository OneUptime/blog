# Validation Summary: How to Secure Basic Configuration in Cilium Hubble

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Cilium
- Hubble and Hubble Relay
- Hubble UI
- Kubernetes
- Helm
- CiliumNetworkPolicy
- oauth2-proxy

## Sources Consulted
- Cilium Hubble TLS configuration: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium v1.19.3 Helm values source: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- oauth2-proxy provider documentation: https://www.oauth2-proxy.dev/configuration/providers/

## Issues Found
- The introduction incorrectly said Relay communicates with agents over plain gRPC by default. Current Cilium documentation states that Hubble server to Hubble Relay communication is secured with mTLS by default when Relay is deployed. Updated the wording to distinguish default Relay-to-server mTLS from the separately configured client-facing Relay TLS endpoint.
- The post described securing "all inter-component communication" as if TLS was entirely absent by default. Updated the description to say the guide verifies and enables TLS for Hubble communication paths.
- The cert-manager prerequisite implied cert-manager was needed for automated TLS certificate management generally. Updated it to clarify cert-manager is optional and only needed for the `certmanager` TLS generation method.
- The Hubble CLI verification commands omitted the required TLS flags after enabling TLS on the Hubble Relay server. Added the documented `hubble-relay-server-certs` CA extraction and `--tls`, `--tls-ca-cert-files`, and `--tls-server-name` flags.
- The Hubble UI Helm values used non-existent `hubble.ui.podSecurityContext` and top-level `hubble.ui.securityContext` as if it were the container security context. Updated the snippet to use `hubble.ui.securityContext` for the pod security context and `hubble.ui.frontend.securityContext` / `hubble.ui.backend.securityContext` for container settings.
- The security context verification commands piped normal `jsonpath` object output into `python3 -m json.tool`, which is unreliable because normal kubectl jsonpath output is not guaranteed JSON. Updated them to use `jsonpath-as-json`.
- The TLS verification checked for `hubble-tls` secrets, but current Cilium-generated secrets are named like `hubble-server-certs`, `hubble-relay-server-certs`, and `hubble-relay-client-certs`. Updated the check to match Hubble certificate secrets and verify `hubble-disable-tls`.
- The unauthorized-access test used `http://hubble-relay.kube-system:4245`, but the Hubble Relay Kubernetes service uses port 443 when server TLS is enabled. Updated it to test `https://hubble-relay.kube-system.svc:443`.

## Review Notes
The network policy examples are structurally valid CiliumNetworkPolicy resources, but production clusters should adjust selectors and allow rules to match their actual Prometheus, operator, ingress, and port-forward access patterns. The oauth2-proxy deployment is intentionally minimal and still requires a correctly populated `hubble-ui-oauth-config` secret and provider redirect URI configuration.
