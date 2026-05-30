# Validation Summary: How to Set Up Azure Key Vault Certificate Auto-Renewal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault Certificates
- Azure CLI
- DigiCert CertCentral
- GlobalSign Managed SSL
- Azure App Service
- Azure Application Gateway
- Azure Front Door
- Azure Event Grid

## Sources Consulted
- Microsoft Learn: Integrating Key Vault with Integrated Certificate Authorities - https://learn.microsoft.com/en-us/azure/key-vault/certificates/how-to-integrate-certificate-authority
- Microsoft Learn: About Azure Key Vault certificates - https://learn.microsoft.com/en-us/azure/key-vault/certificates/about-certificates
- Microsoft Learn: Tutorial: Configure certificate autorotation in Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/certificates/tutorial-rotate-certificates
- Microsoft Learn: Renew your Azure Key Vault certificates - https://learn.microsoft.com/en-us/azure/key-vault/certificates/overview-renew-certificate
- Microsoft Learn: Azure CLI az keyvault certificate issuer - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate/issuer
- Microsoft Learn: Azure CLI az keyvault certificate issuer admin - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate/issuer/admin
- Microsoft Learn: Azure CLI az webapp config ssl import - https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl
- Microsoft Learn: Azure CLI az network application-gateway ssl-cert - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/ssl-cert
- Microsoft Learn: TLS termination with Azure Key Vault certificates - https://learn.microsoft.com/en-us/azure/application-gateway/key-vault-certs
- Microsoft Learn: Azure CLI az afd secret - https://learn.microsoft.com/en-us/cli/azure/afd/secret
- Microsoft Learn: Azure Key Vault as Event Grid source - https://learn.microsoft.com/en-us/azure/event-grid/event-schema-key-vault

## Issues Found
- The DigiCert and GlobalSign issuer examples used `--api-key`, which is not a valid `az keyvault certificate issuer create` option. Changed both examples to use `--password`; for DigiCert this is the CertCentral API key, and for GlobalSign this is the account password.
- The GlobalSign setup omitted issuer administrator details required by the Key Vault issuer model. Added an `az keyvault certificate issuer admin add` example with email, name, and phone fields.
- The post claimed the private key never leaves Key Vault even though the sample policy sets `exportable` to `true` and service integrations read certificate secret material. Reworded the explanation to distinguish CA CSR handling from exportable private key access.
- The post implied all applications automatically get the latest certificate. Reworded this to clarify that automatic pickup depends on versionless certificate or secret references and service-specific sync behavior.
- The Azure Monitor metric alert used a nonexistent metric name, `SaturationShoelace`. Removed that invalid example and kept Event Grid monitoring with documented Key Vault certificate event types.
- The Event Grid example only watched near-expiry and expired events. Added `Microsoft.KeyVault.CertificateNewVersionCreated` so renewal success is also visible.
- The best-practices and conclusion sections said CA credential failures would fail silently and that certificate-related outages would never happen. Reworded those claims to be technically accurate and less absolute.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
