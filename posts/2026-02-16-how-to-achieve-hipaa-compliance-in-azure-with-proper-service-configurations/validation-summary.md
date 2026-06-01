# Validation Summary: How to Achieve HIPAA Compliance in Azure with Proper Service Configurations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Azure
- Azure CLI
- Azure Key Vault
- Azure Storage
- Azure SQL Database
- Azure App Service
- Azure RBAC
- Microsoft Entra Conditional Access
- Azure Virtual Network and Network Security Groups
- Azure Private Link private endpoints
- Azure Monitor and Log Analytics
- Azure Policy HIPAA/HITRUST initiative
- HIPAA Security Rule and Breach Notification Rule

## Sources Consulted
- Microsoft Learn: HIPAA - Azure Compliance: https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hipaa-us
- Microsoft Learn: HITRUST - Azure Compliance: https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hitrust
- Microsoft Learn: Regulatory Compliance details for HIPAA HITRUST - Azure Policy: https://learn.microsoft.com/en-us/azure/governance/policy/samples/hipaa-hitrust
- Microsoft Learn: Azure Policy assignment CLI reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure Storage account CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure Storage container immutability-policy CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/container/immutability-policy
- Microsoft Learn: Azure Key Vault CLI reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Azure Key Vault key CLI reference: https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- Microsoft Learn: Azure SQL server CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Microsoft Learn: Azure SQL server audit-policy CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/server/audit-policy
- Microsoft Learn: Azure SQL auditing overview and setup: https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-overview
- Microsoft Learn: Azure SQL audit log format: https://learn.microsoft.com/en-us/azure/azure-sql/database/audit-log-format
- Microsoft Learn: Azure Monitor diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure Monitor subscription diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings/subscription
- Microsoft Learn: Azure Monitor scheduled-query CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Microsoft Learn: Azure Monitor Logs retention and archive: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-archive
- HHS: Summary of the HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS: Breach Notification Rule: https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html

## Issues Found
- The BAA description referenced the older Online Services Terms wording. Updated it to Microsoft Product Terms and the Microsoft Products and Services Data Protection Addendum (DPA), matching current Microsoft compliance guidance.
- The identity service name used "Azure Active Directory / Entra ID". Updated it to Microsoft Entra ID.
- The post stated that HIPAA requires encryption at rest and in transit. Updated this to explain that encryption is an addressable HIPAA Security Rule implementation specification, while still recommending encryption for Azure ePHI workloads.
- The post claimed all Azure services encrypt data at rest by default. Narrowed this to core Azure data services to avoid an overbroad claim.
- The Key Vault create command included `--enable-soft-delete true`, which is no longer needed for current Key Vault creation. Removed it and kept purge protection and retention configuration.
- The SQL TDE CMK example referenced `sql-encryption-key` without creating it. Added a matching Key Vault key creation command.
- The custom RBAC role placed a storage blob data-plane operation in `NotActions`. Moved it to `NotDataActions` and added an explicit empty `DataActions` list.
- The data subnet NSG was created but never associated with the subnet. Added a subnet update command to attach `data-subnet-nsg`.
- The Azure SQL audit logging example used generic diagnostic settings on the SQL server resource. Replaced it with `az sql server audit-policy update` using Log Analytics target settings, which is the documented path for Azure SQL audit logs.
- The Activity Log forwarding command used resource diagnostic settings against the subscription ID. Replaced it with `az monitor diagnostic-settings subscription create`.
- Diagnostic settings included `retentionPolicy` entries while sending logs to Log Analytics. Removed those entries because Log Analytics retention is controlled at workspace/table level.
- The post said HIPAA requires audit logs to be retained for six years. Updated it to the more precise Security Rule documentation-retention requirement and described audit evidence/log retention as a policy and risk-analysis decision.
- The immutable-storage example created a policy on a container that did not exist. Added a container creation command and enabled protected append writes on the immutability policy.
- The scheduled-query alert used an invalid current CLI condition format. Updated it to use a named query placeholder with `--condition-query`.
- The summary overstated customer-managed keys as a blanket HIPAA requirement. Reworded it to appropriate encryption and key management.

## Review Notes
The examples remain illustrative and assume prerequisite resources, identities, Key Vault permissions, and variables already exist. Production HIPAA compliance also requires organizational controls, risk analysis, policies, workforce training, incident response, and legal review beyond Azure resource configuration.
