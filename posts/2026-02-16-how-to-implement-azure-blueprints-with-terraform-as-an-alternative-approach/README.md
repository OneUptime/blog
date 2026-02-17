# How to Implement Azure Blueprints with Terraform as an Alternative Approach

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Blueprints, Terraform, Infrastructure as Code, Azure Governance, Cloud Compliance, Azure Policy, Landing Zones

Description: Learn how to replicate Azure Blueprints functionality using Terraform for a more flexible, version-controlled approach to governance and landing zone deployment.

---

Azure Blueprints was designed to let organizations define repeatable sets of Azure resources, policies, and role assignments that comply with organizational standards. You would package resource groups, ARM templates, policy assignments, and RBAC assignments into a blueprint, then assign it to subscriptions to enforce governance.

However, Microsoft has signaled that Azure Blueprints is being superseded by other approaches - specifically, template specs, deployment stacks, and Terraform-based landing zone implementations. If you are starting fresh or looking to migrate from Blueprints, Terraform provides a more flexible, widely-adopted alternative that gives you the same governance guardrails with better version control and cross-platform support.

## What Azure Blueprints Does

Before diving into the Terraform alternative, let me clarify what Blueprints provides:

1. **Resource group creation**: Creates standardized resource groups with consistent naming
2. **ARM template deployment**: Deploys resources into those resource groups
3. **Policy assignment**: Applies Azure Policy assignments to enforce compliance
4. **Role assignment**: Assigns RBAC roles to specific groups or service principals
5. **Locking**: Locks deployed resources to prevent unauthorized changes
6. **Versioning**: Blueprints support versioning so you can track changes
7. **Assignment tracking**: You can see which subscriptions have which blueprint version

Terraform can do all of this and more.

## Step 1: Structure Your Terraform Project

Organize your Terraform code to mirror the Blueprint concept. A "landing zone" module replaces a Blueprint definition:

```
azure-landing-zone/
    modules/
        resource-groups/
            main.tf
            variables.tf
        policies/
            main.tf
            variables.tf
            policies/
                require-tags.json
                allowed-locations.json
        rbac/
            main.tf
            variables.tf
        networking/
            main.tf
            variables.tf
        monitoring/
            main.tf
            variables.tf
    environments/
        production/
            main.tf
            terraform.tfvars
        staging/
            main.tf
            terraform.tfvars
    main.tf
    variables.tf
    outputs.tf
    providers.tf
```

## Step 2: Define the Landing Zone Module

Create a root module that orchestrates all the governance components:

```hcl
# main.tf - Landing zone root module (replaces Blueprint definition)

# Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  # Store state in Azure Storage for team collaboration
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatestore"
    container_name       = "landing-zones"
    key                  = "production.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# Create standardized resource groups
module "resource_groups" {
  source = "./modules/resource-groups"

  environment    = var.environment
  location       = var.location
  project_name   = var.project_name
  cost_center    = var.cost_center
  department     = var.department
}

# Apply governance policies
module "policies" {
  source = "./modules/policies"

  subscription_id   = var.subscription_id
  allowed_locations = var.allowed_locations
  required_tags     = var.required_tags
  environment       = var.environment
}

# Configure RBAC assignments
module "rbac" {
  source = "./modules/rbac"

  subscription_id     = var.subscription_id
  admin_group_id      = var.admin_group_id
  developer_group_id  = var.developer_group_id
  reader_group_id     = var.reader_group_id
  resource_group_ids  = module.resource_groups.resource_group_ids
}

# Set up networking
module "networking" {
  source = "./modules/networking"

  resource_group_name = module.resource_groups.networking_rg_name
  location           = var.location
  vnet_address_space = var.vnet_address_space
  subnets            = var.subnets
  environment        = var.environment
}

# Configure monitoring
module "monitoring" {
  source = "./modules/monitoring"

  resource_group_name = module.resource_groups.monitoring_rg_name
  location           = var.location
  environment        = var.environment
  alert_email        = var.alert_email
}
```

## Step 3: Implement Resource Group Standardization

