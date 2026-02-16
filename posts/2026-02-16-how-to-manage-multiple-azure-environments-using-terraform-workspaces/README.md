# How to Manage Multiple Azure Environments Using Terraform Workspaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Workspaces, Environments, Infrastructure as Code, DevOps, State Management

Description: A practical guide to using Terraform workspaces for managing multiple Azure environments like dev, staging, and production from a single codebase.

---

Managing multiple environments is one of the first challenges you hit when your Terraform project grows beyond a proof of concept. You need dev, staging, and production - same infrastructure, different configurations. Terraform workspaces offer one way to handle this, and when used correctly, they can keep your codebase clean and your deployments consistent.

That said, workspaces are also one of the most misunderstood features in Terraform. They are great for some scenarios and terrible for others. In this post, I will show you how to use them effectively for Azure environments, when to use them, and when to pick a different approach.

## What Are Terraform Workspaces?

A workspace in Terraform is essentially a named instance of state. When you create a workspace called "staging," Terraform stores the state for that workspace separately from the default workspace. Your code stays the same, but the state - and therefore the deployed resources - is different for each workspace.

By default, every Terraform project starts in a workspace called "default." You can create additional workspaces with `terraform workspace new`:

```bash
# Create workspaces for each environment
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# List all workspaces - the asterisk marks the active one
terraform workspace list
# Output:
#   default
#   dev
# * staging
#   production

# Switch to a different workspace
terraform workspace select production
```

## How Workspaces Map to Environments

The key to making workspaces work for environments is using the workspace name (`terraform.workspace`) to drive configuration differences. Here is a pattern I use frequently for Azure projects:

```hcl
# main.tf - Environment-aware configuration using workspaces

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  # Remote backend - each workspace gets its own state file
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstatecompany"
    container_name       = "tfstate"
    key                  = "infrastructure.tfstate"
    # Workspaces are stored as separate blobs: env:/dev/infrastructure.tfstate
  }
}

provider "azurerm" {
  features {}
}

# Environment-specific configuration map
locals {
  # Map workspace names to environment-specific values
  env_config = {
    dev = {
      vm_size        = "Standard_B2s"
      vm_count       = 1
      db_sku         = "GP_Standard_D2s_v3"
      db_storage_mb  = 32768
      enable_backup  = false
      alert_email    = "dev-team@company.com"
      address_space  = "10.1.0.0/16"
    }
    staging = {
      vm_size        = "Standard_D2s_v5"
      vm_count       = 2
      db_sku         = "GP_Standard_D2s_v3"
      db_storage_mb  = 65536
      enable_backup  = true
      alert_email    = "platform-team@company.com"
      address_space  = "10.2.0.0/16"
    }
    production = {
      vm_size        = "Standard_D4s_v5"
      vm_count       = 4
      db_sku         = "GP_Standard_D4s_v3"
      db_storage_mb  = 131072
      enable_backup  = true
      alert_email    = "ops-team@company.com"
      address_space  = "10.3.0.0/16"
    }
  }

  # Select the config for the current workspace
  config = local.env_config[terraform.workspace]
  env    = terraform.workspace
}
```

This approach puts all environment-specific values in a single locals block. When you switch workspaces, the entire configuration adjusts automatically.

## Building the Infrastructure

Now use those workspace-driven values in your resource definitions:

