# Validation Summary: Configure Calico etcd Certificate Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico etcd datastore
- Kubernetes Secrets
- etcd TLS and mutual TLS
- OpenSSL certificate generation
- cert-manager Issuer and Certificate resources
- X.509 certificate extensions

## Sources Consulted
- Calico documentation: Generating certificates for etcd RBAC - https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- Calico documentation: Kubernetes self-managed installation etcd TLS options - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- etcd documentation: Transport security model - https://etcd.io/docs/v3.6/op-guide/security/
- Kubernetes documentation: kubectl create secret generic reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- cert-manager documentation: CA Issuer configuration - https://cert-manager.io/docs/configuration/ca/
- cert-manager documentation: Certificate resources and target Secret format - https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager API reference: supported key usages - https://cert-manager.io/docs/reference/api-docs/
- Local OpenSSL 3.0.13 CLI help and smoke test output

## Issues Found
- The CA certificate example did not explicitly set CA X.509 extensions. I added an OpenSSL CA config with `basicConstraints = critical,CA:TRUE`, CA signing key usages, and a subject key identifier so the generated certificate is a proper CA certificate rather than relying on local OpenSSL defaults.
- The etcd server certificate example omitted `extendedKeyUsage = serverAuth` and included `nonRepudiation` in key usage. I updated the server certificate config to use `digitalSignature`, `keyEncipherment`, and `serverAuth`, which matches a TLS server certificate use case.
- The Calico client certificate loop generated certificates without explicit client-auth extensions. I added a per-client OpenSSL config and signed each certificate with `extendedKeyUsage = clientAuth`.
- The Kubernetes Secret example used `calico-etcd-certs`. Calico's documented self-managed manifest expects `calico-etcd-secrets` with `etcd-ca`, `etcd-cert`, and `etcd-key`, so I updated the command to use the documented Secret name.
- The cert-manager `Issuer` referenced `calico-etcd-ca-secret` without showing the required CA Secret format. I added a `kubectl create secret tls` command so the Secret contains the `tls.crt` and `tls.key` keys required by cert-manager CA issuers.
- The cert-manager example did not mention that generated Certificate Secrets use `tls.crt`, `tls.key`, and usually `ca.crt`, while Calico manifests expect `etcd-cert`, `etcd-key`, and `etcd-ca`. I added a note to map or copy those keys before mounting them with the standard Calico manifests.

## Review Notes
- The OpenSSL snippets were smoke-tested locally with OpenSSL 3.0.13. The generated server and client certificates verify against the generated CA, and the expected `serverAuth`, `clientAuth`, and SAN extensions are present.
- `kubectl` was not installed in the local environment, so Kubernetes CLI syntax was checked against the official Kubernetes reference instead of local command output.
- The example SAN values and component common names are placeholders. Operators still need to replace them with their actual etcd DNS names/IPs and etcd usernames or RBAC identities.
