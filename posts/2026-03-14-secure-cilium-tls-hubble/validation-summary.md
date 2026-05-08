# Validation Summary: How to Secure Cilium TLS with Hubble Configuration

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- cert-manager
- TLS and mTLS
- OpenSSL
- Prometheus metrics

## Sources Consulted
- Cilium Hubble TLS configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium v1.19.3 Hubble cert-manager chart templates: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium/templates/hubble/tls-certmanager
- Cilium v1.19.3 Hubble peer Service template: https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/templates/hubble/peer-service.yaml
- cert-manager CA Issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager documentation home: https://cert-manager.io/docs/
- Kubernetes CronJob schedule documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#schedule-syntax

## Issues Found
- The Helm values referenced a `ClusterIssuer` named `hubble-ca-issuer`, while the example created a separate CA issuer named `hubble-issuer`. I changed the Helm values to reference the CA-backed issuer actually intended to sign Cilium's generated Hubble certificates.
- The example created a `ClusterIssuer` whose CA Secret lived in `kube-system`. cert-manager expects a CA `Issuer` Secret in the same namespace as the `Issuer`, or a `ClusterIssuer` Secret in cert-manager's cluster resource namespace. I changed the CA issuer to a namespaced `Issuer` in `kube-system`.
- The Helm snippet set `hubble.relay.tls.client` to a null value with only a comment. That can override the chart's expected object value. I removed the null client block.
- The post claimed mTLS for all Hubble components, but the provided values configure mTLS between Cilium agents and Hubble Relay, while Relay's client-facing server TLS is separate. I adjusted the section heading to match the configuration.
- The RBAC example omitted `hubble-relay-server-certs`, which is the Secret generated when `hubble.relay.tls.server.enabled=true`. I added it to the allowed Secret names.
- The TLS inspection commands executed `sh` and `openssl` inside Cilium and Hubble Relay containers, which is not a reliable assumption for current container images. I changed the checks to use `kubectl port-forward` and local `openssl`.
- The certificate-chain verification command read `ca.crt` from the bootstrap CA Secret. cert-manager's issued Hubble Secret is the reliable source for the CA bundle used with the issued server certificate, so I changed the command to read `ca.crt` from `hubble-server-certs`.
- The rotation guidance overstated cert-manager automation for CA-backed issuers. cert-manager renews issued Hubble certificates, but CA issuer rotation still requires operator planning. I clarified the rotation note and conclusion.

## Review Notes
The guide is technically valid after the fixes. For production, the self-signed bootstrap CA is only an example; operators should still use their organization's approved CA, Vault, ACME, or another cert-manager issuer where appropriate. The article also mentions cipher suite selection, but Cilium's public Helm values do not expose a simple Hubble cipher-suite setting; the verification commands can confirm negotiated TLS details, but this guide does not currently show how to configure explicit cipher suites.