```hcl
# resources.tf - Resources that adapt to the current workspace

# Resource group named after the environment
resource "azurerm_resource_group" "main" {
  name     = "rg-myapp-${local.env}"
  location = "eastus2"

  tags = {
    Environment = local.env
    ManagedBy   = "Terraform"
    Workspace   = terraform.workspace
  }
}

# Virtual network with environment-specific address space
resource "azurerm_virtual_network" "main" {
  name                = "vnet-myapp-${local.env}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = [local.config.address_space]
}

# Subnet for application servers
resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(local.config.address_space, 8, 1)]
}

# VMs with count driven by environment config
resource "azurerm_linux_virtual_machine" "app" {
  count               = local.config.vm_count
  name                = "vm-myapp-${local.env}-${count.index}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  size                = local.config.vm_size
  admin_username      = "azureuser"

  network_interface_ids = [azurerm_network_interface.app[count.index].id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = local.env == "production" ? "Premium_LRS" : "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }
}

# Network interfaces for VMs
resource "azurerm_network_interface" "app" {
  count               = local.config.vm_count
  name                = "nic-myapp-${local.env}-${count.index}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
  }
}

# Database with environment-appropriate SKU
resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-myapp-${local.env}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = local.config.db_sku
  storage_mb          = local.config.db_storage_mb
  version             = "16"

  # Only enable geo-redundant backup for production
  geo_redundant_backup_enabled = local.env == "production"

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
  }
}

# Backup vault - only in environments where backup is enabled
resource "azurerm_data_protection_backup_vault" "main" {
  count               = local.config.enable_backup ? 1 : 0
  name                = "bv-myapp-${local.env}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  datastore_type      = "VaultStore"
  redundancy          = local.env == "production" ? "GeoRedundant" : "LocallyRedundant"
}
```

## Working with Workspaces Day to Day

Here is the typical workflow when using workspaces:

```bash
# Deploy to dev first
terraform workspace select dev
terraform plan -out=dev.tfplan
terraform apply dev.tfplan

# After validation, deploy to staging
terraform workspace select staging
terraform plan -out=staging.tfplan
terraform apply staging.tfplan

# Finally, production
terraform workspace select production
terraform plan -out=prod.tfplan
terraform apply prod.tfplan
```

Each workspace maintains its own state, so applying in dev has zero impact on production. The state files are stored separately in the backend - with Azure Blob Storage, they are stored as `env:/dev/infrastructure.tfstate`, `env:/staging/infrastructure.tfstate`, and so on.

## CI/CD Integration

In a pipeline, you set the workspace as part of the job:

```yaml
# GitHub Actions example - deploy to a specific workspace
jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: '1.7.0'

      - name: Terraform Init
        run: terraform init -input=false

      - name: Select Workspace
        run: terraform workspace select ${{ matrix.environment }} || terraform workspace new ${{ matrix.environment }}

      - name: Terraform Plan
        run: terraform plan -input=false -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
```

## When to Use Workspaces vs. Separate Directories

This is the important part. Workspaces work well when:

- Environments are structurally identical with only configuration differences (sizes, counts, feature flags)
- You want a single codebase with minimal duplication
- Environments live in the same Azure subscription or use the same provider configuration

Workspaces do not work well when:

- Environments have fundamentally different architectures (e.g., production has a WAF but dev does not)
- Environments live in different subscriptions with different credentials
- Different teams own different environments and need independent change management
- You need different Terraform versions or provider versions per environment

For those cases, use separate directories or separate repositories with shared modules. This gives you full independence between environments at the cost of some duplication.

## Workspace Safety Tips

A few practices that prevent workspace-related mistakes:

Never use the `default` workspace for real infrastructure. Reserve it for testing or disable it entirely. Create explicit workspaces for every environment.

Add a validation check at the top of your configuration to prevent deploying with unexpected workspace names:

```hcl
# Validate that we are in a known workspace
locals {
  valid_workspaces = ["dev", "staging", "production"]
  validate_workspace = (
    contains(local.valid_workspaces, terraform.workspace)
    ? true
    : tobool("ERROR: Unknown workspace '${terraform.workspace}'. Valid workspaces: ${join(", ", local.valid_workspaces)}")
  )
}
```

Always check which workspace you are in before running destructive operations. A `terraform destroy` in the wrong workspace is a career-defining moment.

## Wrapping Up

Terraform workspaces provide a lightweight mechanism for managing multiple Azure environments from a single codebase. They work best when your environments are structurally similar and differ mainly in scale and configuration. Use the workspace name to drive a configuration map, keep your resource naming consistent with environment prefixes, and always verify your active workspace before applying changes. For more complex scenarios where environments diverge significantly, consider separate directory structures with shared modules instead.
