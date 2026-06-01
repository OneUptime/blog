# Validation Summary: How to Achieve PCI DSS Compliance for Payment Processing Workloads in Azure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure
- PCI DSS
- Azure CLI
- Azure Virtual Network and Network Security Groups
- Azure SQL Database
- Azure App Service
- Azure Storage encryption
- Azure Key Vault
- Microsoft Entra ID
- Azure RBAC
- Azure Monitor and Log Analytics
- Microsoft Defender for Cloud and Defender for Servers
- Azure Update Manager
- Azure Application Gateway WAF
- Azure Policy
- Microsoft Purview Compliance Manager

## Sources Consulted
- Microsoft Azure PCI DSS compliance offering: https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-pci-dss
- PCI SSC PCI DSS v4.0 publication and transition information: https://www.pcisecuritystandards.org/about_us/press_releases/securing-the-future-of-payments-pci-ssc-publishes-pci-data-security-standard-v4-0/
- PCI SSC PCI DSS v4.0.1 publication note: https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1
- Azure CLI `az network nsg rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure CLI `az sql server update` reference: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Azure CLI `az webapp config set` and App Service TLS guidance: https://learn.microsoft.com/en-us/cli/azure/webapp/config and https://learn.microsoft.com/en-us/azure/app-service/tls-minimum-version
- Azure Storage encryption and customer-managed key guidance: https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Azure SQL TDE with customer-managed keys: https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-database-level-overview
- Azure SQL auditing and CLI audit policy guidance: https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-setup and https://learn.microsoft.com/en-us/cli/azure/sql/server/audit-policy
- Azure Monitor diagnostic settings and Log Analytics retention guidance: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings and https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Azure Update Manager overview: https://learn.microsoft.com/en-us/azure/update-center/overview
- Azure penetration testing rules: https://learn.microsoft.com/en-gb/azure/security/fundamentals/pen-testing
- Azure Policy PCI DSS v4.0 regulatory compliance details and built-in initiative source: https://learn.microsoft.com/en-us/azure/governance/policy/samples/pci-dss-4-0 and https://github.com/Azure/azure-policy
- Microsoft Purview Compliance Manager: https://learn.microsoft.com/en-us/purview/compliance-manager

## Issues Found
- Updated the Azure PCI DSS statement to reflect Azure's PCI DSS validation and Service Provider Level 1 wording, rather than implying every Azure infrastructure component automatically makes hosted workloads compliant.
- Added the missing `appgw-subnet` creation command because the NSG example allowed traffic from `10.1.3.0/24` but the subnet was not created.
- Corrected PCI DSS encryption wording so Requirement 4 is described as protecting cardholder data over open, public networks with strong cryptography.
- Updated Azure Active Directory references to Microsoft Entra ID and Azure AD Conditional Access to Microsoft Entra Conditional Access.
- Updated Defender for Cloud wording from enhanced security features to relevant Defender plans.
- Replaced the SQL diagnostic-settings example with the current server audit-policy command for sending Azure SQL audit logs to Log Analytics, and added a workspace retention command because diagnostic-setting retention only applies to storage-account destinations.
- Changed Azure Update Management to Azure Update Manager because the older Azure Automation Update Management solution has retired.
- Corrected the penetration testing statement: Azure no longer requires prior Microsoft approval for permitted tests against the customer's own Azure resources, but customers must follow the Rules of Engagement.
- Updated the Azure Policy example from the older PCI DSS v3.2.1 initiative to the PCI DSS v4 built-in initiative.
- Updated Azure Compliance Manager to Microsoft Purview Compliance Manager.
- Updated the final PCI DSS version note to mention PCI DSS v4.0.1 as the current PCI SSC-supported v4 version.

## Review Notes
The post is now technically valid as a practical overview, but a real PCI DSS implementation still requires environment-specific scoping, control ownership review, evidence collection, and QSA validation. Azure Policy compliance results remain a partial view of PCI DSS compliance and should not be treated as proof of full compliance.
