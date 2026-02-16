# How to Implement Terraform Test Framework for Validating Azure Bicep-Equivalent Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Testing, Azure, Bicep, Infrastructure as Code, Validation, HCL

Description: Learn how to use Terraform's built-in test framework to validate that Terraform configurations produce results equivalent to Azure Bicep deployments.

---

Many organizations use both Terraform and Bicep for their Azure infrastructure. Some teams prefer Bicep for Azure-native deployments, while others standardize on Terraform for multi-cloud support. When you are migrating between the two or maintaining parallel implementations, you need a way to verify that both produce equivalent results - the same resources, the same configurations, the same security settings.

Terraform introduced a native test framework in version 1.6.0 that lets you write tests in HCL. These tests can deploy real infrastructure, check that the outputs match expected values, and tear everything down. In this post, we will use the Terraform test framework to validate that Terraform configurations match what equivalent Bicep templates would produce.

## Why Test for Bicep Equivalence

There are several real-world scenarios where this matters:

- You are migrating from Bicep to Terraform and need to verify the migration is accurate
- Your organization has a Bicep reference architecture, and Terraform modules must produce the same outcome
- Different teams use different tools, and you need governance to ensure consistency
- You want to validate that both tools produce configurations that meet security baselines

## The Terraform Test Framework Basics

Terraform tests live in `.tftest.hcl` files in your module directory. Each file can contain multiple test `run` blocks that execute Terraform commands and make assertions.

```
my-module/
  main.tf
  variables.tf
  outputs.tf
  tests/
    basic.tftest.hcl
    security.tftest.hcl
    bicep-equivalence.tftest.hcl
  setup/
    main.tf              # Test helper infrastructure
```

## Setting Up the Validation Module

First, let us define the Terraform module that we want to validate against a Bicep equivalent. This example creates a web application infrastructure similar to what a Bicep template might produce.

```hcl
# main.tf - Terraform module to validate against Bicep equivalent
variable "environment" {
  type    = string
  default = "prod"
}

variable "location" {
  type    = string
  default = "eastus2"
}

variable "app_name" {
  type    = string
  default = "webapp"
}

locals {
  name_prefix = "${var.app_name}-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_service_plan" "main" {
  name                = "plan-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "P1v3"
  tags                = local.tags
}

resource "azurerm_linux_web_app" "main" {
  name                = "app-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true

  site_config {
    always_on        = true
    minimum_tls_version = "1.2"
    ftps_state       = "Disabled"
    http2_enabled    = true
  }

  tags = local.tags
}

resource "azurerm_storage_account" "main" {
  name                     = replace("st${local.name_prefix}", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"

  allow_nested_items_to_be_public = false

  tags = local.tags
}

# Outputs for test assertions
output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "app_service_name" {
  value = azurerm_linux_web_app.main.name
}

output "app_service_https_only" {
  value = azurerm_linux_web_app.main.https_only
}

output "app_service_min_tls" {
  value = azurerm_linux_web_app.main.site_config[0].minimum_tls_version
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "storage_min_tls" {
  value = azurerm_storage_account.main.min_tls_version
}

output "storage_replication_type" {
  value = azurerm_storage_account.main.account_replication_type
}

output "storage_public_access" {
  value = azurerm_storage_account.main.allow_nested_items_to_be_public
}
```

## Writing Equivalence Tests

Now write the tests that validate the Terraform output matches what the Bicep template would produce. The test file defines expected values based on the Bicep reference implementation.

```hcl
# tests/bicep-equivalence.tftest.hcl
# Validates that our Terraform module produces results equivalent to the
# reference Bicep deployment template

# Test: Verify resource naming matches Bicep conventions
run "verify_naming_conventions" {
  command = plan    # Use plan mode for fast validation without deploying

  variables {
    environment = "prod"
    location    = "eastus2"
    app_name    = "webapp"
  }

  # The Bicep template uses the naming convention: rg-<app>-<env>
  assert {
    condition     = output.resource_group_name == "rg-webapp-prod"
    error_message = "Resource group name does not match Bicep convention. Expected 'rg-webapp-prod', got '${output.resource_group_name}'"
  }

  # Bicep uses: app-<app>-<env>
  assert {
    condition     = output.app_service_name == "app-webapp-prod"
    error_message = "App Service name does not match Bicep convention. Expected 'app-webapp-prod', got '${output.app_service_name}'"
  }

  # Bicep storage naming strips hyphens
  assert {
    condition     = output.storage_account_name == "stwebappprod"
    error_message = "Storage account name does not match Bicep convention"
  }
}

# Test: Verify security settings match Bicep defaults
run "verify_security_settings" {
  command = plan

  variables {
    environment = "prod"
    location    = "eastus2"
    app_name    = "sectest"
  }

  # Bicep template enforces HTTPS
  assert {
    condition     = output.app_service_https_only == true
    error_message = "HTTPS-only must be enabled (Bicep reference requires this)"
  }

  # Bicep template sets minimum TLS to 1.2
  assert {
    condition     = output.app_service_min_tls == "1.2"
    error_message = "Minimum TLS version must be 1.2 (Bicep reference requirement)"
  }

  # Storage account minimum TLS
  assert {
    condition     = output.storage_min_tls == "TLS1_2"
    error_message = "Storage minimum TLS must be TLS1_2"
  }

  # No public blob access
  assert {
    condition     = output.storage_public_access == false
    error_message = "Storage public access must be disabled (Bicep reference requirement)"
  }
}

# Test: Verify production environment uses GRS replication
run "verify_production_replication" {
  command = plan

  variables {
    environment = "prod"
    location    = "eastus2"
    app_name    = "repltest"
  }

  assert {
    condition     = output.storage_replication_type == "GRS"
    error_message = "Production storage must use GRS replication (Bicep reference uses GRS for prod)"
  }
}
```

