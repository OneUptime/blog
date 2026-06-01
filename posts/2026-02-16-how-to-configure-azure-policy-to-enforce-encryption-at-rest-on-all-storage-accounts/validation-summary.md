# Validation Summary: How to Configure Azure Policy to Enforce Encryption at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage
- Azure Storage encryption at rest
- Customer-managed keys
- Infrastructure encryption
- Azure Policy definitions, assignments, initiatives, and exemptions
- Azure CLI
- JSON policy rules

## Sources Consulted
- Azure Storage encryption for data at rest: https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Enable infrastructure encryption for double encryption of data: https://learn.microsoft.com/en-us/azure/storage/common/infrastructure-encryption-enable
- Azure Policy built-in definitions for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/policy-reference
- Built-in CMK policy source: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Storage/StorageAccountCustomerManagedKeyEnabled_Audit.json
- Built-in infrastructure encryption policy source: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Storage/StorageAccountInfrastructureEncryptionEnabled_Audit.json
- Azure Policy definition structure basics: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Azure Policy rule structure: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Azure CLI policy assignment reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Azure CLI policy definition reference: https://learn.microsoft.com/en-us/cli/azure/policy/definition
- Azure CLI policy set-definition reference: https://learn.microsoft.com/en-us/cli/azure/policy/set-definition
- Azure CLI policy exemption reference: https://learn.microsoft.com/en-us/cli/azure/policy/exemption
- Azure CLI policy state reference: https://learn.microsoft.com/en-us/cli/azure/policy/state

## Issues Found
- The introduction implied Azure Storage encryption at rest can be changed or weakened. Azure Storage encryption is enabled for all storage accounts and cannot be disabled, so the text now clarifies that policy enforcement is for stronger requirements such as CMK or infrastructure encryption.
- The post said the built-in "Storage accounts should use customer-managed key for encryption" policy can deny non-compliant resources. The current built-in policy supports only Audit and Disabled effects, so the guidance now says to use the built-in for auditing and a custom Deny policy for blocking.
- The custom policy snippets were labeled as JSON but contained comments, which makes them invalid JSON. The snippets were changed to valid JSON.
- The custom policy snippets were described as policy definitions but were used with `az policy definition create --rules`, which expects a policy rule. The text and snippets now show policy rules that match the CLI command.
- The infrastructure encryption custom rule compared the alias to a JSON boolean. The built-in policy source compares `Microsoft.Storage/storageAccounts/encryption.requireInfrastructureEncryption` with the string value `"true"`, so the custom rule now follows that pattern.

## Review Notes
- Azure CLI was not installed in the local workspace, so CLI syntax was validated against the current Microsoft Learn CLI reference instead of local `az --help`.
- The built-in infrastructure encryption policy ID and CMK audit policy ID in the post are correct according to the Azure Policy built-in source.
