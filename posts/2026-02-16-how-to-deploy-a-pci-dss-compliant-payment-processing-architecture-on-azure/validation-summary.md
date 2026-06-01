# Validation Summary: How to Deploy a PCI DSS Compliant Payment Processing Architecture on Azure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PCI DSS
- Microsoft Azure
- Azure CLI
- Azure Virtual Network and Network Security Groups
- Azure Front Door Web Application Firewall
- Azure SQL Database Transparent Data Encryption
- Azure Key Vault
- Microsoft Entra ID and Azure RBAC
- Azure Monitor and Log Analytics
- Microsoft Defender for Cloud
- Payment tokenization

## Sources Consulted
- Microsoft Azure PCI DSS compliance offering: https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-pci-dss
- Azure SQL TDE with customer-managed keys: https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-configure
- Azure SQL server key CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/server/key
- Azure SQL server TDE key CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/server/tde-key
- Azure Key Vault key CLI reference: https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- Azure Key Vault keys overview: https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys
- Azure SQL auditing setup: https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-setup
- Azure SQL audit-policy CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/db/audit-policy
- Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- Azure Front Door WAF policy CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy
- Azure Front Door WAF custom rule CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/front-door/waf-policy/rule
- Microsoft Entra ID rename guidance: https://learn.microsoft.com/en-us/entra/fundamentals/new-name
- Microsoft Defender for Cloud pricing CLI reference: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- PCI Security Standards Council FAQ on PCI DSS Requirement 8.4.2 MFA: https://www.pcisecuritystandards.org/faqs/why-do-requirements-8-3-9-and-8-3-10-1-focus-on-passwords-passphrases-used-for-single-factor-authentication-when-multi-factor-authentication-is-required-for-all-access-into-the-cde/
- PCI DSS v4.0.1 Requirements and Testing Procedures, especially Requirements 6.4.2, 8.4.2, 8.4.3, and 10.5.1: https://www.pcisecuritystandards.org/document_library/

## Issues Found
- The shared responsibility description was too narrow. Updated it to reflect that Microsoft validates Azure services, while customer data, identities, application configuration, and deployed workloads remain the customer's responsibility.
- The architecture section incorrectly implied that only the payment service was in scope even if the business logic layer transmits un-tokenized card data. Clarified that any component transmitting un-tokenized card data remains in PCI scope unless hosted fields or tokenization keep it out of the CDE.
- The network segmentation section said PCI DSS Requirement 1 mandates segmentation. Updated it to say Requirement 1 covers network security controls and that segmentation reduces CDE scope.
- The Key Vault command created an `RSA` software-protected key despite describing HSM-backed keys. Changed the key type to `RSA-HSM`.
- The Azure SQL TDE example omitted the `az sql server key create` and `az sql db tde set` steps and used the wrong `--server-name` option for TDE subcommands. Added the missing commands, corrected the option to `--server`, and noted the SQL server managed identity key-permission prerequisite.
- The identity section used the older Azure Active Directory product name. Updated it to Microsoft Entra ID, formerly Azure Active Directory.
- The MFA claim referenced PCI DSS 3.2.1 and remote CDE access only. Updated it to PCI DSS v4.0.1 Requirements 8.4.2 and 8.4.3.
- The SQL logging example used diagnostic settings for `SQLSecurityAuditEvents` without enabling Azure SQL auditing. Added `az sql db audit-policy update` for Log Analytics and retained diagnostic settings for metrics.
- The audit retention claim used older wording. Updated it to PCI DSS v4.0.1 Requirement 10.5.1: at least 12 months retained, with the most recent three months immediately available.
- The WAF section referenced PCI DSS Requirement 6.6 and the old WAF-or-code-review framing. Updated it to PCI DSS v4.0.1 Requirement 6.4.2 and the automated technical solution requirement.
- The Azure Front Door managed rule set used `DefaultRuleSet` version `1.0`. Updated it to the current Microsoft managed rule set name and version, `Microsoft_DefaultRuleSet` `2.2`.
- The Azure Front Door rate limit rule used `--rate-limit-duration-in-minutes`, which is not the current CLI flag, and omitted a match condition. Changed it to `--rate-limit-duration` and added a `RemoteAddr` match condition.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output. The guide still assumes pre-existing resources such as the resource group, Azure SQL server, database, App Service instances, private endpoints, and Front Door profile; that is acceptable for this architecture-focused post but should be made explicit if the article is later expanded into a fully runnable deployment.
