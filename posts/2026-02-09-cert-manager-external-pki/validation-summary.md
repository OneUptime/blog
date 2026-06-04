# Validation Summary: How to Implement cert-manager Integration with External PKI Infrastructure

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- cert-manager
- HashiCorp Vault PKI secrets engine
- Venafi / CyberArk Certificate Manager Self-Hosted
- Microsoft Active Directory Certificate Services
- EJBCA
- Prometheus Operator rules
- Hardware Security Modules / Vault managed keys
- Go controller-runtime
- Python Flask and requests

## Sources Consulted
- cert-manager Vault issuer documentation: https://cert-manager.io/v1.14-docs/configuration/vault/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager external issuer documentation: https://cert-manager.io/docs/contributing/external-issuers/
- cert-manager issuer list: https://cert-manager.io/docs/configuration/issuers/
- cert-manager cmctl documentation: https://cert-manager.io/v1.11-docs/reference/cmctl/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.16-docs/devops-tips/prometheus-metrics/
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- EJBCA REST interface documentation: https://docs.keyfactor.com/ejbca/9.4.2/ejbca-rest-interface
- EJBCA cert-manager issuer README: https://github.com/Keyfactor/ejbca-cert-manager-issuer
- ADCS issuer documentation: https://github.com/djkormo/adcs-issuer
- CyberArk / Venafi cert-manager issuer documentation: https://cert-manager.io/v1.8-docs/configuration/venafi/

## Issues Found
- The Venafi section installed `venafi-enhanced-issuer` but then used the in-tree `cert-manager.io/v1` Venafi issuer. Changed the installation text and Helm command to install cert-manager and note that the Venafi issuer is built in.
- The Vault Kubernetes authentication example referenced a token secret that was never created. Added creation of a dedicated service account and a `kubernetes.io/service-account-token` Secret, and updated the Vault role and issuer to use it.
- The external PKI overview described the CA issuer as "external signing." Changed this to "imported key pairs" because cert-manager's CA issuer signs with a CA certificate and private key stored in a Kubernetes Secret.
- The AD CS CA issuer section created a Secret but did not show the corresponding `ClusterIssuer`. Added the missing `spec.ca.secretName` example.
- The AD CS external issuer example used a non-existent `spec.externalIssuer` field on cert-manager `ClusterIssuer`. Replaced it with the documented ADCS issuer CRD shape.
- The EJBCA REST example used `/certificate/pkcs10` and sent a base64-encoded CSR. Changed the endpoint to `/certificate/pkcs10enroll` and send the PEM CSR string as documented.
- The manual approval example used `kubectl certificate approve`, which is for Kubernetes CertificateSigningRequests, and an invalid `cmctl approve certificaterequest` form. Replaced it with `cmctl approve <name>`.
- The Vault HSM example used unsupported `pki/config/keys` parameters such as `hsm=true` and `key_label`. Replaced it with `pki/root/generate/kms` using `managed_key_name`.
- The monitoring example referenced `certmanager_certificaterequest_failed_total`, which is not a documented cert-manager metric. Replaced it with a cert-manager scrape target health alert.

## Review Notes
The custom issuer and approval controller Go snippets are simplified sketches rather than complete controllers. A production external issuer should follow cert-manager's external issuer guidance, check CertificateRequest approval before signing, set Ready/Failure conditions, and include RBAC for the approval subresource where applicable.
