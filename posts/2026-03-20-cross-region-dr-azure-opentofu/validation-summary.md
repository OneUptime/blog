# Validation Summary: How to Set Up Cross-Region Disaster Recovery with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC) with the AzureRM provider
- Azure Storage Account (GRS / RA-GRS replication)
- Azure SQL Database (`azurerm_mssql_server`, `azurerm_mssql_failover_group`)
- Azure Recovery Services Vault
- Azure Site Recovery (fabric and replication policy)
- Azure Traffic Manager (Priority routing, Azure endpoints)

## Sources Consulted
- [azurerm_mssql_failover_group resource docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_failover_group.html.markdown)
- [azurerm_mssql_failover_group source schema](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/services/mssql/mssql_failover_group_resource.go)
- [azurerm_recovery_services_vault resource docs](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/recovery_services_vault.html.markdown)
- [azurerm_recovery_services_vault source schema](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/services/recoveryservices/recovery_services_vault_resource.go)
- [azurerm_site_recovery_replication_policy resource docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/site_recovery_replication_policy)
- [hashicorp/terraform-provider-azurerm releases](https://github.com/hashicorp/terraform-provider-azurerm/releases) (latest v4.71.0 at time of review)

## Issues Found
- **`azurerm_mssql_failover_group` — invalid `readonly_endpoint_failover_policy` block.** The post used a nested block of the form `readonly_endpoint_failover_policy { mode = "Enabled" }`, which is not a valid argument in the v4.x AzureRM provider schema. The current schema replaces this with a top-level boolean attribute `readonly_endpoint_failover_policy_enabled` (defaults to `false`). This was a hard breaking error — `terraform/tofu plan` would fail with "Unsupported block type". I replaced the block with `readonly_endpoint_failover_policy_enabled = true` to preserve the author's intent of enabling read-only endpoint failover.

## Review Notes
- `azurerm_recovery_services_vault.soft_delete_enabled = true` is still accepted by the v4.x provider but is marked **deprecated** and will be removed in v5.0 (soft delete is always-on by default under Azure's "secure by default" policy). Left as-is since it remains functional and signals intent, but readers using v5.0 will need to drop the argument.
- `grace_minutes = 60` for the failover group is at the minimum allowed value for `Automatic` mode — this is correct.
- Traffic Manager `monitor_config` interval of 10 seconds is the "Fast" probing interval; that requires `tolerated_number_of_failures` to be ≤ 9 (3 here is fine) and `timeout_in_seconds` to be < `interval_in_seconds` (5 < 10 satisfies this).
- Traffic Manager `dns_config.ttl = 30` is the minimum allowed TTL — correct for a fast-failover scenario.
- The `azurerm_resource_group.primary`, `azurerm_resource_group.dr`, `azurerm_mssql_database.app`, `azurerm_linux_web_app.primary`, and `azurerm_linux_web_app.dr` resources are referenced but never defined in the post. This is acceptable for a focused tutorial, but readers will need to add these dependent resources for the snippets to apply cleanly.
- The `azurerm_site_recovery_fabric` resources have valid schema, but ASR Azure-to-Azure replication also requires `azurerm_site_recovery_protection_container`, `azurerm_site_recovery_protection_container_mapping`, and `azurerm_site_recovery_replicated_vm` to actually replicate VMs end to end. The post stops at the policy level, which is fine as a scoping decision.