## Testing with Real Deployments

Plan-mode tests are fast but limited. For full validation, use `apply` mode to deploy real resources and validate their properties.

```hcl
# tests/integration.tftest.hcl
# Integration tests that deploy and validate real Azure resources

# Use a setup module to create shared test infrastructure
run "setup_test_environment" {
  module {
    source = "./tests/setup"
  }
}

# Deploy and validate the full infrastructure
run "deploy_and_validate" {
  command = apply   # Actually deploy to Azure

  variables {
    environment = "test"
    location    = "eastus2"
    app_name    = "tftest"
  }

  # Verify the App Service was created with the right settings
  assert {
    condition     = output.app_service_https_only == true
    error_message = "Deployed App Service does not have HTTPS-only enabled"
  }

  assert {
    condition     = output.app_service_min_tls == "1.2"
    error_message = "Deployed App Service TLS version does not match expected"
  }

  # Verify storage configuration
  assert {
    condition     = output.storage_public_access == false
    error_message = "Deployed storage account has public access enabled"
  }
}
```

## Cross-Referencing with Bicep What-If Output

A powerful validation pattern is to run the Bicep template in what-if mode, capture the expected resource properties, and compare them against Terraform's plan output.

```hcl
# tests/cross-reference.tftest.hcl
# Cross-reference Terraform outputs with known Bicep what-if values

# These expected values come from running:
# az deployment group what-if --template-file main.bicep --parameters env=prod
# and extracting the resource properties

locals {
  # Expected values from Bicep what-if output
  bicep_expected = {
    app_service = {
      https_only     = true
      min_tls        = "1.2"
      ftps_state     = "Disabled"
      always_on      = true
      http2_enabled  = true
    }
    storage = {
      replication    = "GRS"
      min_tls        = "TLS1_2"
      public_access  = false
      account_tier   = "Standard"
    }
  }
}

run "validate_against_bicep_reference" {
  command = plan

  variables {
    environment = "prod"
    location    = "eastus2"
    app_name    = "crossref"
  }

  # App Service equivalence checks
  assert {
    condition     = output.app_service_https_only == local.bicep_expected.app_service.https_only
    error_message = "HTTPS setting diverges from Bicep reference"
  }

  assert {
    condition     = output.app_service_min_tls == local.bicep_expected.app_service.min_tls
    error_message = "TLS setting diverges from Bicep reference"
  }

  # Storage equivalence checks
  assert {
    condition     = output.storage_replication_type == local.bicep_expected.storage.replication
    error_message = "Storage replication diverges from Bicep reference"
  }

  assert {
    condition     = output.storage_min_tls == local.bicep_expected.storage.min_tls
    error_message = "Storage TLS setting diverges from Bicep reference"
  }

  assert {
    condition     = output.storage_public_access == local.bicep_expected.storage.public_access
    error_message = "Storage public access setting diverges from Bicep reference"
  }
}
```

## Running the Tests

Execute your tests with the `terraform test` command.

```bash
# Run all tests
terraform test

# Run tests with verbose output
terraform test -verbose

# Run a specific test file
terraform test -filter=tests/bicep-equivalence.tftest.hcl

# Run tests in a specific directory
terraform test -test-directory=tests
```

Sample output:

```
tests/bicep-equivalence.tftest.hcl... in progress
  run "verify_naming_conventions"... pass
  run "verify_security_settings"... pass
  run "verify_production_replication"... pass
tests/bicep-equivalence.tftest.hcl... tearing down
tests/bicep-equivalence.tftest.hcl... pass

Success! 3 passed, 0 failed.
```

## CI/CD Integration

Add the tests to your pipeline to catch regressions.

```yaml
# .github/workflows/terraform-test.yml
name: Terraform Tests
on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tftest.hcl'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init

      - name: Run Plan-Mode Tests
        run: terraform test -filter=tests/bicep-equivalence.tftest.hcl

      - name: Run Integration Tests
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_USE_OIDC: true
        run: terraform test -filter=tests/integration.tftest.hcl
```

## Best Practices

Here are some guidelines for effective Terraform testing against Bicep baselines:

1. **Use plan-mode tests for most validations.** They are fast and do not require Azure credentials. Save apply-mode tests for critical integration checks.

2. **Document the Bicep reference.** Keep a copy of the Bicep template or its what-if output alongside your tests so reviewers can verify the expected values.

3. **Test security settings explicitly.** Things like TLS versions, public access flags, and HTTPS enforcement are the most important equivalence checks.

4. **Use variables for expected values.** Define the Bicep-expected values in locals or variable files rather than hardcoding them in assertions. This makes updates easier when the Bicep reference changes.

5. **Run integration tests on a schedule.** Azure services evolve, and defaults can change. Running full deployment tests weekly catches drift.

## Wrapping Up

Terraform's native test framework provides a clean way to validate that your configurations meet expected baselines, including Bicep-equivalent configurations. By defining expected values from your Bicep reference implementations and asserting against Terraform's outputs, you catch divergences before they reach production. Plan-mode tests give you fast feedback in CI, while apply-mode tests provide full validation when needed. This approach is especially valuable during migrations and in organizations where both tools coexist.