```hcl
# modules/resource-groups/main.tf
# Creates standardized resource groups with consistent naming and tagging

locals {
  # Standard naming convention: rg-{project}-{purpose}-{environment}
  resource_groups = {
    app     = "rg-${var.project_name}-app-${var.environment}"
    data    = "rg-${var.project_name}-data-${var.environment}"
    network = "rg-${var.project_name}-network-${var.environment}"
    monitor = "rg-${var.project_name}-monitor-${var.environment}"
    shared  = "rg-${var.project_name}-shared-${var.environment}"
  }

  # Standard tags applied to all resource groups
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    CostCenter  = var.cost_center
    Department  = var.department
    ManagedBy   = "Terraform"
    Blueprint   = "landing-zone-v2"
  }
}

resource "azurerm_resource_group" "groups" {
  for_each = local.resource_groups

  name     = each.value
  location = var.location
  tags     = local.common_tags
}

# Apply resource locks to prevent accidental deletion
resource "azurerm_management_lock" "rg_locks" {
  for_each = var.environment == "production" ? local.resource_groups : {}

  name       = "CanNotDelete-${each.key}"
  scope      = azurerm_resource_group.groups[each.key].id
  lock_level = "CanNotDelete"
  notes      = "Locked by landing zone governance. Contact platform team to remove."
}

output "resource_group_ids" {
  value = { for k, v in azurerm_resource_group.groups : k => v.id }
}

output "networking_rg_name" {
  value = azurerm_resource_group.groups["network"].name
}

output "monitoring_rg_name" {
  value = azurerm_resource_group.groups["monitor"].name
}
```

## Step 4: Implement Policy Assignments

```hcl
# modules/policies/main.tf
# Applies Azure Policy assignments (replaces Blueprint policy artifacts)

# Require specific tags on all resources
resource "azurerm_subscription_policy_assignment" "require_tags" {
  for_each = toset(var.required_tags)

  name                 = "require-tag-${lower(each.key)}"
  subscription_id      = "/subscriptions/${var.subscription_id}"
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025"
  display_name         = "Require ${each.key} tag on resource groups"
  enforcement_mode     = var.environment == "production" ? "Default" : "DoNotEnforce"

  parameters = jsonencode({
    tagName = { value = each.key }
  })
}

# Restrict resource deployment to allowed locations
resource "azurerm_subscription_policy_assignment" "allowed_locations" {
  name                 = "allowed-locations"
  subscription_id      = "/subscriptions/${var.subscription_id}"
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c"
  display_name         = "Allowed locations for resources"

  parameters = jsonencode({
    listOfAllowedLocations = { value = var.allowed_locations }
  })
}

# Deny public IP addresses in production
resource "azurerm_subscription_policy_assignment" "deny_public_ip" {
  count = var.environment == "production" ? 1 : 0

  name                 = "deny-public-ip"
  subscription_id      = "/subscriptions/${var.subscription_id}"
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/6c112d4e-5bc7-47ae-a041-ea2d9dccd749"
  display_name         = "Deny public IP addresses"
}

# Enable Azure Defender for all resource types
resource "azurerm_subscription_policy_assignment" "enable_defender" {
  name                 = "enable-defender"
  subscription_id      = "/subscriptions/${var.subscription_id}"
  policy_definition_id = "/providers/Microsoft.Authorization/policySetDefinitions/1f3afdf9-d0c9-4c3d-847f-89da613e70a8"
  display_name         = "Enable Azure Defender"
  identity {
    type = "SystemAssigned"
  }
  location = "eastus"
}
```

## Step 5: Implement RBAC Assignments

```hcl
# modules/rbac/main.tf
# Configures role assignments (replaces Blueprint RBAC artifacts)

# Admin group gets Owner on the subscription
resource "azurerm_role_assignment" "admin_owner" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Owner"
  principal_id         = var.admin_group_id
}

# Developer group gets Contributor on app and data resource groups only
resource "azurerm_role_assignment" "developer_contributor" {
  for_each = {
    app  = var.resource_group_ids["app"]
    data = var.resource_group_ids["data"]
  }

  scope                = each.value
  role_definition_name = "Contributor"
  principal_id         = var.developer_group_id
}

# Reader group gets Reader on the subscription
resource "azurerm_role_assignment" "reader_access" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Reader"
  principal_id         = var.reader_group_id
}

# Developer group gets Reader on networking (can see but not modify)
resource "azurerm_role_assignment" "developer_network_reader" {
  scope                = var.resource_group_ids["network"]
  role_definition_name = "Reader"
  principal_id         = var.developer_group_id
}
```

