# Validation Summary: How to Provision MySQL with Terraform on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Terraform (>= 1.5.0)
- Azure Resource Manager (azurerm) Terraform provider (~> 3.90)
- Azure Virtual Network / Subnet delegation
- Azure Private DNS Zones
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Terraform Registry: azurerm_mysql_flexible_server — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mysql_flexible_server
- Terraform Registry: azurerm_mysql_flexible_server_configuration — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mysql_flexible_server_configuration
- Terraform Registry: azurerm_mysql_flexible_database — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mysql_flexible_database
- Microsoft Learn: Create MySQL Flexible Server with Terraform — https://learn.microsoft.com/en-us/azure/mysql/flexible-server/quickstart-create-terraform
- Microsoft Learn: Private Network Access for MySQL Flexible Server — https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-networking-vnet
- GitHub: terraform-provider-azurerm MySQL Flexible Server source (v3.90.0)

## Issues Found
1. **Invalid `high_availability.mode` value "Disabled"**: The `high_availability` block used a ternary `var.environment == "production" ? "ZoneRedundant" : "Disabled"`. The value `"Disabled"` is not a valid value for `high_availability.mode` — the only accepted values are `"SameZone"` and `"ZoneRedundant"`. To disable high availability for non-production environments, the entire `high_availability` block must be omitted. Fixed by replacing the static block with a `dynamic "high_availability"` block that is only included when `var.environment == "production"`. This also resolves a secondary issue where `standby_availability_zone` was always set even when HA was intended to be disabled.

## Review Notes
- The `version = "8.0.21"` value is correct for azurerm provider ~> 3.90. Provider v4.55.0+ adds support for `"8.4"`, but that is outside the version constraint used in the post.
- All resource attribute names (`auto_grow_enabled`, `iops`, `size_gb` in the `storage` block) are correct for the 3.x provider line. The 4.x provider line uses different top-level attributes (`storage_size_gb`, etc.), but this post correctly targets 3.x.
- The subnet delegation name `Microsoft.DBforMySQL/flexibleServers` and action `Microsoft.Network/virtualNetworks/subnets/join/action` are correct.
- The private DNS zone naming pattern `{prefix}.mysql.database.azure.com` follows Azure's requirements for MySQL Flexible Server.
- The post's description mentions "firewall rules" but no firewall rules are actually configured in the post. This is a minor content mismatch but not a technical error — when using VNet integration (delegated subnet), firewall rules are typically not needed.
