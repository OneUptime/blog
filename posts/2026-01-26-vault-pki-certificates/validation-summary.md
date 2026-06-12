# Validation Summary: How to Implement Vault PKI for Certificate Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault PKI secrets engine
- Vault CLI and Vault policies
- X.509 PKI, TLS certificates, CSRs, CRLs, and certificate revocation
- Python with the hvac client library
- Kubernetes cert-manager Vault issuer
- Kubernetes authentication for Vault

## Sources Consulted
- HashiCorp Vault PKI secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault PKI tutorial: https://developer.hashicorp.com/vault/tutorials/pki/pki-engine
- HashiCorp Vault Kubernetes auth method API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager API reference for Vault issuer authentication fields: https://cert-manager.io/docs/reference/api-docs/
- hvac PKI usage documentation: https://python-hvac.org/en/stable/usage/secrets_engines/pki.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The post stated that Vault PKI provides "automatic revocation." Vault PKI supports certificate revocation, but revocation is not automatic for ordinary issued PKI certificates unless additional lease or operational automation is configured. Changed the wording to "revocation support."
- The `pki_root/root/sign-intermediate` commands did not pass `common_name`. Vault sets the final intermediate certificate subject at signing time and the sign-intermediate endpoint expects the signing request to provide the certificate subject. Added `common_name` to both intermediate signing examples.
- The Python example passed Vault's `expiration` response value directly to `datetime.fromtimestamp()`. Vault documents this field as a Unix timestamp string, while Python expects a numeric POSIX timestamp. Wrapped the value with `int(...)`.
- The cert-manager Vault issuer example used a static Kubernetes auth `secretRef` pattern while describing a service-account-based integration. Updated it to use the current `serviceAccountRef` form, added the required TokenRequest RBAC, and aligned the Vault Kubernetes auth role with the `vault-issuer` service account and ClusterIssuer audience.

## Review Notes
- The examples are version-sensitive around cert-manager's Vault Kubernetes authentication. The updated `serviceAccountRef` approach matches current cert-manager documentation and avoids relying on long-lived service account token secrets.
- The Python "renewal" example reissues a certificate before expiry; Vault PKI certificates themselves are not generally renewable leases unless the role is configured for lease generation.
