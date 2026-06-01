# Validation Summary: How to Configure Azure Policy to Require Private Endpoints on All PaaS Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Policy
- Azure Policy initiatives
- Azure Private Link and private endpoints
- Azure Storage
- Azure SQL Database
- Azure Key Vault
- Azure Cosmos DB
- Azure Cache for Redis
- Azure Event Hubs
- Azure CLI
- Azure Private DNS
- Bicep

## Sources Consulted
- Azure CLI `az policy assignment` documentation: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Azure CLI `az policy set-definition` documentation: https://learn.microsoft.com/en-us/cli/azure/policy/set-definition
- Azure CLI `az policy state` documentation: https://learn.microsoft.com/en-us/cli/azure/policy/state
- Azure CLI `az network private-endpoint` documentation: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI `az network private-endpoint dns-zone-group` documentation: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Azure CLI `az network private-dns zone` documentation: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/zone
- Azure Storage built-in policy definitions: https://learn.microsoft.com/en-us/azure/storage/common/policy-reference
- Azure Policy built-in Storage private link definition source: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Storage/StorageAccountPrivateEndpointEnabled_Audit.json
- Azure Policy built-in Storage public network access definition source: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Storage/StoragePublicNetworkAccess_AuditDeny.json
- Azure Key Vault built-in policy definitions: https://learn.microsoft.com/en-us/azure/key-vault/policy-reference
- Azure Cosmos DB built-in policy definitions: https://learn.microsoft.com/en-us/azure/cosmos-db/policy-reference
- Azure Cache for Redis built-in policy definitions: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/policy-reference
- Azure Event Hubs built-in policy definitions: https://learn.microsoft.com/en-us/azure/event-hubs/policy-reference
- Azure SQL Private Link documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview
- Azure Storage private endpoint documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Bicep/ARM reference for Microsoft.Storage storageAccounts: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts

## Issues Found
- The Storage private link built-in policy was assigned with `Audit`, but its supported effect is `AuditIfNotExists` or `Disabled`. Changed the Storage assignment and initiative parameter to `AuditIfNotExists`.
- The SQL private endpoint policy name did not match the current Azure Policy built-in wording. Updated it to `Private endpoint connections on Azure SQL Database should be enabled`.
- The Key Vault private link built-in policy uses the `audit_effect` parameter in the current built-in reference. Updated the assignment and initiative mapping from `effect` to `audit_effect`.
- The initiative used one shared `effect` parameter for policies with different supported effect values. Replaced it with service-specific parameters.
- The initiative was created but not assigned before later compliance and exemption examples referenced its assignment. Added an `az policy assignment create` example for the initiative.
- The post claimed private endpoint policies could simply be switched to Deny to block all PaaS resources without private endpoints. Updated the guidance to use Deny for public network access policies and keep private endpoint checks in supported audit/deploy modes.
- The custom private endpoint policy allowed `Deny`, which can block creation before a separately deployed private endpoint exists. Limited the example to `Audit` and `Disabled`.
- JSON policy examples contained JavaScript-style comments inside `json` code fences. Removed the comments so the snippets are valid JSON.
- The IaC section described a generic Deny policy catching private endpoint non-compliance. Clarified that the Deny policy is for public network access.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
