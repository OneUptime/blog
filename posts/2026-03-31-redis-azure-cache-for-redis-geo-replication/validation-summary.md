# Validation Summary: How to Set Up Azure Cache for Redis Geo-Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cache for Redis (Premium tier)
- Azure CLI (`az redis`)
- Terraform (AzureRM provider, `azurerm_redis_cache` and `azurerm_redis_linked_server` resources)
- Azure Monitor metrics
- Passive geo-replication

## Sources Consulted
- Azure CLI `az redis server-link` command reference (`az redis server-link create --help`, `az redis server-link show --help`, `az redis server-link delete --help`)
- Azure CLI `az redis create` command reference
- Azure Cache for Redis geo-replication documentation (Premium tier passive geo-replication)
- Terraform AzureRM provider documentation for `azurerm_redis_cache` and `azurerm_redis_linked_server`

## Issues Found

### 1. Wrong CLI command group for geo-replication
- **What was wrong:** The post used `az redis geo-replication link create/show/delete`, which does not exist. The Azure CLI has no `geo-replication` subcommand under `az redis`.
- **What was changed:** Replaced all instances with the correct command group `az redis server-link create/show/delete`.

### 2. Link create command had reversed semantics
- **What was wrong:** The `server-link create` command was shown running against the secondary cache (`--name redis-secondary`) with `--server-to-link` pointing to the primary. The correct usage is to run the command against the primary cache and link to the secondary.
- **What was changed:** Changed `--name` to `redis-primary`, `--resource-group` to `rg-eastus`, and `--server-to-link` to the secondary cache's resource ID.

### 3. Missing `--replication-role` parameter
- **What was wrong:** The `server-link create` command was missing the required `--replication-role` parameter.
- **What was changed:** Added `--replication-role Secondary` to the command.

### 4. Show command missing `--linked-server-name` parameter
- **What was wrong:** The `server-link show` command was missing the required `--linked-server-name` parameter and was targeting the wrong cache.
- **What was changed:** Updated to target the primary cache and added `--linked-server-name redis-secondary`.

## Review Notes
- The Terraform `azurerm_redis_cache` resource uses `enable_non_ssl_port`, which was renamed to `non_ssl_port_enabled` in AzureRM provider v4.0+. Since the post does not specify a provider version, this is noted but not changed. Users on provider v4.x+ will need to update the attribute name.
- The Terraform `azurerm_redis_linked_server` configuration is correct and matches the current provider schema.
- The failover process description (manual unlinking, no automatic failover) is accurate for Premium tier passive geo-replication.
- The monitoring command using `az monitor metrics list` is syntactically correct.
