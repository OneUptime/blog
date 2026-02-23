# How to Migrate from ARM Templates to Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, ARM Templates, Migration, Infrastructure as Code

Description: Learn how to migrate your Azure ARM template deployments to Terraform with resource mapping, state import, and safe transition strategies.

---

Azure Resource Manager (ARM) templates have been the native Infrastructure as Code tool for Azure since its inception. However, many teams are migrating to Terraform for its multi-cloud capabilities, cleaner syntax, and robust module ecosystem. This guide covers the complete process of migrating ARM template deployments to Terraform without disrupting your existing Azure infrastructure.

## Why Migrate from ARM Templates to Terraform

ARM templates use JSON, which can be verbose and difficult to read for complex deployments. Terraform's HCL syntax is more concise and supports features like loops, conditionals, and modules natively. Terraform also provides a unified workflow across multiple cloud providers, has a large module registry, and offers better state management with features like import blocks and moved blocks. Additionally, Bicep has emerged as Azure's improved IaC language, but teams wanting multi-cloud consistency still prefer Terraform.

## Understanding the Migration Process

ARM template deployments track resources through Azure deployment history. Unlike CloudFormation, ARM deployments do not strictly own the resources in the same way. Deleting a deployment does not delete the resources by default (unless you use Complete mode). This makes the migration simpler because you can import resources into Terraform without needing to carefully decouple them from ARM first.

## Step 1: Inventory ARM Deployments

List all deployments and their resources:

```bash
# List deployments in a resource group
az deployment group list \
  --resource-group my-rg \
  --query '[].{Name:name,State:properties.provisioningState,Timestamp:properties.timestamp}' \
  --output table

# List resources from a specific deployment
az deployment group show \
  --resource-group my-rg \
  --name my-deployment \
  --query 'properties.outputResources[].id' \
  --output tsv

# Export the ARM template
az deployment group export \
  --resource-group my-rg \
  --name my-deployment \
  > arm-template.json
```

## Step 2: Map ARM Resources to Terraform

Create a mapping between ARM resource types and Terraform:

```
ARM Resource Type                              Terraform Resource
-----------------                              ------------------
Microsoft.Compute/virtualMachines           -> azurerm_linux_virtual_machine / azurerm_windows_virtual_machine
Microsoft.Network/virtualNetworks           -> azurerm_virtual_network
Microsoft.Network/networkSecurityGroups     -> azurerm_network_security_group
Microsoft.Storage/storageAccounts           -> azurerm_storage_account
Microsoft.Sql/servers                       -> azurerm_mssql_server
Microsoft.Sql/servers/databases             -> azurerm_mssql_database
Microsoft.Web/sites                         -> azurerm_linux_web_app / azurerm_windows_web_app
Microsoft.KeyVault/vaults                   -> azurerm_key_vault
```

Note that some ARM resource types map to different Terraform resources depending on the OS or configuration. For example, `Microsoft.Compute/virtualMachines` maps to either `azurerm_linux_virtual_machine` or `azurerm_windows_virtual_machine`.

## Step 3: Write Terraform Configuration

Convert your ARM template to Terraform. Here is an example:

ARM template (JSON):

```json
{
  "resources": [
    {
      "type": "Microsoft.Network/virtualNetworks",
      "apiVersion": "2021-02-01",
      "name": "my-vnet",
      "location": "[resourceGroup().location]",
      "properties": {
        "addressSpace": {
          "addressPrefixes": ["10.0.0.0/16"]
        },
        "subnets": [
          {
            "name": "web-subnet",
            "properties": {
              "addressPrefix": "10.0.1.0/24"
            }
          }
        ]
      }
    }
  ]
}
```

Terraform equivalent:

```hcl
# Provider configuration
provider "azurerm" {
  features {}
}

# Resource group (if not already managed)
data "azurerm_resource_group" "main" {
  name = "my-rg"
}

# Virtual network
resource "azurerm_virtual_network" "main" {
  name                = "my-vnet"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]
}

# Subnet
resource "azurerm_subnet" "web" {
  name                 = "web-subnet"
  resource_group_name  = data.azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Step 4: Use the Azure Export Tool

The Azure Export tool (aztfexport) can automate much of the conversion:

```bash
# Export an entire resource group
aztfexport resource-group my-rg --output-dir ./terraform-output

# Export with import blocks for Terraform 1.5+
aztfexport resource-group my-rg \
  --output-dir ./terraform-output \
  --generate-import-block
