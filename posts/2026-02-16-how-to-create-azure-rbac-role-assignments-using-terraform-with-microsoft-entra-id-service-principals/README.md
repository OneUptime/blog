# How to Create Azure RBAC Role Assignments Using Terraform with Microsoft Entra ID Service Principals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, RBAC, Service Principals, Microsoft Entra ID, Infrastructure as Code, Access Control

Description: A practical guide to managing Azure RBAC role assignments through Terraform, including creating service principals, assigning roles, and handling common pitfalls.

---

Managing RBAC role assignments manually through the Azure portal works for a handful of assignments, but it falls apart at scale. You lose track of who has what access, drift creeps in, and there is no audit trail showing when and why a role was assigned. Terraform solves this by treating role assignments as code: versioned, reviewed, and applied consistently.

In this post, I will walk through managing the complete lifecycle of service principals and their RBAC role assignments using Terraform. We will cover creating app registrations, service principals, custom role definitions, and role assignments at various scopes.

## Project Setup

First, let us set up the Terraform configuration. You need two providers: `azurerm` for Azure resource management and `azuread` for Microsoft Entra ID (formerly Azure AD) operations.

This configures the required providers and sets up authentication:

```hcl
# providers.tf
# Configure the Azure and Azure AD providers
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
  }
}

# Azure Resource Manager provider configuration
provider "azurerm" {
  features {}
}

# Azure AD provider for Entra ID operations
provider "azuread" {}

# Data source to get the current subscription and tenant info
data "azurerm_subscription" "current" {}
data "azurerm_client_config" "current" {}
```

## Step 1: Create an App Registration and Service Principal

This creates an app registration in Entra ID and the corresponding service principal. This creates the identity that will be assigned roles:

```hcl
# main.tf
# Create an Azure AD application registration
resource "azuread_application" "deployment_app" {
  display_name = "terraform-deployment-pipeline"

  # Owners can manage the application without Global Admin
  owners = [data.azurerm_client_config.current.object_id]

  # Optional: Add tags for organization
  tags = ["terraform-managed", "ci-cd"]
}

# Create the service principal for the application
resource "azuread_service_principal" "deployment_sp" {
  client_id                    = azuread_application.deployment_app.client_id
  app_role_assignment_required = false

  owners = [data.azurerm_client_config.current.object_id]

  tags = ["terraform-managed", "ci-cd"]
}

# Output the service principal details
output "service_principal_id" {
  value       = azuread_service_principal.deployment_sp.object_id
  description = "The object ID of the service principal"
}

output "application_id" {
  value       = azuread_application.deployment_app.client_id
  description = "The application (client) ID"
}
```

## Step 2: Assign Built-In Roles

Now assign Azure RBAC roles to the service principal. You can assign built-in roles at different scopes: subscription, resource group, or individual resource.

This assigns multiple built-in roles at different scopes:

```hcl
# Assign Contributor role at the resource group scope
resource "azurerm_role_assignment" "contributor_rg" {
  scope                = azurerm_resource_group.app_rg.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.deployment_sp.object_id

  # Skip the principal validation check during plan
  # This is useful when the SP might not exist yet during initial plan
  skip_service_principal_aad_check = true
}

# Assign Reader role at the subscription scope
resource "azurerm_role_assignment" "reader_subscription" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.deployment_sp.object_id
}

# Assign Key Vault Secrets User role at a specific Key Vault
resource "azurerm_role_assignment" "keyvault_secrets" {
  scope                = azurerm_key_vault.app_kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azuread_service_principal.deployment_sp.object_id
}

# Resource group that the SP will manage
resource "azurerm_resource_group" "app_rg" {
  name     = "rg-app-production"
  location = "eastus"
}

# Key Vault that the SP will access
resource "azurerm_key_vault" "app_kv" {
  name                       = "kv-app-prod-secrets"
  location                   = azurerm_resource_group.app_rg.location
  resource_group_name        = azurerm_resource_group.app_rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  enable_rbac_authorization  = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
}
```

