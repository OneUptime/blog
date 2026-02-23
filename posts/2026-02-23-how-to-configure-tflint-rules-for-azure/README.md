# How to Configure TFLint Rules for Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TFLint, Azure, Linting, DevOps, Infrastructure as Code

Description: Learn how to configure TFLint with the Azure ruleset to catch invalid VM sizes, missing configurations, and Azure-specific Terraform misconfigurations.

---

The TFLint Azure plugin validates your Terraform configurations against Azure-specific constraints. It catches things like invalid VM sizes, unsupported SKUs, and missing configurations that Terraform's built-in validation cannot detect until apply time. If you manage Azure infrastructure with Terraform, this plugin saves you from a lot of failed deployments.

## Installing the Azure Plugin

Create or update your `.tflint.hcl` configuration:

```hcl
# .tflint.hcl
plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}
```

Initialize TFLint to download the plugin:

```bash
# Download the Azure plugin
tflint --init

# Verify it is working
tflint --version
```

## What the Azure Plugin Checks

The AzureRM plugin validates:

- **VM sizes** - Whether the specified VM size exists and is available in your region
- **SKU names** - Valid SKUs for storage accounts, App Service plans, and other resources
- **API versions** - Whether resource API versions are valid
- **Location values** - Whether the specified Azure region is valid
- **Deprecated features** - Resources and arguments that Microsoft has deprecated

## Plugin Configuration Options

```hcl
# .tflint.hcl
plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}
```

Unlike the AWS plugin, the Azure plugin does not have a `deep_check` option. It relies on a static list of valid values that is updated with each plugin release.

## Common Azure Rules and What They Catch

### Invalid VM Sizes

```hcl
# TFLint catches this immediately
resource "azurerm_linux_virtual_machine" "bad" {
  name                = "bad-vm"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_B1super"  # ERROR: invalid VM size
  admin_username      = "adminuser"

  network_interface_ids = [azurerm_network_interface.nic.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }
}
```

The `azurerm_linux_virtual_machine_invalid_size` rule validates against all known Azure VM sizes. This catches typos and nonexistent sizes before you even run `terraform plan`.

### Invalid Storage Account SKU

```hcl
# Invalid storage account type
resource "azurerm_storage_account" "bad" {
  name                     = "badstorageaccount"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "GZRS"  # Not available in all regions
}
```

### Invalid Location

```hcl
# Typo in location name
resource "azurerm_resource_group" "bad" {
  name     = "bad-rg"
  location = "east-us"  # ERROR: should be "eastus" (no hyphen)
}
```

### App Service Plan SKU

```hcl
# Invalid App Service plan SKU
resource "azurerm_service_plan" "bad" {
  name                = "bad-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B99"  # ERROR: invalid SKU name
}
```

### SQL Database SKU

```hcl
resource "azurerm_mssql_database" "bad" {
  name         = "bad-db"
  server_id    = azurerm_mssql_server.sql.id
  sku_name     = "SuperFast"  # ERROR: invalid SKU
  max_size_gb  = 10
}
```

## Enabling Tag Enforcement

While the Azure plugin focuses on validation rules, you can use TFLint's built-in rules combined with the Azure plugin for comprehensive checks:

```hcl
# .tflint.hcl
plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}

# Terraform core rules
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}
```

## Disabling Specific Rules

If a rule does not apply to your project, disable it:

```hcl
# .tflint.hcl
plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}

# Disable specific rules
rule "azurerm_linux_virtual_machine_invalid_size" {
  enabled = false  # We use custom VM sizes from a variable
}
```

Or use inline comments for individual resources:

```hcl
# tflint-ignore: azurerm_linux_virtual_machine_invalid_size
resource "azurerm_linux_virtual_machine" "special" {
  size = var.custom_vm_size  # Dynamic value, cannot validate statically
  # ... rest of configuration
}
```

## Multi-Module Project Configuration

For projects with multiple modules, configure TFLint to inspect child modules:

```hcl
# .tflint.hcl
config {
  # Inspect local modules
  call_module_type = "local"
}

plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}
```

Run TFLint recursively:

```bash
# Lint all modules in the project
tflint --recursive

# Or lint a specific module
tflint --chdir modules/networking
```

## Running TFLint

```bash
# Basic run in current directory
tflint

# Run with JSON output for CI
tflint --format json

# Run with compact output
tflint --format compact

# Set minimum severity to fail on
tflint --minimum-failure-severity error

# Run only Azure-specific rules
tflint --only azurerm_linux_virtual_machine_invalid_size
```

## CI Pipeline Integration

### GitHub Actions

```yaml
# .github/workflows/tflint-azure.yml
name: TFLint Azure

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive --format compact --minimum-failure-severity error
```

### Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  paths:
    include:
      - '**/*.tf'

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: Bash@3
    displayName: 'Install TFLint'
    inputs:
      targetType: 'inline'
      script: |
        curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

  - task: Bash@3
    displayName: 'Init TFLint'
    inputs:
      targetType: 'inline'
      script: tflint --init

  - task: Bash@3
    displayName: 'Run TFLint'
    inputs:
      targetType: 'inline'
      script: tflint --recursive --format compact
```

## Complete Production Configuration

A comprehensive `.tflint.hcl` for Azure projects:

```hcl
# .tflint.hcl
# TFLint configuration for Azure infrastructure

config {
  call_module_type = "local"
}

# Azure provider plugin
plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}

# Terraform best practices
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_standard_module_structure" {
  enabled = true
}

# Require type declarations on variables
rule "terraform_typed_variables" {
  enabled = true
}
```

## Azure-Specific Testing Strategies

Combine TFLint with other tools for comprehensive Azure validation:

```bash
#!/bin/bash
# azure-lint.sh
# Comprehensive Azure Terraform linting pipeline

echo "=== Step 1: Format Check ==="
terraform fmt -check -recursive || exit 1

echo "=== Step 2: Terraform Validate ==="
terraform init -backend=false
terraform validate || exit 1

echo "=== Step 3: TFLint ==="
tflint --init
tflint --recursive --minimum-failure-severity error || exit 1

echo "=== Step 4: Security Scan ==="
trivy config --severity HIGH,CRITICAL --exit-code 1 . || exit 1

echo "All checks passed"
```

## Summary

TFLint's Azure plugin validates your Terraform configurations against Azure's actual constraints. It catches invalid VM sizes, unsupported SKUs, incorrect location names, and deprecated features before you run `terraform plan`. Set it up with a `.tflint.hcl` file, run `tflint --init`, and integrate it into your CI pipeline. The few minutes of setup saves hours of debugging failed Azure deployments.

For other cloud providers, see [How to Configure TFLint Rules for AWS](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-aws/view) and [How to Configure TFLint Rules for GCP](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-gcp/view).
