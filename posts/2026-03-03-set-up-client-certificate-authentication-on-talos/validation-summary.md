# Validation Summary: How to Set Up Client Certificate Authentication on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (CertificateSigningRequest API, RBAC, kubeconfig)
- kubectl (config, certificate, auth whoami, delete)
- OpenSSL (RSA/ECDSA key generation, CSR creation, x509 inspection)
- Mutual TLS / PKI
- Bash scripting (jq, base64)

## Sources Consulted
- Kubernetes Certificate Signing Requests reference: https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes Authentication reference (CN → username, O → groups): https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- `kubectl auth whoami` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_whoami/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Talos Linux configuration reference (`cluster.apiServer.extraArgs`): https://www.talos.dev/v1.8/reference/configuration/
- OpenSSL `req`, `genrsa`, `ecparam`, `x509` documentation

## Issues Found
1. **Unsupported field selector in the revocation section.** The original commands used `kubectl delete rolebinding/clusterrolebinding --field-selector="subjects[0].name=jane@example.com"`. The Kubernetes API does not support indexed-array field selectors and only `metadata.name` / `metadata.namespace` are supported as field selectors on RoleBinding and ClusterRoleBinding — the API server returns a BadRequest for the syntax used. Replaced both commands with a working `kubectl get ... -o json | jq ... | xargs/while` pipeline that filters bindings whose `subjects[*].name` matches the user, then deletes them by name (in the right namespace for RoleBindings). The fix preserves the intent (quick RBAC-based "revocation") while producing commands that actually run.

## Review Notes
- `kubectl auth whoami` is correctly referenced and is GA as of Kubernetes 1.30 (alpha in 1.27, beta in 1.28). On most clusters its output will include `system:authenticated` in addition to the certificate-derived groups; the example comment lists only the certificate-derived groups for brevity, which is acceptable for illustration.
- `expirationSeconds: 31536000` (1 year) is valid (minimum is 600), but signers are allowed to issue a shorter certificate if their max duration is lower. This is implementation-dependent and worth being aware of, but the value itself is accepted by the CSR API.
- The Talos `extraArgs` YAML snippet is illustrative; if the OIDC issuer uses a private CA, the user will also need to mount the CA via `cluster.apiServer.extraVolumes` and reference it with the `oidc-ca-file` arg. Not strictly an error in the post, just a caveat for real-world use.
- `openssl ecparam -genkey -name prime256v1` works but is considered legacy in modern OpenSSL (3.x). `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256` is the more current form. The legacy form still works, so left unchanged.
- The CN → username and O → groups mapping is correctly described and matches the Kubernetes authentication docs verbatim.