## Step 3: Create and Assign Custom Role Definitions

Sometimes built-in roles are too broad or too narrow. Custom roles let you define exactly what permissions the service principal needs.

This creates a custom role definition and assigns it:

```hcl
# Define a custom role for the deployment pipeline
# This role can manage App Services and their configurations
# but cannot modify networking or other infrastructure
resource "azurerm_role_definition" "app_deployer" {
  name        = "Application Deployer"
  scope       = data.azurerm_subscription.current.id
  description = "Can deploy and manage web applications but not infrastructure"

  permissions {
    actions = [
      # App Service management
      "Microsoft.Web/sites/*",
      "Microsoft.Web/serverfarms/read",

      # Storage account read access for deployment artifacts
      "Microsoft.Storage/storageAccounts/read",
      "Microsoft.Storage/storageAccounts/listKeys/action",

      # Application Insights for monitoring
      "Microsoft.Insights/components/*",
      "Microsoft.Insights/alertRules/*",

      # Deployment operations
      "Microsoft.Resources/deployments/*",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    not_actions = [
      # Prevent deleting the App Service plan
      "Microsoft.Web/serverfarms/delete",
    ]

    data_actions = []
    not_data_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id,
  ]
}

# Assign the custom role to the service principal
resource "azurerm_role_assignment" "custom_deployer" {
  scope              = azurerm_resource_group.app_rg.id
  role_definition_id = azurerm_role_definition.app_deployer.role_definition_resource_id
  principal_id       = azuread_service_principal.deployment_sp.object_id
}
```

## Step 4: Manage Multiple Service Principals with Variables

In a real environment, you will have multiple service principals with different role requirements. Use variables and loops to manage them efficiently.

This uses a map variable to define service principals and their role assignments:

```hcl
# variables.tf
variable "service_principals" {
  description = "Map of service principals and their role assignments"
  type = map(object({
    display_name = string
    roles = list(object({
      role_name = string
      scope     = string
    }))
  }))
  default = {
    "deploy-pipeline" = {
      display_name = "CI/CD Deployment Pipeline"
      roles = [
        {
          role_name = "Contributor"
          scope     = "resource_group"
        },
        {
          role_name = "Key Vault Secrets User"
          scope     = "key_vault"
        }
      ]
    }
    "monitoring-reader" = {
      display_name = "Monitoring Service Reader"
      roles = [
        {
          role_name = "Monitoring Reader"
          scope     = "subscription"
        },
        {
          role_name = "Log Analytics Reader"
          scope     = "subscription"
        }
      ]
    }
    "backup-operator" = {
      display_name = "Backup Operations Service"
      roles = [
        {
          role_name = "Backup Contributor"
          scope     = "subscription"
        }
      ]
    }
  }
}

# service_principals.tf
# Create app registrations for each service principal
resource "azuread_application" "apps" {
  for_each     = var.service_principals
  display_name = each.value.display_name
  owners       = [data.azurerm_client_config.current.object_id]
  tags         = ["terraform-managed"]
}

# Create service principals
resource "azuread_service_principal" "sps" {
  for_each  = var.service_principals
  client_id = azuread_application.apps[each.key].client_id
  owners    = [data.azurerm_client_config.current.object_id]
  tags      = ["terraform-managed"]
}

# Flatten the role assignments for easier iteration
locals {
  role_assignments = flatten([
    for sp_key, sp in var.service_principals : [
      for role in sp.roles : {
        sp_key    = sp_key
        role_name = role.role_name
        scope     = role.scope
        # Create a unique key for the for_each
        unique_key = "${sp_key}-${role.role_name}-${role.scope}"
      }
    ]
  ])

  # Convert to a map for for_each
  role_assignments_map = {
    for ra in local.role_assignments : ra.unique_key => ra
  }

  # Map scope names to actual Azure resource IDs
  scope_map = {
    "subscription"   = data.azurerm_subscription.current.id
    "resource_group" = azurerm_resource_group.app_rg.id
    "key_vault"      = azurerm_key_vault.app_kv.id
  }
}

# Create all role assignments
resource "azurerm_role_assignment" "assignments" {
  for_each = local.role_assignments_map

  scope                = local.scope_map[each.value.scope]
  role_definition_name = each.value.role_name
  principal_id         = azuread_service_principal.sps[each.value.sp_key].object_id

  skip_service_principal_aad_check = true
}
```

