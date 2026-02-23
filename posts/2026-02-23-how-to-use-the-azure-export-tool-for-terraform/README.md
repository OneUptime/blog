# How to Use the Azure Export Tool for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Export Tool, Infrastructure as Code, Cloud Migration

Description: Learn how to use the Azure Export for Terraform tool to automatically generate Terraform configurations from existing Azure resources.

---

When you have an existing Azure environment built through the portal or ARM templates and want to bring it under Terraform management, the Azure Export for Terraform tool (formerly aztfexport) is your best option. This Microsoft-supported tool generates Terraform configurations directly from your Azure resources, making migration straightforward. In this guide, you will learn how to install, configure, and use the Azure Export tool effectively.

## What Is the Azure Export Tool for Terraform?

The Azure Export for Terraform tool is an open-source utility maintained by Microsoft that exports existing Azure resources into Terraform configuration and state files. Unlike generic tools, it is specifically designed for Azure and understands Azure resource relationships, dependencies, and naming conventions. It produces cleaner output than many alternatives because it has deep knowledge of the Azure Resource Manager API.

The tool supports three main export modes: exporting a single resource, exporting an entire resource group, and querying resources using Azure Resource Graph queries. This flexibility lets you choose the right scope for your migration.

## Installing the Azure Export Tool

You can install the tool through several package managers:

```bash
# Install on macOS using Homebrew
brew install azure/aztfexport/aztfexport

# Install on Linux using the apt repository
curl -sSL https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
sudo apt-add-repository "https://packages.microsoft.com/repos/aztfexport"
sudo apt-get update
sudo apt-get install aztfexport

# Install using Go
go install github.com/Azure/aztfexport@latest
```

You also need the Azure CLI installed and authenticated:

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"
```

## Exporting a Resource Group

The most common use case is exporting an entire resource group. This captures all resources within the group and their relationships:

```bash
# Export all resources in a resource group
aztfexport resource-group my-resource-group

# Export to a specific output directory
aztfexport resource-group my-resource-group --output-dir ./terraform-output

# Export in non-interactive mode (useful for automation)
aztfexport resource-group my-resource-group --non-interactive
```

When you run this command in interactive mode, the tool presents a list of discovered resources and lets you choose which ones to include, rename resource addresses, or skip specific resources.

## Exporting a Single Resource

If you only need to export one specific resource, use the resource mode:

```bash
# Export a single resource by its Azure resource ID
aztfexport resource /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm

# Export with a specific resource name in Terraform
aztfexport resource \
  --name azurerm_linux_virtual_machine.web_server \
  /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm
```

## Using Azure Resource Graph Queries

For more complex scenarios, you can use Azure Resource Graph queries to select resources across multiple resource groups or subscriptions:

```bash
# Export all VMs across all resource groups
aztfexport query "where type =~ 'Microsoft.Compute/virtualMachines'"

# Export resources with specific tags
aztfexport query "where tags.Environment == 'production'"

# Export all networking resources
aztfexport query "where type startswith 'Microsoft.Network'"
```

This mode is particularly powerful for large environments where resources span multiple resource groups but need to be managed together.

## Understanding the Output

After running the export, the tool generates several files in your output directory:

```
terraform-output/
  main.tf              # All resource configurations
  provider.tf          # Azure provider configuration
  terraform.tf         # Terraform configuration block
  import.tf            # Import blocks (Terraform 1.5+)
  terraform.tfstate    # State file mapping resources
```

The `main.tf` file contains all exported resources:

```hcl
# Example generated output for a Linux VM
resource "azurerm_linux_virtual_machine" "res-0" {
  admin_username        = "adminuser"
  location              = "eastus"
  name                  = "my-vm"
  network_interface_ids = [azurerm_network_interface.res-1.id]
  resource_group_name   = azurerm_resource_group.res-2.name
  size                  = "Standard_DS1_v2"

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    offer     = "0001-com-ubuntu-server-jammy"
    publisher = "Canonical"
    sku       = "22_04-lts"
    version   = "latest"
  }
}
```

## Using Import Blocks (Terraform 1.5+)

Starting with Terraform 1.5, the tool can generate import blocks instead of directly manipulating state. This approach is safer and more auditable:

```bash
# Generate import blocks instead of state
aztfexport resource-group my-resource-group --generate-import-block
```

This produces an `import.tf` file:

```hcl
# Generated import blocks
import {
  to = azurerm_linux_virtual_machine.res-0
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm"
}

