# Validation Summary: How to Configure Azure Firewall TLS Inspection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Firewall Premium
- TLS inspection
- Azure Key Vault certificates and secrets
- Azure managed identities
- Azure CLI
- OpenSSL
- Azure Firewall application rules
- Azure Firewall IDPS
- Kusto Query Language for AzureDiagnostics

## Sources Consulted
- Azure Firewall Premium certificates: https://learn.microsoft.com/en-us/azure/firewall/premium-certificates
- Azure Firewall Premium features implementation guide: https://learn.microsoft.com/en-us/azure/firewall/premium-features
- Azure Firewall features by SKU: https://learn.microsoft.com/en-us/azure/firewall/features
- Azure CLI `az network firewall policy`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy
- Azure CLI `az network firewall policy rule-collection-group collection`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Azure CLI `az network firewall policy intrusion-detection`: https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/intrusion-detection
- Azure CLI `az keyvault certificate`: https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Azure CLI `az identity`: https://learn.microsoft.com/en-us/cli/azure/identity

## Issues Found
- The OpenSSL-generated intermediate CA used `pathlen:0` and did not mark `basicConstraints` as critical. Azure Firewall requires the intermediate CA certificate to have critical `BasicConstraints`, `CA=TRUE`, and path length greater than or equal to one. Updated the extension string to `basicConstraints=critical,CA:TRUE,pathlen:1`.
- The PFX export included the full root chain and used a password. Azure Firewall expects a passwordless PFX containing a single certificate and private key when used through Key Vault. Removed `-certfile rootCA.pem` and changed the export to `-passout pass:`.
- The Key Vault import command used a password for the PFX. Updated it to import the passwordless PFX without `--password`.
- The Key Vault access section granted RBAC roles and certificate permissions to a firewall system-assigned identity. Azure Firewall TLS inspection uses the Key Vault Secrets interface, requires secret permissions, and Microsoft documents access policies rather than Azure RBAC for this integration. Reworked the example to create a user-assigned managed identity and grant `get` and `list` secret permissions with `az keyvault set-policy`.
- The firewall policy command used `--identity-type SystemAssigned`, which is not the documented parameter for `az network firewall policy create`. Updated the commands to use `--identity` with the user-assigned managed identity resource ID.
- The policy examples hard-coded a Key Vault secret URL without resolving the certificate's backing secret ID. Updated the commands to retrieve the secret ID with `az keyvault certificate show --query "sid"`.
- The certificate rotation section incorrectly stated that the firewall automatically picks up the new certificate version. Microsoft documentation says to explicitly update the firewall policy TLS setting after importing a new certificate. Updated the rotation steps and command example.
- The IDPS enablement command used `az network firewall policy intrusion-detection update`, which is not a documented command. Updated it to `az network firewall policy update --idps-mode Alert`.
- The troubleshooting text attributed failures to HSTS preloading and CT logs. That is misleading for clients that trust the interception CA. Replaced it with certificate pinning, mutual TLS, and incompatible TLS behavior.
- The performance note compared Premium and Standard handling of TLS inspection even though Standard does not support TLS inspection. Updated the note to state that TLS inspection requires Premium.
- Removed the suggestion to start with TLS inspection in "audit mode" because Azure Firewall TLS inspection is enabled per application rule and the documented IDPS modes are separate from TLS inspection.

## Review Notes
The post is technically relevant and remains a valid Azure Firewall Premium TLS inspection guide after the corrections. The Azure Firewall CLI rule collection command used for application rules is documented as an Azure CLI extension command and may install the extension automatically when run.