## Step 5: Configure Workload Identity Federation

If the service principal will be used by GitHub Actions or another external identity provider, set up workload identity federation instead of client secrets.

This configures federated credentials for GitHub Actions:

```hcl
# Configure workload identity federation for GitHub Actions
resource "azuread_application_federated_identity_credential" "github_main" {
  application_id = azuread_application.apps["deploy-pipeline"].id
  display_name   = "github-actions-main"
  description    = "GitHub Actions from main branch"

  # Trust tokens from GitHub OIDC provider
  issuer   = "https://token.actions.githubusercontent.com"
  subject  = "repo:your-org/your-repo:ref:refs/heads/main"
  audiences = ["api://AzureADTokenExchange"]
}

resource "azuread_application_federated_identity_credential" "github_prod" {
  application_id = azuread_application.apps["deploy-pipeline"].id
  display_name   = "github-actions-production"
  description    = "GitHub Actions from production environment"

  issuer   = "https://token.actions.githubusercontent.com"
  subject  = "repo:your-org/your-repo:environment:production"
  audiences = ["api://AzureADTokenExchange"]
}
```

## Common Pitfalls and Solutions

**Race condition: role assignment before principal propagation.** When you create a service principal and immediately try to assign a role, the assignment might fail because Entra ID has not fully propagated the principal. The `skip_service_principal_aad_check` parameter helps, but you might also need to add a `depends_on` or use a `time_sleep` resource:

```hcl
# Add a delay to allow Entra ID replication
resource "time_sleep" "wait_for_sp" {
  depends_on      = [azuread_service_principal.deployment_sp]
  create_duration = "30s"
}

resource "azurerm_role_assignment" "after_delay" {
  depends_on = [time_sleep.wait_for_sp]
  # ... role assignment configuration
}
```

**Duplicate role assignments causing errors.** If a role assignment already exists (maybe created manually), Terraform will fail when trying to create it. Import the existing assignment:

```bash
# Import an existing role assignment into Terraform state
terraform import azurerm_role_assignment.contributor_rg "/subscriptions/<sub-id>/resourceGroups/rg-app-production/providers/Microsoft.Authorization/roleAssignments/<assignment-id>"
```

**Role assignment IDs are random GUIDs.** Azure generates a random GUID for each role assignment. If you destroy and recreate a role assignment, it gets a new GUID, which can cause issues with audit trails. To keep the GUID stable, you can specify it explicitly:

```hcl
resource "azurerm_role_assignment" "stable_id" {
  # Use a deterministic name based on the principal and role
  name                 = uuidv5("dns", "${azuread_service_principal.deployment_sp.object_id}-Contributor-${azurerm_resource_group.app_rg.id}")
  scope                = azurerm_resource_group.app_rg.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.deployment_sp.object_id
}
```

## Step 6: State Management and Security

Terraform state contains the object IDs of your service principals and the details of their role assignments. This is sensitive information that should be protected.

Use a remote backend with encryption. This configures Azure Blob Storage as the backend:

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "rbac/terraform.tfstate"

    # Use Azure AD authentication instead of storage account keys
    use_azuread_auth = true
  }
}
```

## Wrapping Up

Managing Azure RBAC through Terraform brings the same benefits you get from infrastructure as code for any other resource: consistency, auditability, and repeatability. Every role assignment is documented in code, reviewed through pull requests, and applied through a controlled pipeline. The patterns shown here - from simple single-principal assignments to multi-principal variable-driven configurations - scale from small teams to large enterprises. The key is to start with the principle of least privilege, use custom roles when built-in ones are too broad, and treat your RBAC configuration with the same rigor as any other infrastructure code.
