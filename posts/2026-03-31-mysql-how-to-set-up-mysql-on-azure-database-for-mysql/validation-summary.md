# Validation Summary: How to Set Up MySQL on Azure Database for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Azure Database for MySQL Flexible Server
- Azure CLI (`az mysql flexible-server`)
- Azure Virtual Network (VNet integration with subnet delegation)
- Azure Advanced Threat Protection for MySQL

## Sources Consulted
- Azure CLI reference for `az mysql flexible-server create`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Azure CLI reference for `az mysql flexible-server firewall-rule`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/firewall-rule
- Azure CLI reference for `az mysql flexible-server replica`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/replica
- Azure CLI reference for `az mysql flexible-server parameter`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/parameter
- Azure CLI reference for `az mysql flexible-server advanced-threat-protection-setting`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/advanced-threat-protection-setting
- Azure Database for MySQL Flexible Server documentation: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/overview
- Azure Database for MySQL version support policy: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-version-policy
- Azure MySQL Flexible Server networking concepts (VNet integration vs Private Link): https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-networking

## Issues Found

### 1. Incorrect `--version` parameter value
- **What was wrong:** The `az mysql flexible-server create` command used `--version 8.0.21`, specifying a patch version.
- **What was changed:** Updated to `--version 8.0`. The `--version` parameter accepts major version values (e.g., `5.7`, `8.0`), not specific patch versions. Azure manages the minor/patch version within the major version track.

### 2. Outdated MySQL 5.7 support claim
- **What was wrong:** The introduction stated "It supports MySQL 5.7 and 8.0." Azure's extended support for MySQL 5.7 ended in September 2025, making this claim outdated for a March 2026 post.
- **What was changed:** Updated to "It supports MySQL 8.0."

### 3. Misleading section title: "Private Endpoint" vs VNet Integration
- **What was wrong:** The section titled "Use Private Endpoint for Secure Access" demonstrated VNet integration via subnet delegation (`--delegations Microsoft.DBforMySQL/flexibleServers`, `--vnet`, `--subnet`), not a Private Endpoint. In Azure, these are distinct networking features: VNet integration deploys the server directly into a delegated subnet, while Private Endpoints use Azure Private Link to create a private IP in a VNet.
- **What was changed:** Renamed the section to "Use VNet Integration for Secure Access" to accurately describe what the commands demonstrate.

### 4. Incorrect command for enabling threat protection
- **What was wrong:** The command `az mysql flexible-server microsoft-defender enable` was used. For MySQL Flexible Server, the correct command group is `advanced-threat-protection-setting`, not `microsoft-defender`.
- **What was changed:** Updated to `az mysql flexible-server advanced-threat-protection-setting update --state Enabled`.

## Review Notes
- The SSL CA certificate path `/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem` is used in the connection example. Users will need to download this certificate from Azure's documentation, as it may not be present on their system by default. The certificate name is consistent with Azure's documentation for Flexible Server SSL connectivity.
- The post could benefit from mentioning MySQL 8.4 LTS support if Azure has added it, but this is not a correctness issue with the current content.
- All other Azure CLI commands, parameters, and flags were verified as correct, including resource group creation, firewall rules, server parameters, read replica creation, VNet/subnet creation, and scaling operations.
