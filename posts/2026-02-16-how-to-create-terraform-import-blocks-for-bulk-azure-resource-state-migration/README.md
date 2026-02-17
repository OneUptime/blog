# How to Create Terraform Import Blocks for Bulk Azure Resource State Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Import, State Migration, IaC, DevOps, Infrastructure as Code

Description: Use Terraform import blocks to bring existing Azure resources under Terraform management in bulk, with strategies for large-scale state migration.

---

Most Azure environments were not born in Terraform. Resources were created through the portal, CLI scripts, ARM templates, or other tools. At some point, someone decides to bring everything under Terraform management. The challenge is importing hundreds of existing resources into Terraform state without recreating them.

Terraform 1.5 introduced the `import` block, which makes this process declarative. Instead of running `terraform import` commands one at a time from the CLI, you declare imports in your configuration and Terraform handles them during the plan/apply cycle. For bulk migration of Azure resources, this is a significant improvement.

## The Old Way vs. Import Blocks

Before import blocks, you ran commands like this for each resource:

```bash
terraform import azurerm_resource_group.main /subscriptions/xxx/resourceGroups/rg-production
terraform import azurerm_storage_account.logs /subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stlogsprod
# ... repeat 200 more times
```

Each command had to be run in sequence, and if one failed, you had to figure out where you left off. There was no way to preview what the import would do before executing it.

Import blocks fix both problems. They are declarative, they participate in the plan, and you can import many resources at once.

## Basic Import Block Syntax

An import block has two fields: the Terraform resource address and the Azure resource ID.

```hcl
# Import an existing resource group into Terraform state
import {
  to = azurerm_resource_group.production
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-production"
}

# The corresponding resource block must exist
resource "azurerm_resource_group" "production" {
  name     = "rg-production"
  location = "eastus"
}
```

When you run `terraform plan`, Terraform will show that it plans to import the resource group into state. No changes to the actual Azure resource.

## Generating Import Blocks for Existing Resources

The first challenge in bulk migration is getting the resource IDs. Azure CLI makes this straightforward.

```bash
# List all resources in a resource group with their IDs
az resource list \
  --resource-group rg-production \
  --query "[].{type:type, name:name, id:id}" \
  --output table
```

For a more targeted approach, list specific resource types:

```bash
# Get all storage accounts
az storage account list \
  --query "[].{name:name, rg:resourceGroup, id:id}" \
  --output tsv

# Get all virtual networks
az network vnet list \
  --query "[].{name:name, rg:resourceGroup, id:id}" \
  --output tsv

# Get all key vaults
az keyvault list \
  --query "[].{name:name, rg:resourceGroup, id:id}" \
  --output tsv
```

## Automating Import Block Generation

For large environments, manually writing import blocks is impractical. Here is a script that generates import blocks from existing Azure resources.

```bash
#!/bin/bash
# generate-imports.sh
# Generates Terraform import blocks for all resources in a resource group

set -euo pipefail

RG_NAME="${1:?Usage: generate-imports.sh <resource-group-name>}"
OUTPUT_FILE="imports.tf"

echo "Generating import blocks for resources in $RG_NAME"

# Map Azure resource types to Terraform resource types
declare -A TYPE_MAP
TYPE_MAP["Microsoft.Storage/storageAccounts"]="azurerm_storage_account"
TYPE_MAP["Microsoft.Network/virtualNetworks"]="azurerm_virtual_network"
TYPE_MAP["Microsoft.Network/networkSecurityGroups"]="azurerm_network_security_group"
TYPE_MAP["Microsoft.KeyVault/vaults"]="azurerm_key_vault"
TYPE_MAP["Microsoft.Web/sites"]="azurerm_linux_web_app"
TYPE_MAP["Microsoft.Web/serverfarms"]="azurerm_service_plan"
TYPE_MAP["Microsoft.Sql/servers"]="azurerm_mssql_server"
TYPE_MAP["Microsoft.Sql/servers/databases"]="azurerm_mssql_database"
TYPE_MAP["Microsoft.Network/publicIPAddresses"]="azurerm_public_ip"

# Get all resources in the resource group
resources=$(az resource list --resource-group "$RG_NAME" --query "[].{type:type, name:name, id:id}" -o json)

# Generate import blocks
echo "# Auto-generated import blocks for $RG_NAME" > "$OUTPUT_FILE"
echo "# Generated on $(date -u '+%Y-%m-%d %H:%M UTC')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "$resources" | jq -c '.[]' | while read -r resource; do
  type=$(echo "$resource" | jq -r '.type')
  name=$(echo "$resource" | jq -r '.name')
  id=$(echo "$resource" | jq -r '.id')

  # Look up the Terraform type
  tf_type="${TYPE_MAP[$type]:-}"

  if [ -n "$tf_type" ]; then
    # Convert the Azure name to a valid Terraform identifier
    tf_name=$(echo "$name" | tr '-' '_' | tr '[:upper:]' '[:lower:]')

    echo "import {" >> "$OUTPUT_FILE"
    echo "  to = ${tf_type}.${tf_name}" >> "$OUTPUT_FILE"
    echo "  id = \"${id}\"" >> "$OUTPUT_FILE"
    echo "}" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    echo "  Generated import for: $type/$name"
  else
    echo "  SKIPPED (no mapping): $type/$name"
  fi
done

echo ""
echo "Import blocks written to $OUTPUT_FILE"
echo "Remember to create matching resource blocks before running terraform plan"
```

