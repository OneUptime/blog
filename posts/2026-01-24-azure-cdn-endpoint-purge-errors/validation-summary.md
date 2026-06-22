# Validation Summary: How to Fix 'CDN Endpoint' Purge Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure CDN
- Azure CLI
- Azure SDK for Python (`azure-mgmt-cdn`, `azure-identity`)
- Azure RBAC
- Azure Pipelines
- Bash
- Python

## Sources Consulted
- Microsoft Learn: Azure CLI `az cdn endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az cdn endpoint rule` reference - https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule?view=azure-cli-latest
- Microsoft Learn: Azure SDK for Python `EndpointsOperations.begin_purge_content` - https://learn.microsoft.com/en-us/python/api/azure-mgmt-cdn/azure.mgmt.cdn.operations.endpointsoperations?view=azure-python
- Microsoft Learn: Azure SDK for Python `PurgeParameters` - https://learn.microsoft.com/en-us/python/api/azure-mgmt-cdn/azure.mgmt.cdn.models.purgeparameters?view=azure-python
- Microsoft Learn: Azure CDN purge REST API - https://learn.microsoft.com/en-us/rest/api/cdn/endpoints/purge-content?view=rest-cdn-2025-04-15
- Microsoft Learn: Purge contents from an Azure CDN endpoint - https://github.com/MicrosoftDocs/azure-docs/blob/main/articles/cdn/cdn-purge-endpoint.md
- Microsoft Learn: Azure built-in roles for networking - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/networking
- Microsoft Learn: Azure Front Door and Azure CDN comparison and retirement notes - https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison

## Issues Found
- The rate-limit section said `az cdn endpoint show --query "deliveryPolicy"` checked current purge limits. `deliveryPolicy` is not a purge-limit field, so the command was changed to check the CDN profile SKU with `az cdn profile show --query "sku.name"` before choosing provider-specific purge settings.
- The Python SDK example passed a raw dictionary as `content_file_paths`. The current SDK documents `PurgeParameters` for this argument, so the example now imports and uses `PurgeParameters(content_paths=batch)`.
- The Python example described a hard Azure limit of 50 paths per request without an official source. The comment now calls this a conservative batch size.
- The retry code labeled linear wait intervals as exponential backoff. The wait calculation now uses `60 * (2 ** attempt)`.
- The async Bash purge snippet captured a non-existent operation ID from `az cdn endpoint purge --no-wait --query "id"` and then treated endpoint `provisioningState` polling as purge-operation monitoring. It now starts the purge with `--no-wait` and uses the documented `az cdn endpoint wait --updated` command with an interval and timeout.
- The Azure Pipelines snippet converted changed files to JSON and passed the JSON string to `--content-paths`. The CLI documents `--content-paths` as a list parameter, so the snippet now uses a Bash array and passes each path as a separate argument.

## Review Notes
Azure CDN Standard from Microsoft (classic) is retiring on September 30, 2027, according to Microsoft Learn. The post remains technically useful for existing CDN endpoint troubleshooting, but future revisions should consider adding Azure Front Door Standard/Premium migration context.