```

This generates both the Terraform configuration and import blocks, saving significant manual work.

## Step 5: Import Resources into Terraform

Use import blocks or CLI commands to bring resources under Terraform management:

```hcl
# imports.tf
import {
  to = azurerm_virtual_network.main
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Network/virtualNetworks/my-vnet"
}

import {
  to = azurerm_subnet.web
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Network/virtualNetworks/my-vnet/subnets/web-subnet"
}
```

```bash
# Initialize and import
terraform init
terraform plan    # Review the import plan
terraform apply   # Execute the imports
```

## Step 6: Handle ARM Template Functions

ARM templates use functions like `[parameters()]`, `[variables()]`, `[reference()]`, and `[concat()]`. These need to be converted to Terraform equivalents:

```hcl
# ARM: [parameters('location')]
# Terraform:
variable "location" {
  default = "eastus"
}

# ARM: [concat(parameters('prefix'), '-vm')]
# Terraform:
locals {
  vm_name = "${var.prefix}-vm"
}

# ARM: [reference('storageAccount').primaryEndpoints.blob]
# Terraform:
resource "azurerm_storage_account" "main" {
  # ...
}
# Use: azurerm_storage_account.main.primary_blob_endpoint

# ARM: [resourceId('Microsoft.Network/virtualNetworks', 'my-vnet')]
# Terraform:
# Use: azurerm_virtual_network.main.id
```

## Step 7: Verify and Clean Up

After importing, verify the configuration:

```bash
# Verify no changes are planned
terraform plan

# If there are changes, adjust configuration
# Common issues:
# - Missing tags
# - Default values set by Azure but not in ARM template
# - Computed attributes that should not be in Terraform config
```

Once verified, you can optionally clean up old ARM deployments:

```bash
# Delete old deployment history (does NOT delete resources)
az deployment group delete \
  --resource-group my-rg \
  --name my-deployment

# Or keep them for audit purposes
```

## Handling ARM Template Linked/Nested Templates

ARM templates can include linked and nested templates. Convert these to Terraform modules:

```hcl
# ARM linked template becomes a Terraform module
module "networking" {
  source = "./modules/networking"

  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  vnet_cidr           = "10.0.0.0/16"
}

module "compute" {
  source = "./modules/compute"

  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  subnet_id           = module.networking.subnet_id
}
```

## Handling ARM Template Conditions

ARM template conditions translate to Terraform count or for_each:

```json
{
  "condition": "[equals(parameters('deployMonitoring'), 'yes')]",
  "type": "Microsoft.Insights/components",
  "name": "my-app-insights"
}
```

```hcl
# Terraform equivalent using count
variable "deploy_monitoring" {
  type    = bool
  default = true
}

resource "azurerm_application_insights" "main" {
  count               = var.deploy_monitoring ? 1 : 0
  name                = "my-app-insights"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  application_type    = "web"
}
```

## Migration Checklist

Use this checklist to track your migration progress:

```
[ ] Inventory all ARM deployments and resources
[ ] Create resource type mapping (ARM to Terraform)
[ ] Write Terraform configuration for all resources
[ ] Set up Terraform backend (remote state)
[ ] Import all resources into Terraform state
[ ] Verify terraform plan shows no changes
[ ] Test with a non-destructive apply
[ ] Update CI/CD pipelines to use Terraform
[ ] Document the new Terraform workflow
[ ] Clean up old ARM deployment history
[ ] Remove ARM templates from repository
```

## Best Practices

Use the Azure Export tool as a starting point to save time. Migrate one resource group at a time to keep the process manageable. Always verify imports with `terraform plan` before making any changes. Convert ARM parameters to Terraform variables and ARM variables to Terraform locals. Keep the ARM templates available during the transition period in case you need to reference them. Test the migration in a development environment before tackling production.

## Conclusion

Migrating from ARM templates to Terraform is straightforward because Azure deployments do not strictly own resources the way CloudFormation stacks do. The main work is converting ARM JSON to Terraform HCL and importing existing resources into state. With the Azure Export tool and import blocks, much of this can be automated. Take a methodical approach, verify each step, and you will have a clean Terraform codebase managing your Azure infrastructure.

For related topics, see [How to Use the Azure Export Tool for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-azure-export-tool-for-terraform/view) and [How to Migrate from CloudFormation to Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-cloudformation-to-terraform/view).
