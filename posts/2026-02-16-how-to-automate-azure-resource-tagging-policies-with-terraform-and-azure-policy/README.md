# How to Automate Azure Resource Tagging Policies with Terraform and Azure Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure Policy, Tagging, Governance, Cost Management, Infrastructure as Code, Automation

Description: Automate Azure resource tagging enforcement and inheritance using Terraform-managed Azure policies for consistent cost tracking and governance.

---

Tags are the unsung hero of Azure governance. Without consistent tagging, cost allocation is guesswork, incident response is slower (which team owns this resource?), and compliance reporting becomes a manual ordeal. The problem is that relying on people to tag resources correctly never works. Someone forgets, someone misspells the environment name, someone uses "prod" instead of "Production." Automation is the only way to get consistent tags at scale.

Azure Policy combined with Terraform gives you a system that enforces tagging standards, inherits tags from parent resources, and remediates non-compliant resources automatically. In this post, I will build a complete tagging framework using both tools.

## Defining a Tagging Strategy

Before writing any code, agree on which tags are required and what values are acceptable. Here is a tagging strategy I have used successfully across several organizations:

| Tag Name | Purpose | Required | Example Values |
|----------|---------|----------|----------------|
| Environment | Identifies the deployment stage | Yes | Development, Staging, Production |
| CostCenter | Maps to financial cost center | Yes | CC-1234, CC-5678 |
| Owner | Contact email for the resource owner | Yes | team-platform@company.com |
| Application | Name of the application or workload | Yes | order-service, data-pipeline |
| ManagedBy | How the resource is managed | Yes | Terraform, Bicep, Manual |
| CreatedDate | When the resource was created | Auto | 2026-02-16 |

## Policy 1: Require Tags on Resource Creation

The first policy prevents resource creation if required tags are missing:

```hcl
# policies/require-tags.tf - Deny resource creation without required tags

# Define one policy per required tag for flexibility
resource "azurerm_policy_definition" "require_environment_tag" {
  name         = "require-environment-tag"
  display_name = "Require Environment tag on resources"
  description  = "Resources must have an Environment tag with an allowed value"
  policy_type  = "Custom"
  mode         = "Indexed"

  metadata = jsonencode({
    version  = "1.0.0"
    category = "Tags"
  })

  parameters = jsonencode({
    allowedValues = {
      type = "Array"
      metadata = {
        displayName = "Allowed tag values"
        description = "List of allowed values for the Environment tag"
      }
      defaultValue = ["Development", "Staging", "Production", "Sandbox"]
    }
  })

  # Deny if the Environment tag is missing or has a disallowed value
  policy_rule = jsonencode({
    if = {
      anyOf = [
        {
          field  = "tags['Environment']"
          exists = "false"
        },
        {
          field = "tags['Environment']"
          notIn = "[parameters('allowedValues')]"
        }
      ]
    }
    then = {
      effect = "deny"
    }
  })
}

# Same pattern for other required tags
resource "azurerm_policy_definition" "require_cost_center_tag" {
  name         = "require-costcenter-tag"
  display_name = "Require CostCenter tag on resources"
  description  = "Resources must have a CostCenter tag matching the pattern CC-XXXX"
  policy_type  = "Custom"
  mode         = "Indexed"

  metadata = jsonencode({
    version  = "1.0.0"
    category = "Tags"
  })

  # Deny if CostCenter tag is missing or does not match pattern
  policy_rule = jsonencode({
    if = {
      anyOf = [
        {
          field  = "tags['CostCenter']"
          exists = "false"
        },
        {
          field  = "tags['CostCenter']"
          notMatch = "CC-####"  # Pattern: CC- followed by 4 digits
        }
      ]
    }
    then = {
      effect = "deny"
    }
  })
}

resource "azurerm_policy_definition" "require_owner_tag" {
  name         = "require-owner-tag"
  display_name = "Require Owner tag on resources"
  description  = "Resources must have an Owner tag with a valid email address"
  policy_type  = "Custom"
  mode         = "Indexed"

  metadata = jsonencode({
    version  = "1.0.0"
    category = "Tags"
  })

  policy_rule = jsonencode({
    if = {
      anyOf = [
        {
          field  = "tags['Owner']"
          exists = "false"
        },
        {
          field    = "tags['Owner']"
          notLike  = "*@*.*"  # Basic email pattern check
        }
      ]
    }
    then = {
      effect = "deny"
    }
  })
}
```

