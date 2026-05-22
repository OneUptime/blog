# Validation Summary: How to Configure Custom Root CA for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- OpenSSL
- cert-manager
- HashiCorp Vault PKI
- X.509 certificate authorities

## Sources Consulted
- Istio documentation: Plug in CA Certificates - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio documentation: Custom CA Integration using Kubernetes CSR - https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- cert-manager documentation: Securing Istio Service Mesh with istio-csr - https://cert-manager.io/docs/usage/istio-csr/
- HashiCorp Vault documentation: PKI secrets engine quick starts and API reference - https://developer.hashicorp.com/vault/docs/secrets/pki/quick-start-root-ca and https://developer.hashicorp.com/vault/docs/secrets/pki/quick-start-intermediate-ca
- Local OpenSSL command execution to verify the root and intermediate CA generation commands produce a valid chain.

## Issues Found
- The cert-manager example did not form a working Istio external CA configuration. It defined an `Issuer` that referenced a CA secret before creating it, omitted the required self-signed issuer, used the wrong namespace pattern for the cluster issuer CA secret, and did not include the Istio signer-domain, trusted CA, pilot certificate provider, or signer approval RBAC settings used by Istio's Kubernetes CSR integration. I replaced the example with the current cert-manager `ClusterIssuer` pattern and matching `IstioOperator` configuration from Istio's official Kubernetes CSR integration guide.
- The cert-manager section omitted the required cert-manager CSR controller feature gate for this integration path. I added a short prerequisite sentence for `ExperimentalCertificateSigningRequestControllers`.

## Review Notes
The main `cacerts` workflow, required file names, secret name, and offline-root/intermediate-CA recommendation match current Istio documentation. The OpenSSL commands were syntax-checked locally and produced a verifiable intermediate certificate chain. The workload certificate inspection command is operationally plausible, but future revisions could use Istio's official `openssl s_client` verification flow for less dependence on Envoy secret JSON ordering.
