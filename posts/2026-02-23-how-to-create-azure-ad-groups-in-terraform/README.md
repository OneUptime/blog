# How to Create Azure AD Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure AD, Entra ID, Group, Identity, Infrastructure as Code

Description: Learn how to create and manage Azure AD groups in Terraform including security groups, Microsoft 365 groups, dynamic membership, and nested groups.

---

Groups in Azure Active Directory (now Microsoft Entra ID) are how you manage access at scale. Instead of assigning permissions to individual users, you assign them to groups and then add or remove members as needed. This pattern simplifies access management significantly, especially when combined with Terraform to define your group structure as code.

This guide covers creating different types of Azure AD groups in Terraform, managing memberships, configuring dynamic groups, and using groups for Azure RBAC.

## Provider Configuration

```hcl
# versions.tf

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.8"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.74"
    }
  }
}

provider "azuread" {}
provider "azurerm" {
  features {}
}
```

## Data Sources

```hcl
# data.tf
data "azuread_client_config" "current" {}
data "azurerm_subscription" "current" {}
```

## Basic Security Group

Security groups are the most common type. They control access to Azure resources and applications.

```hcl
# groups.tf
# Security group for the engineering team
resource "azuread_group" "engineering" {
  display_name     = "Engineering Team"
  description      = "Members of the engineering team"
  security_enabled = true
  mail_enabled     = false

  # The Terraform SP owns the group
  owners = [data.azuread_client_config.current.object_id]

  # Prevent creating a duplicate group with the same display name
  prevent_duplicate_names = true
}

# Security group for the DevOps team
resource "azuread_group" "devops" {
  display_name     = "DevOps Team"
  description      = "Members responsible for infrastructure and deployments"
  security_enabled = true
  mail_enabled     = false
  owners           = [data.azuread_client_config.current.object_id]
}

# Security group for database administrators
resource "azuread_group" "dba" {
  display_name     = "Database Administrators"
  description      = "Members with database administration access"
  security_enabled = true
  mail_enabled     = false
  owners           = [data.azuread_client_config.current.object_id]
}
```

## Adding Group Members

Add users and service principals as members.

```hcl
# members.tf
# Look up users by their UPN (email)
data "azuread_user" "alice" {
  user_principal_name = "alice@example.com"
}

data "azuread_user" "bob" {
  user_principal_name = "bob@example.com"
}

data "azuread_user" "carol" {
  user_principal_name = "carol@example.com"
}

# Add members to the engineering group
resource "azuread_group_member" "eng_alice" {
  group_object_id  = azuread_group.engineering.id
  member_object_id = data.azuread_user.alice.id
}

resource "azuread_group_member" "eng_bob" {
  group_object_id  = azuread_group.engineering.id
  member_object_id = data.azuread_user.bob.id
}

resource "azuread_group_member" "eng_carol" {
  group_object_id  = azuread_group.engineering.id
  member_object_id = data.azuread_user.carol.id
}
```

## Managing Members with for_each

For larger teams, use a variable and `for_each` to manage membership.

```hcl
# dynamic-members.tf
variable "engineering_members" {
  description = "UPNs of engineering team members"
  type        = set(string)
  default = [
    "alice@example.com",
    "bob@example.com",
    "carol@example.com",
    "dave@example.com",
    "eve@example.com",
  ]
}

data "azuread_user" "engineering" {
  for_each            = var.engineering_members
  user_principal_name = each.value
}

resource "azuread_group_member" "engineering" {
  for_each         = var.engineering_members
  group_object_id  = azuread_group.engineering.id
  member_object_id = data.azuread_user.engineering[each.value].id
}
```

## Dynamic Groups

Dynamic groups automatically add and remove members based on user attributes. This requires Microsoft Entra ID P1 or P2 licensing for user-based dynamic groups.

```hcl
# dynamic-groups.tf
# All users in the Engineering department
resource "azuread_group" "engineering_dynamic" {
  display_name     = "Engineering Department (Dynamic)"
  description      = "Auto-populated group based on department attribute"
  security_enabled = true
  mail_enabled     = false
  types            = ["DynamicMembership"]
  owners           = [data.azuread_client_config.current.object_id]

  dynamic_membership {
    enabled = true
    rule    = "user.department -eq \"Engineering\""
  }
}

# All users with a specific job title
resource "azuread_group" "managers" {
  display_name     = "All Managers (Dynamic)"
  description      = "Auto-populated group of all managers"
  security_enabled = true
  mail_enabled     = false
  types            = ["DynamicMembership"]
  owners           = [data.azuread_client_config.current.object_id]

  dynamic_membership {
    enabled = true
    rule    = "user.jobTitle -contains \"Manager\""
  }
}

# All users in a specific location
resource "azuread_group" "us_east" {
  display_name     = "US East Office (Dynamic)"
  description      = "Users in the US East office"
  security_enabled = true
  mail_enabled     = false
  types            = ["DynamicMembership"]
  owners           = [data.azuread_client_config.current.object_id]

  dynamic_membership {
    enabled = true
    rule    = "(user.usageLocation -eq \"US\") and (user.city -eq \"New York\")"
  }
}

# Dynamic group for devices (useful for Intune)
resource "azuread_group" "windows_devices" {
  display_name     = "Windows Devices (Dynamic)"
  description      = "All Windows devices"
  security_enabled = true
  mail_enabled     = false
  types            = ["DynamicMembership"]
  owners           = [data.azuread_client_config.current.object_id]

  dynamic_membership {
    enabled = true
    rule    = "device.deviceOSType -eq \"Windows\""
  }
}
```

