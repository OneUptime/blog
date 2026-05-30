# Validation Summary: How to Set Up Azure Policy for Financial Services Regulatory Compliance Auditing

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Azure Policy
- Azure Policy built-in initiatives
- Azure CLI
- Azure Resource Graph
- Azure SQL Database Transparent Data Encryption
- Azure Key Vault diagnostic settings
- Azure Policy remediation tasks
- Azure Policy exemptions

## Sources Consulted
- Microsoft Learn: Azure CLI `az policy assignment` reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI `az policy definition` reference: https://learn.microsoft.com/en-us/cli/azure/policy/definition
- Microsoft Learn: Azure CLI `az policy remediation` reference: https://learn.microsoft.com/en-us/cli/azure/policy/remediation
- Microsoft Learn: Azure CLI `az policy exemption` reference: https://learn.microsoft.com/en-us/cli/azure/policy/exemption
- Microsoft Learn: Azure CLI `az graph` reference: https://learn.microsoft.com/en-us/cli/azure/graph
- Microsoft Learn: Azure Policy assignment structure and enforcement mode: https://learn.microsoft.com/azure/governance/policy/concepts/assignment-structure
- Microsoft Learn: Azure Policy remediation structure: https://learn.microsoft.com/azure/governance/policy/concepts/remediation-structure
- Microsoft Learn: Azure Policy exemption structure: https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure
- Microsoft Learn: Azure Storage encryption for data at rest: https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Azure/azure-policy built-in policy repository: https://github.com/Azure/azure-policy

## Issues Found
- The post used the older PCI DSS 3.2.1 initiative and policy set ID. Updated the list and CLI example to PCI DSS v4.0.1 and the current built-in initiative ID `a06d5deb-24aa-4991-9d58-fa7563154e31`.
- The SQL TDE custom policy example used a direct `audit` effect against a child-resource alias in a way that would not reliably evaluate SQL database TDE. Replaced it with the built-in pattern using `AuditIfNotExists`, `Microsoft.Sql/servers/databases/transparentDataEncryption`, and the current TDE aliases.
- The custom policy CLI example passed `--rules ./tde-policy-rule.json`, but the preceding JSON was a full policy-definition-shaped object. Changed the snippet to be the rule object that `--rules` expects and added one sentence explaining how to wrap it for full policy-definition files.
- The Key Vault diagnostic settings assignment used an audit policy ID with a Log Analytics parameter name that belongs to a deploy policy. Updated the example to use the built-in deploy policy ID `bef3f64c-5290-43b7-85b0-9b254eef4c47` and the correct `logAnalytics` parameter.
- The remediation example referred to storage accounts without encryption. Azure Storage encryption is enabled by default and cannot be disabled, so the example now remediates Key Vault diagnostic settings, matching the previous DeployIfNotExists policy.
- The Resource Graph query used a case-sensitive type comparison and uncast dynamic property comparison. Updated it to use `=~` and `tostring(properties.complianceState)`.
- Updated outdated initiative names in the examples list from SOC 2 Type II and ISO 27001:2013 to SOC 2 2023 and ISO/IEC 27001:2022.

## Review Notes
The examples still use placeholder subscription, resource group, and workspace IDs, which is appropriate for a tutorial. The local environment did not have Azure CLI installed, so CLI syntax was validated against Microsoft Learn and the Azure Policy built-in definitions repository rather than local `az --help` output.