## Policy 2: Inherit Tags from Resource Group

Resources should inherit tags from their parent resource group. This is especially useful for the CostCenter and Environment tags - set them on the resource group once, and every resource inside automatically gets them:

```hcl
# policies/inherit-tags.tf - Automatically inherit tags from resource group

# Create a policy for each tag that should be inherited
resource "azurerm_policy_definition" "inherit_tag" {
  for_each = toset(["Environment", "CostCenter", "Owner", "Application"])

  name         = "inherit-${lower(each.key)}-from-rg"
  display_name = "Inherit ${each.key} tag from resource group"
  description  = "Adds or replaces the ${each.key} tag with the value from the parent resource group"
  policy_type  = "Custom"
  mode         = "Indexed"

  metadata = jsonencode({
    version  = "1.0.0"
    category = "Tags"
  })

  # Modify effect adds the tag automatically
  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          # Only apply if the tag on the resource is different from the RG
          field    = "tags['${each.key}']"
          notEquals = "[resourceGroup().tags['${each.key}']]"
        },
        {
          # Only apply if the resource group actually has the tag
          value    = "[resourceGroup().tags['${each.key}']]"
          notEquals = ""
        }
      ]
    }
    then = {
      effect = "modify"
      details = {
        roleDefinitionIds = [
          # Tag Contributor role - minimal permissions for tag modification
          "/providers/Microsoft.Authorization/roleDefinitions/4a9ae827-6dc8-4573-8ac7-8239d42aa03f"
        ]
        operations = [
          {
            operation = "addOrReplace"
            field     = "tags['${each.key}']"
            value     = "[resourceGroup().tags['${each.key}']]"
          }
        ]
      }
    }
  })
}
```

## Policy 3: Add CreatedDate Tag Automatically

Automatically stamp resources with the date they were created:

```hcl
# policies/add-created-date.tf - Auto-add CreatedDate tag on resource creation

resource "azurerm_policy_definition" "add_created_date" {
  name         = "add-created-date-tag"
  display_name = "Add CreatedDate tag if missing"
  description  = "Automatically adds a CreatedDate tag with the current UTC date when a resource is created"
  policy_type  = "Custom"
  mode         = "Indexed"

  metadata = jsonencode({
    version  = "1.0.0"
    category = "Tags"
  })

  policy_rule = jsonencode({
    if = {
      field  = "tags['CreatedDate']"
      exists = "false"
    }
    then = {
      effect = "modify"
      details = {
        roleDefinitionIds = [
          "/providers/Microsoft.Authorization/roleDefinitions/4a9ae827-6dc8-4573-8ac7-8239d42aa03f"
        ]
        operations = [
          {
            operation = "addOrReplace"
            field     = "tags['CreatedDate']"
            value     = "[utcNow('yyyy-MM-dd')]"
          }
        ]
      }
    }
  })
}
```

## Grouping into an Initiative

Bundle all tagging policies into a single initiative for easier assignment:

```hcl
# policies/tagging-initiative.tf - Group all tag policies into one initiative

resource "azurerm_policy_set_definition" "tagging" {
  name         = "tagging-governance"
  display_name = "Tagging Governance Initiative"
  description  = "Comprehensive tagging policies for enforcement and auto-remediation"
  policy_type  = "Custom"

  metadata = jsonencode({
    version  = "2.0.0"
    category = "Tags"
  })

  parameters = jsonencode({
    allowedEnvironments = {
      type         = "Array"
      defaultValue = ["Development", "Staging", "Production", "Sandbox"]
      metadata = {
        displayName = "Allowed Environment values"
      }
    }
  })

  # Require tags policies (deny effect)
  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.require_environment_tag.id
    reference_id         = "RequireEnvironmentTag"
    parameter_values = jsonencode({
      allowedValues = { value = "[parameters('allowedEnvironments')]" }
    })
  }

  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.require_cost_center_tag.id
    reference_id         = "RequireCostCenterTag"
  }

  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.require_owner_tag.id
    reference_id         = "RequireOwnerTag"
  }

  # Inherit tag policies (modify effect)
  dynamic "policy_definition_reference" {
    for_each = azurerm_policy_definition.inherit_tag
    content {
      policy_definition_id = policy_definition_reference.value.id
      reference_id         = "Inherit${policy_definition_reference.key}Tag"
    }
  }

  # Auto-add CreatedDate
  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.add_created_date.id
    reference_id         = "AddCreatedDateTag"
  }
}
```

