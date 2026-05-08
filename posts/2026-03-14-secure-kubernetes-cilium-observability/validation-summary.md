# Validation Summary: How to Secure Kubernetes in Cilium Observability

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Kubernetes RBAC
- CiliumNetworkPolicy
- Helm
- cert-manager
- TLS and mTLS

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Configure TLS with Hubble: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Network Observability with Hubble: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Layer 7 Protocol Visibility: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Using Kubernetes Constructs in Policy: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Kubernetes RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl auth can-i Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl port-forward Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The TLS verification command used `cilium status | grep -i tls`, which is not the official Hubble TLS validation shown in Cilium docs. Changed it to check `hubble-disable-tls` in the `cilium-config` ConfigMap and to verify the relevant Hubble TLS secrets.
- The Hubble Relay service test used port `4245` directly against the Kubernetes Service. Cilium documents port-forwarding the `hubble-relay` service through service port `80`, which targets Relay's `4245` listener. Changed the in-cluster test to use `hubble-relay.kube-system.svc.cluster.local:80`.
- Cross-namespace CiliumNetworkPolicy selectors omitted the documented `k8s:io.kubernetes.pod.namespace` label key. Updated the Prometheus and ingress-nginx selectors accordingly.
- The Hubble redaction Helm values used outdated flat keys such as `hubble.redact.httpURLQuery`, `hubble.redact.httpUserInfo`, and `hubble.redact.kafkaApiKey`. Updated the examples to current nested HTTP redaction keys: `hubble.redact.http.urlQuery`, `hubble.redact.http.userInfo`, and `hubble.redact.http.headers.deny`.
- The troubleshooting section referenced a non-current Hubble CLI flag, `--tls-allow-server-name`. Replaced it with the documented `--tls-server-name` guidance.
- The diagram labeled Hubble CLI to Hubble Relay as mTLS even though the shown values only enable server TLS for Relay. Changed that edge to TLS while keeping Relay-to-agent mTLS.
- The redaction troubleshooting note claimed a specific Cilium 1.15+ requirement without an official version-specific source in the current docs. Reworded it to advise verifying support for the configured redaction settings in the installed Cilium version.

## Review Notes
The remaining examples are version-sensitive because Cilium Helm values and Hubble TLS behavior can vary by Cilium release and chart defaults. The post now aligns with the current stable Cilium documentation checked on 2026-05-08, but operators should still verify labels and enabled metrics ports in their own installation before applying the sample policies.
