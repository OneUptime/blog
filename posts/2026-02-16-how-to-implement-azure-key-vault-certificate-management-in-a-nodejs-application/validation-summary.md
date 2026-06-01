# Validation Summary: How to Implement Azure Key Vault Certificate Management in a Node.js Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault Certificates
- Azure Key Vault Secrets
- Azure CLI
- Azure SDK for JavaScript
- Node.js
- Express.js
- TLS/HTTPS certificates

## Sources Consulted
- Azure Key Vault Certificates client library for JavaScript: https://learn.microsoft.com/en-us/javascript/api/overview/azure/keyvault-certificates-readme?view=azure-node-latest
- CertificateClient class reference for JavaScript: https://learn.microsoft.com/en-us/javascript/api/%40azure/keyvault-certificates/certificateclient?view=azure-node-latest
- Azure Key Vault certificate import formats: https://learn.microsoft.com/en-us/azure/key-vault/certificates/certificate-scenarios
- Export certificates from Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/certificates/how-to-export-certificate
- Azure CLI keyvault command reference: https://learn.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest
- Certificate creation methods and partnered CAs: https://learn.microsoft.com/en-us/azure/key-vault/certificates/create-certificate
- About Azure Key Vault certificate renewal: https://learn.microsoft.com/en-us/azure/key-vault/certificates/overview-renew-certificate
- @azure/keyvault-certificates package metadata and type definitions, version 4.10.3: https://www.npmjs.com/package/@azure/keyvault-certificates

## Issues Found
- The access policy granted certificate permissions only, but the examples retrieve certificate private material through the Secrets SDK. Added `--secret-permissions get` so `secretClient.getSecret(name)` is authorized.
- The generated certificate policies did not set `exportable: true`, while later examples retrieve the private key. Added `exportable: true` to the self-signed and integrated CA examples, because non-exportable Key Vault certificate keys are not returned in the addressable secret.
- The PEM import example did not mention Key Vault's private-key format requirement. Updated the comment to state that imported PEM private keys must be unencrypted PKCS#8.
- The HTTPS example split PEM data only on `-----BEGIN RSA PRIVATE KEY-----`, which fails for the PKCS#8 `-----BEGIN PRIVATE KEY-----` format supported by Key Vault. Replaced it with parsing that extracts certificate blocks and RSA, EC, or PKCS#8 private-key blocks.
- The private-key retrieval example assumed `secret.value` always exists. Added an explicit guard before decoding or returning the secret value.
- The manual rotation snippet called `beginCreateCertificate` with an empty policy. Updated it to fetch the existing policy with `getCertificatePolicy()` and pass that policy when creating the next version.
- The scheduled rotation snippet referenced `certClient` and `checkExpiringCertificates` without showing imports. Added the required `require()` calls.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI command validation was performed against Microsoft Learn's Azure CLI reference. The post uses access policies; Azure RBAC is also supported for Key Vault, but the access-policy example remains technically valid.