## Using terraform plan -generate-config-out

Terraform 1.5+ has a feature that generates the matching resource configuration during import. This is extremely useful for bulk migration because you do not have to write the resource blocks manually.

```bash
# Generate resource configurations from import blocks
terraform plan -generate-config-out=generated.tf
```

This command reads your import blocks, queries Azure for the current state of each resource, and writes the corresponding Terraform resource blocks to `generated.tf`. You will need to review and clean up the generated code, but it is much faster than writing everything from scratch.

## Step-by-Step Bulk Migration Process

Here is the practical workflow for migrating a resource group.

### Step 1: Inventory

List everything in the target resource group.

```bash
az resource list \
  --resource-group rg-production \
  --output table
```

### Step 2: Generate Import Blocks

Use the script above or write them manually. Put them in an `imports.tf` file.

```hcl
# imports.tf
import {
  to = azurerm_resource_group.production
  id = "/subscriptions/xxx/resourceGroups/rg-production"
}

import {
  to = azurerm_virtual_network.main
  id = "/subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.Network/virtualNetworks/vnet-production"
}

import {
  to = azurerm_storage_account.logs
  id = "/subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stlogsprod001"
}

import {
  to = azurerm_key_vault.main
  id = "/subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.KeyVault/vaults/kv-production"
}

# ... more imports
```

### Step 3: Generate Resource Configurations

```bash
terraform plan -generate-config-out=generated_resources.tf
```

### Step 4: Review and Clean Up

The generated code will be functional but not pretty. Clean it up:
- Move resources into logical files (`networking.tf`, `storage.tf`, etc.)
- Replace hardcoded values with variables
- Add descriptions to variables
- Remove unnecessary default values that Terraform auto-populated
- Organize resources into modules if appropriate

### Step 5: Plan and Verify

```bash
terraform plan
```

The plan should show imports with no changes to existing resources. If Terraform wants to modify something, it means your resource block does not exactly match the current Azure state. Fix the configuration until the plan shows only imports and no modifications.

### Step 6: Apply

```bash
terraform apply
```

This imports all resources into state. After this, Terraform manages them.

### Step 7: Remove Import Blocks

Once the import is complete, delete the import blocks from `imports.tf`. They are one-time directives and will cause errors if left in place after the resources are already in state.

## Handling Complex Resources

Some Azure resources have nested sub-resources that need separate imports. For example, an Azure SQL Server and its databases:

```hcl
import {
  to = azurerm_mssql_server.main
  id = "/subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.Sql/servers/sql-production"
}

import {
  to = azurerm_mssql_database.app
  id = "/subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.Sql/servers/sql-production/databases/db-application"
}

import {
  to = azurerm_mssql_firewall_rule.allow_azure
  id = "/subscriptions/xxx/resourceGroups/rg-production/providers/Microsoft.Sql/servers/sql-production/firewallRules/AllowAllWindowsAzureIps"
}
```

## Common Pitfalls

Resource IDs are case-sensitive in some places. Always copy them directly from `az resource list` output rather than constructing them manually.

Some resources have read-only attributes that cannot be set in the resource block. The generated config might include them, causing plan errors. Remove any attributes that Terraform marks as read-only.

Importing does not capture every setting. After import, run `terraform plan` and carefully review any proposed changes. Some might be legitimate drift that you want to fix; others might be configuration gaps you need to fill in.

State locking is critical during bulk imports. Make sure your backend is configured with state locking, and do not run imports from multiple terminals simultaneously.

## Conclusion

Terraform import blocks transform bulk Azure resource migration from a tedious CLI exercise into a declarative, reviewable process. Combined with `terraform plan -generate-config-out` for automatic resource configuration generation, you can bring an entire Azure environment under Terraform management in a fraction of the time it would take manually. The key is a systematic approach - inventory, generate, review, plan, apply, clean up - and patience with the inevitable cleanup of generated code.
