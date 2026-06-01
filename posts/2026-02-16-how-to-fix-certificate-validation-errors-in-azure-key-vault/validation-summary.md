# Validation Summary: How to Fix Certificate Validation Errors in Azure Key Vault

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Key Vault certificates
- Azure CLI
- OpenSSL
- PEM and PFX/PKCS#12 certificate formats
- Azure RBAC and Key Vault access policies
- TLS/SSL certificate chains and renewal policies

## Sources Consulted
- Microsoft Learn: Import a certificate in Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/certificates/tutorial-import-certificate
- Microsoft Learn: Get started with Key Vault certificates: https://learn.microsoft.com/en-us/azure/key-vault/certificates/certificate-scenarios
- Microsoft Learn: Azure CLI `az keyvault certificate`: https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az keyvault certificate pending`: https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate/pending?view=azure-cli-latest
- Microsoft Learn: Certificate access control: https://learn.microsoft.com/en-us/azure/key-vault/certificates/certificate-access-control
- Microsoft Learn: Azure Key Vault RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure Key Vault certificate policy REST reference: https://learn.microsoft.com/en-us/rest/api/keyvault/certificates/get-certificate-policy/get-certificate-policy?view=rest-keyvault-certificates-2025-07-01
- Microsoft Learn: Azure Key Vault import certificate REST reference: https://learn.microsoft.com/en-us/rest/api/keyvault/certificates/import-certificate/import-certificate?view=rest-keyvault-certificates-2025-07-01
- OpenSSL documentation / local OpenSSL 3.0.13 help availability for `pkcs12`, `pkcs8`, `pkey`, `rsa`, `x509`, and `verify` command usage.

## Issues Found
- The PEM import guidance did not mention Azure Key Vault's requirement for an unencrypted PKCS#8 private key. Updated the explanation and PEM creation command to convert the private key with `openssl pkcs8` before concatenating it with the certificate.
- The private key validation example used `openssl rsa`, which only applies to RSA keys. Replaced the general private key check with `openssl pkey`; kept the modulus comparison explicitly scoped to RSA certificates.
- The chain-validation section implied that Key Vault validates the full CA chain during import. Revised the wording to say Key Vault stores the provided certificate material and downstream services need the complete chain.
- The access-control explanation overstated that every use case requires permissions on certificate, secret, and key objects. Updated it to explain that required permissions depend on which object types the application reads or uses.
- The RBAC example used `Key Vault Certificates Officer` for a retrieval scenario. Changed it to `Key Vault Certificate User`, which is the documented role for reading full certificate contents including secret and key portions.
- The content type examples used an unsupported Azure CLI flag, `--content-type`, on `az keyvault certificate import`. Replaced those examples with `--policy` JSON using `secret_props.contentType`.
- The certificate creation policy example used camelCase property names that do not match the Key Vault certificate policy schema. Updated the JSON to use `issuer`, `key_props`, `lifetime_actions`, `secret_props`, and `x509_props` with the documented nested field names.
- The certificate inspection query referenced old camelCase policy paths. Updated the JMESPath query to use `policy.x509_props.subject` and `policy.issuer.name`.

## Review Notes
- The local environment did not have Azure CLI installed, so CLI validation was performed against current Microsoft Learn Azure CLI documentation rather than local `az --help` output.
- The post remains a practical troubleshooting guide. Future improvements could include a separate EC-key example, since the RSA modulus comparison is only valid for RSA certificates.