## Microsoft 365 Groups

M365 groups provide collaboration features like shared mailboxes, SharePoint sites, and Microsoft Teams integration.

```hcl
# m365-groups.tf
resource "azuread_group" "project_alpha" {
  display_name     = "Project Alpha"
  description      = "Collaboration group for Project Alpha"
  security_enabled = true
  mail_enabled     = true
  mail_nickname    = "project-alpha"
  types            = ["Unified"]  # Unified = Microsoft 365 group

  # Microsoft 365 groups must have at least one user owner
  owners = [
    data.azuread_client_config.current.object_id,
    data.azuread_user.alice.id,
  ]

  # Control visibility
  visibility = "Private"  # "Public" or "Private"
}
```

## Nested Groups

Add a group as a member of another group to create hierarchical access structures.

```hcl
# nested-groups.tf
# Parent group: All IT Staff
resource "azuread_group" "it_staff" {
  display_name     = "IT Staff"
  description      = "All IT department staff"
  security_enabled = true
  mail_enabled     = false
  owners           = [data.azuread_client_config.current.object_id]
}

# Add the DevOps group as a member of IT Staff
resource "azuread_group_member" "devops_in_it" {
  group_object_id  = azuread_group.it_staff.id
  member_object_id = azuread_group.devops.id
}

# Add the DBA group as a member of IT Staff
resource "azuread_group_member" "dba_in_it" {
  group_object_id  = azuread_group.it_staff.id
  member_object_id = azuread_group.dba.id
}
```

## Using Groups for Azure RBAC

Assign Azure roles to groups instead of individual users.

```hcl
# rbac.tf
# DevOps team gets Contributor on the production subscription
resource "azurerm_role_assignment" "devops_contributor" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = azuread_group.devops.id
}

# DBA team gets SQL DB Contributor on the database resource group
resource "azurerm_role_assignment" "dba_sql" {
  scope                = "/subscriptions/${data.azurerm_subscription.current.subscription_id}/resourceGroups/rg-databases"
  role_definition_name = "SQL DB Contributor"
  principal_id         = azuread_group.dba.id
}

# Engineering team gets Reader on production
resource "azurerm_role_assignment" "eng_reader" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Reader"
  principal_id         = azuread_group.engineering.id
}
```

## Creating Multiple Groups with a Module

Define a reusable pattern for creating groups.

```hcl
# variables.tf
variable "security_groups" {
  description = "Map of security groups to create"
  type = map(object({
    description = string
    members     = optional(set(string), [])
  }))
  default = {
    "platform-team" = {
      description = "Platform engineering team"
      members     = ["alice@example.com", "bob@example.com"]
    }
    "security-team" = {
      description = "Information security team"
      members     = ["carol@example.com"]
    }
    "on-call" = {
      description = "Current on-call rotation"
      members     = []
    }
  }
}

resource "azuread_group" "security_groups" {
  for_each         = var.security_groups
  display_name     = each.key
  description      = each.value.description
  security_enabled = true
  mail_enabled     = false
  owners           = [data.azuread_client_config.current.object_id]
}
```

## Outputs

```hcl
# outputs.tf
output "group_ids" {
  value = {
    engineering = azuread_group.engineering.id
    devops      = azuread_group.devops.id
    dba         = azuread_group.dba.id
    it_staff    = azuread_group.it_staff.id
  }
  description = "Object IDs of the created groups"
}
```

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Things to Watch Out For

**Terraform manages what it creates.** If you add members through the Azure portal after Terraform creates a group, the next `terraform apply` will not remove those manually-added members - unless you explicitly manage all members through Terraform.

**Dynamic group rules are evaluated asynchronously.** After creating a dynamic group, it may take a few minutes for Azure AD to populate the membership based on the rule.

**Nested group support varies by feature.** Microsoft Entra ID supports nested security groups for membership and Conditional Access scopes, but nested groups are not supported for every scenario, such as Microsoft 365 group nesting, license assignment, or access to shared resources and apps assigned to the parent group.

**The AzureAD provider requires appropriate permissions.** A service principal running Terraform needs Microsoft Graph application permissions such as `Group.ReadWrite.All` or `Directory.ReadWrite.All`. A user principal needs the Groups Administrator role or equivalent permissions.

Managing groups in Terraform gives you a clear, reviewable record of who has access to what. Combined with Azure RBAC role assignments, it creates a complete access management system that is auditable and reproducible.