## Step 6: Define Environment Variables

```hcl
# environments/production/terraform.tfvars
# Production landing zone configuration

subscription_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
environment     = "production"
location        = "eastus"
project_name    = "contoso-app"
cost_center     = "CC-4520"
department      = "Engineering"

# Governance settings
allowed_locations = ["eastus", "westus2"]
required_tags     = ["CostCenter", "Department", "Environment", "Owner"]

# RBAC group object IDs from Azure AD
admin_group_id     = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
developer_group_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
reader_group_id    = "cccccccc-cccc-cccc-cccc-cccccccccccc"

# Networking
vnet_address_space = ["10.0.0.0/16"]
subnets = {
  app      = { address_prefix = "10.0.1.0/24", service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"] }
  data     = { address_prefix = "10.0.2.0/24", service_endpoints = ["Microsoft.Sql"] }
  gateway  = { address_prefix = "10.0.3.0/24", service_endpoints = [] }
  bastion  = { address_prefix = "10.0.4.0/26", service_endpoints = [] }
}

alert_email = "ops-team@contoso.com"
```

## Step 7: Implement Assignment Tracking

One feature of Blueprints is assignment tracking - knowing which subscriptions have which version. Replicate this with Terraform state and tagging:

```hcl
# Track the landing zone version via a tag on the subscription
resource "azurerm_subscription_tag" "landing_zone_version" {
  subscription_id = var.subscription_id
  tag_name        = "LandingZoneVersion"
  tag_value       = var.landing_zone_version
}

resource "azurerm_subscription_tag" "landing_zone_applied" {
  subscription_id = var.subscription_id
  tag_name        = "LandingZoneApplied"
  tag_value       = timestamp()
}
```

You can query all subscriptions to see their landing zone versions:

```bash
# List all subscriptions and their landing zone versions
az tag list --resource-id /subscriptions/<sub-id> \
  --query "properties.tags.LandingZoneVersion"
```

## Step 8: CI/CD Pipeline for Landing Zone Deployment

Use a pipeline to deploy and update landing zones across subscriptions:

```yaml
# .github/workflows/deploy-landing-zone.yml
name: Deploy Landing Zone

on:
  push:
    branches: [main]
    paths:
      - 'azure-landing-zone/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: azure-landing-zone/environments/production

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: azure-landing-zone/environments/production
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: azure-landing-zone/environments/production/tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: azure-landing-zone/environments/production

      - name: Terraform Apply
        run: terraform apply tfplan
        working-directory: azure-landing-zone/environments/production
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
```

## Advantages of Terraform Over Blueprints

1. **Version control**: Your entire governance configuration is in Git with full history
2. **Dry runs**: `terraform plan` shows exactly what will change before applying
3. **Modularity**: Modules can be shared across teams and organizations
4. **Multi-cloud**: Same approach works for AWS, GCP, and other providers
5. **Community**: Massive ecosystem of modules, examples, and best practices
6. **Testing**: Tools like Terratest let you write automated tests for your infrastructure
7. **State management**: Terraform state provides a clear picture of what is deployed

## Migration Path from Blueprints

If you have existing Blueprint assignments:

1. Import existing resources into Terraform state using `terraform import`
2. Replicate the Blueprint's policy and RBAC assignments in Terraform code
3. Test the Terraform deployment against a non-production subscription
4. Unassign the Blueprint and apply the Terraform configuration
5. Verify all governance controls are still in place

## Summary

While Azure Blueprints provided a portal-based approach to governance, Terraform offers a more powerful and flexible alternative. You get the same governance guardrails - standardized resource groups, policy enforcement, RBAC assignments, and resource locks - with the added benefits of version control, plan/apply workflow, modular design, and CI/CD integration. As Microsoft moves away from Blueprints, Terraform is the natural choice for organizations that want infrastructure as code for their Azure governance layer.