import {
  to = azurerm_network_interface.res-1
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Network/networkInterfaces/my-vm-nic"
}
```

You can then run `terraform plan` to preview the import and `terraform apply` to execute it.

## Cleaning Up Generated Configurations

The exported code works but usually needs refinement for production use:

```hcl
# Before cleanup - auto-generated names
resource "azurerm_linux_virtual_machine" "res-0" {
  name                = "my-vm"
  resource_group_name = azurerm_resource_group.res-2.name
  # ...
}

# After cleanup - meaningful names and variables
resource "azurerm_linux_virtual_machine" "web_server" {
  name                = var.vm_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  size                = var.vm_size
  # ...
}
```

Key cleanup tasks include renaming resources from generic names like `res-0` to descriptive names, extracting hardcoded values into variables, removing read-only attributes, and organizing resources into separate files or modules.

## Handling Common Issues

The export process may encounter issues with certain resource types. Some Azure resources have complex configurations that the tool cannot fully export. In these cases, you may see warnings in the output.

Sensitive values like passwords and connection strings are not exported for security reasons. You need to add these manually:

```hcl
# Sensitive values must be added manually
resource "azurerm_linux_virtual_machine" "web_server" {
  # ... other configuration ...

  # Add sensitive values that were not exported
  admin_password = var.admin_password

  # Or use SSH key authentication
  admin_ssh_key {
    username   = "adminuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }
}
```

If certain resources fail to export, you can skip them and import them separately later:

```bash
# Skip problematic resources
aztfexport resource-group my-resource-group \
  --non-interactive \
  --skip="/subscriptions/.../problematicResource"
```

## Automating the Export Process

For large environments, you can script the export process:

```bash
#!/bin/bash
# Script to export multiple resource groups

# List of resource groups to export
RESOURCE_GROUPS=("rg-web" "rg-database" "rg-networking" "rg-monitoring")

for rg in "${RESOURCE_GROUPS[@]}"; do
  echo "Exporting resource group: $rg"

  # Create output directory
  mkdir -p "./exported/$rg"

  # Run the export
  aztfexport resource-group "$rg" \
    --output-dir "./exported/$rg" \
    --non-interactive \
    --generate-import-block

  echo "Completed export for: $rg"
done
```

## Verifying the Export

After exporting, always verify that the generated configuration matches your actual infrastructure:

```bash
# Navigate to the output directory
cd terraform-output

# Initialize Terraform
terraform init

# Run a plan to check for differences
terraform plan
```

A successful export results in a plan that shows no changes. If the plan shows modifications, review them carefully. Some differences are expected, such as computed values or default settings that Azure applies automatically.

## Best Practices

Start by exporting a small resource group to familiarize yourself with the tool and its output format. Use the interactive mode initially so you can review and rename resources during the export process. Always generate import blocks when using Terraform 1.5 or later, as this approach is more transparent and reversible. Keep the generated code in version control immediately after export so you have a baseline to compare against as you clean up the configurations.

## Conclusion

The Azure Export for Terraform tool streamlines the process of bringing existing Azure infrastructure under Terraform management. With support for resource groups, individual resources, and Resource Graph queries, it handles environments of any size. While the generated code needs cleanup for production use, it provides an accurate starting point that saves significant manual effort. Combined with Terraform import blocks, it offers a safe and auditable migration path for your Azure resources.

For more on Terraform import strategies, see our guide on [How to Import Resources into Modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-resources-into-modules-in-terraform/view) and [How to Migrate from ARM Templates to Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-arm-templates-to-terraform/view).