## Assigning the Initiative

```hcl
# policies/assignment.tf - Assign the tagging initiative

data "azurerm_management_group" "root" {
  name = "mg-company-root"
}

resource "azurerm_management_group_policy_assignment" "tagging" {
  name                 = "tagging-governance"
  display_name         = "Tagging Governance"
  policy_definition_id = azurerm_policy_set_definition.tagging.id
  management_group_id  = data.azurerm_management_group.root.id

  # Managed identity needed for modify policies
  identity {
    type = "SystemAssigned"
  }

  location = "eastus2"

  parameters = jsonencode({
    allowedEnvironments = {
      value = ["Development", "Staging", "Production"]
    }
  })

  # Helpful messages for users whose deployments are blocked
  non_compliance_message {
    content                        = "Resource must have an Environment tag with value: Development, Staging, or Production"
    policy_definition_reference_id = "RequireEnvironmentTag"
  }

  non_compliance_message {
    content                        = "Resource must have a CostCenter tag in format CC-XXXX (e.g., CC-1234)"
    policy_definition_reference_id = "RequireCostCenterTag"
  }

  non_compliance_message {
    content                        = "Resource must have an Owner tag with a valid email address"
    policy_definition_reference_id = "RequireOwnerTag"
  }
}

# Grant the policy's managed identity Tag Contributor on the management group
resource "azurerm_role_assignment" "tagging_policy" {
  scope                = data.azurerm_management_group.root.id
  role_definition_name = "Tag Contributor"
  principal_id         = azurerm_management_group_policy_assignment.tagging.identity[0].principal_id
}
```

## Remediating Existing Resources

New resources get tagged automatically, but existing resources need remediation:

```hcl
# policies/remediation.tf - Fix existing non-compliant resources

resource "azurerm_management_group_policy_remediation" "inherit_tags" {
  for_each             = azurerm_policy_definition.inherit_tag
  name                 = "remediate-inherit-${lower(each.key)}"
  management_group_id  = data.azurerm_management_group.root.id
  policy_assignment_id = azurerm_management_group_policy_assignment.tagging.id
  policy_definition_reference_id = "Inherit${each.key}Tag"
}

resource "azurerm_management_group_policy_remediation" "created_date" {
  name                 = "remediate-created-date"
  management_group_id  = data.azurerm_management_group.root.id
  policy_assignment_id = azurerm_management_group_policy_assignment.tagging.id
  policy_definition_reference_id = "AddCreatedDateTag"
}
```

## Integrating with Terraform Resource Definitions

To make sure your Terraform-managed resources always have the right tags, create a local that generates the standard tag set:

```hcl
# tags.tf - Standard tag set for all Terraform-managed resources

locals {
  common_tags = {
    Environment = var.environment
    CostCenter  = var.cost_center
    Owner       = var.owner_email
    Application = var.application_name
    ManagedBy   = "Terraform"
  }
}

# Use in every resource
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.application_name}-${var.environment}"
  location = "eastus2"
  tags     = local.common_tags
}

resource "azurerm_storage_account" "main" {
  name                = "st${var.application_name}${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  account_tier        = "Standard"
  account_replication_type = "LRS"
  tags                = local.common_tags  # Same tags everywhere
}
```

## Monitoring Compliance

After deploying the policies, monitor compliance through Azure Policy's built-in compliance view or query it programmatically:

```bash
# Check overall compliance for the tagging initiative
az policy state summarize \
  --management-group "mg-company-root" \
  --policy-set-definition "tagging-governance" \
  --output table
```

## Wrapping Up

A robust tagging framework with Azure Policy and Terraform ensures consistent tags across your entire Azure estate. Require critical tags with deny policies, auto-inherit common tags from resource groups with modify policies, and remediate existing resources to close the gap. The investment in setting this up pays dividends in cost management, security, and operational clarity. Build the policies once in Terraform, assign them at the management group level, and every subscription in your organization benefits automatically.
