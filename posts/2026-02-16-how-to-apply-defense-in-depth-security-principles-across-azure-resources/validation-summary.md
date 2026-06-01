# Validation Summary: How to Apply Defense in Depth Security Principles Across Azure Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Azure
- Microsoft Entra ID and Conditional Access
- Privileged Identity Management
- Microsoft Entra ID Protection
- Azure DDoS Protection
- Azure Firewall
- Azure Front Door and Azure Web Application Firewall
- Azure Virtual Network, Network Security Groups, Private Endpoints, and Azure Bastion
- Microsoft Defender for Cloud, Defender for Servers, and Defender for Containers
- Azure Update Manager
- Azure API Management
- Azure DevOps and GitHub Advanced Security
- Managed identities and Azure Key Vault
- Azure SQL Database security features
- Microsoft Purview Information Protection
- Microsoft Sentinel, Azure Monitor, and Log Analytics

## Sources Consulted
- Microsoft Learn: Enable per-user Microsoft Entra multifactor authentication: https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-userstates
- Microsoft Learn: Microsoft Entra ID Protection risk-based access policies: https://learn.microsoft.com/entra/id-protection/concept-identity-protection-policies
- Microsoft Learn: What is Privileged Identity Management?: https://learn.microsoft.com/en-us/azure/active-directory/privileged-identity-management/pim-configure
- Microsoft Learn: Azure DDoS Protection overview and pricing tiers: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview and https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-pricing-guide
- Microsoft Learn: Azure DDoS Protection FAQ: https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-faq
- Microsoft Learn: Azure Firewall CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Deploy and configure Azure Firewall using Azure CLI: https://learn.microsoft.com/en-us/azure/firewall/deploy-cli
- Microsoft Learn: Azure Front Door DDoS protection and WAF: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-ddos and https://learn.microsoft.com/en-us/azure/frontdoor/web-application-firewall
- Microsoft Learn: Just-in-time machine access: https://learn.microsoft.com/en-us/azure/defender-for-cloud/just-in-time-access-overview
- Microsoft Learn: JIT Network Access Policies REST API: https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies/create-or-update?view=rest-defenderforcloud-2020-01-01
- Microsoft Learn: Azure Update Manager overview and scheduled patching: https://learn.microsoft.com/en-us/azure/update-manager/ and https://learn.microsoft.com/en-us/azure/update-manager/scheduled-patching
- Microsoft Learn: Microsoft Purview Information Protection and AIP client replacement: https://learn.microsoft.com/en-us/purview/sensitivity-labels and https://learn.microsoft.com/en-us/azure/information-protection/about-aip-client
- Microsoft Learn: Azure SQL Database dynamic data masking: https://learn.microsoft.com/en-us/azure/azure-sql/database/dynamic-data-masking-overview
- Microsoft Learn: SQL Server Always Encrypted: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/always-encrypted-database-engine
- Microsoft Learn: Row-level security: https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security

## Issues Found
- The post used the older "Azure AD" name as the primary identity service name. Updated it to "Microsoft Entra ID (formerly Azure AD)".
- The Identity Protection guidance referred broadly to automatic blocking and password resets. Updated it to describe current risk-based Conditional Access controls: block access, require MFA, or require password changes.
- The DDoS section referred to "Azure DDoS Protection Standard" and included application-layer mitigation. Updated it to "Azure DDoS Network Protection" and clarified that Azure DDoS Protection covers layers 3 and 4, with WAF required for application-layer protection.
- The Azure Firewall creation command attached a VNet directly without creating and associating a Standard public IP configuration. Replaced it with the documented CLI sequence: create firewall, create public IP, and create the firewall IP configuration.
- The compute section used "Azure Update Management", which is outdated because Azure Automation Update Management has retired. Updated it to Azure Update Manager.
- The Defender for Servers section did not specify that JIT access requires Defender for Servers Plan 2. Added that plan qualifier.
- The JIT command used `az security jit-policy create`, but the current Azure CLI reference only supports showing and listing JIT policies. Replaced the example with `az rest` against the supported JIT Network Access Policies create-or-update REST API.
- The data section referenced Azure Information Protection for classification and labeling. Updated it to Microsoft Purview Information Protection, noting that the AIP unified labeling client has been replaced.
- The Azure SQL Database claim implied row-level security, dynamic data masking, and Always Encrypted all protect data from database administrators. Updated it to distinguish nonprivileged-user exposure reduction from Always Encrypted's protection against high-privileged users who should not see plaintext data.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI and REST API references rather than local `az --help` output.
