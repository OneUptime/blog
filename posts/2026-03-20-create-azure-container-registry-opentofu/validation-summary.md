# Validation Summary: How to Create Azure Container Registry with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Azure Container Registry (ACR)
- HashiCorp `azurerm` provider (~> 3.0)
- Azure Private Endpoints / Private Link
- Azure RBAC (AcrPull, AcrPush built-in roles)
- Azure Kubernetes Service (AKS) integration
- ACR Tasks (timer triggers, encoded steps)
- Azure CLI `acr purge` command

## Sources Consulted
- azurerm `azurerm_container_registry` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry
- azurerm `azurerm_container_registry_task` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry_task
- azurerm `azurerm_private_endpoint` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- azurerm v3.0 upgrade guide (network_rule_set changes)
- Azure Container Registry auto-purge docs: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- Microsoft Private Link subresource reference for `Microsoft.ContainerRegistry/registries`
- Azure built-in RBAC roles documentation (AcrPull, AcrPush)

## Issues Found
1. **`network_rule_set.virtual_network` sub-block was removed in azurerm v3.0** — The "Network Access Rules (Premium)" example included a `virtual_network` block under `network_rule_set` (with `action` and `subnet_id`). This block was removed in the v3.0 azurerm provider because the underlying Azure API deprecated VNet service endpoints for ACR (they were replaced by Private Endpoints). Pinning `~> 3.0` would cause this configuration to fail with an unsupported argument error. Removed the `virtual_network` block from the example. The post already demonstrates the correct modern approach (private endpoint via `azurerm_private_endpoint`) immediately below.
2. **Invalid regex in `acr purge --filter`** — The lifecycle purge task used `--filter '*:.*'`. Per Microsoft's `acr purge` documentation, both the repository name and tag are *regular expressions*, and a bare `*` is not a valid regex (it has no preceding token to repeat). Changed to `--filter '.*:.*'` so it matches "any repository, any tag," which is the documented way to express "all repositories."

## Review Notes
- The post pins `azurerm` to `~> 3.0`. The current major version is 4.x and contains breaking changes for ACR specifically: `retention_policy` and `trust_policy` blocks were flattened to `retention_policy_in_days` and `trust_policy_enabled` scalar arguments. Readers upgrading should consult the v3 -> v4 upgrade guide.
- The `subresource_names = ["registry"]` value for the ACR private endpoint is correct per Microsoft's Private Link subresource reference.
- The 5-field cron expression `"0 3 * * *"` for `timer_trigger.schedule` is the correct format; ACR Tasks use standard cron, not 6-field NCronTab.
- `version: v1.1.0` in the encoded ACR Task YAML is the current schema version (v1.0.0 is legacy).
- `AcrPull` and `AcrPush` are the correct Azure built-in role names for image pull/push permissions.
- ACR registry names must be 5–50 characters, *lowercase* alphanumeric only — the in-code comment says "alphanumeric" but does not specify lowercase; the example names (`myappregistry`, `myappregistryprivate`) happen to comply. Minor wording nit, not a technical error.
- With `public_network_access_enabled = false`, the `network_rule_set` IP allowlist is largely moot (only private endpoints can reach the registry). The example mixes both controls for illustration; readers should pick one model in production.
