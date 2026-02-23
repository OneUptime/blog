# How to Create Azure AD Conditional Access in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure AD, Conditional Access, Security, Infrastructure as Code

Description: Learn how to create and manage Azure AD Conditional Access policies using Terraform for enhanced identity security and zero-trust access control.

---

Azure AD Conditional Access is a central component of Microsoft's zero-trust security model. It allows you to define policies that control when, where, and how users can access your cloud resources. Managing these policies through Terraform ensures they are version-controlled, consistently applied, and easily reproducible across environments. This guide shows you how to implement Conditional Access policies as code.

## Understanding Conditional Access

Conditional Access policies evaluate signals such as user identity, device state, location, and application being accessed. Based on these signals, the policy either grants access, requires additional verification (like MFA), or blocks access entirely.

## Setting Up the Providers

```hcl
# Configure the Azure AD provider for Conditional Access
terraform {
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azuread" {}

provider "azurerm" {
  features {}
}
```

## Creating a Basic MFA Policy

The most common Conditional Access policy requires multi-factor authentication:

```hcl
# Get all users group for broad policy application
data "azuread_group" "all_users" {
  display_name     = "All Users"
  security_enabled = true
}

# Create a Conditional Access policy requiring MFA
resource "azuread_conditional_access_policy" "require_mfa" {
  display_name = "Require MFA for All Users"
  state        = "enabled"

  conditions {
    # Apply to all users in the specified group
    users {
      included_groups = [data.azuread_group.all_users.object_id]

      # Exclude emergency access accounts
      excluded_users = [azuread_user.break_glass.object_id]
    }

    # Apply to all cloud applications
    applications {
      included_applications = ["All"]
    }

    # Apply from any location
    locations {
      included_locations = ["All"]
      # Exclude trusted office locations
      excluded_locations = [azuread_named_location.office.id]
    }

    # Apply to all client app types
    client_app_types = ["all"]
  }

  # Require MFA as the grant control
  grant_controls {
    operator          = "OR"
    built_in_controls = ["mfa"]
  }
}
```

## Defining Named Locations

Named locations allow you to create trusted networks that can be referenced in policies:

```hcl
# Define a trusted office location by IP ranges
resource "azuread_named_location" "office" {
  display_name = "Corporate Office"

  ip {
    ip_ranges = [
      "203.0.113.0/24",
      "198.51.100.0/24"
    ]
    trusted = true
  }
}

# Define a country-based location
resource "azuread_named_location" "allowed_countries" {
  display_name = "Allowed Countries"

  country {
    countries_and_regions = [
      "US",
      "CA",
      "GB",
      "DE"
    ]
    include_unknown_countries_and_regions = false
  }
}
```

## Blocking Access from Untrusted Locations

```hcl
# Block sign-ins from countries not in the allowed list
resource "azuread_conditional_access_policy" "block_untrusted_countries" {
  display_name = "Block Access from Untrusted Countries"
  state        = "enabled"

  conditions {
    users {
      included_groups = [data.azuread_group.all_users.object_id]
      excluded_users  = [azuread_user.break_glass.object_id]
    }

    applications {
      included_applications = ["All"]
    }

    locations {
      included_locations = ["All"]
      excluded_locations = [
        azuread_named_location.allowed_countries.id,
        azuread_named_location.office.id
      ]
    }

    client_app_types = ["all"]
  }

  # Block access entirely
  grant_controls {
    operator          = "OR"
    built_in_controls = ["block"]
  }
}
```

## Requiring Compliant Devices

Ensure that users can only access resources from managed, compliant devices:

```hcl
# Require compliant devices for sensitive applications
resource "azuread_conditional_access_policy" "require_compliant_device" {
  display_name = "Require Compliant Device for Sensitive Apps"
  state        = "enabled"

  conditions {
    users {
      included_groups = [data.azuread_group.all_users.object_id]
    }

    applications {
      # Apply only to specific sensitive applications
      included_applications = [
        azuread_application.hr_portal.client_id,
        azuread_application.finance_app.client_id
      ]
    }

    # Apply to all platforms
    platforms {
      included_platforms = ["all"]
    }

    client_app_types = ["browser", "mobileAppsAndDesktopClients"]
  }

  grant_controls {
    operator          = "AND"
    built_in_controls = ["mfa", "compliantDevice"]
  }
}

# Reference existing applications
data "azuread_application" "hr_portal" {
  display_name = "HR Portal"
}

data "azuread_application" "finance_app" {
  display_name = "Finance Application"
}
```

## Session Controls

Conditional Access can also control the session behavior:

```hcl
# Enforce session controls for external access
resource "azuread_conditional_access_policy" "session_controls" {
  display_name = "Enforce Session Controls for External Access"
  state        = "enabled"

  conditions {
    users {
      included_groups = [data.azuread_group.all_users.object_id]
    }

    applications {
      included_applications = ["All"]
    }

    # Only apply when accessing from outside the office
    locations {
      included_locations = ["All"]
      excluded_locations = [azuread_named_location.office.id]
    }

    client_app_types = ["browser"]
  }

  grant_controls {
    operator          = "OR"
    built_in_controls = ["mfa"]
  }

  # Configure session controls
  session_controls {
    # Limit session lifetime
    sign_in_frequency {
      value  = 4
      type   = "hours"
    }

    # Disable persistent browser sessions
    persistent_browser {
      mode = "never"
    }
  }
}
```

## Emergency Access Account

Every Conditional Access deployment should include a break-glass account that bypasses all policies:

```hcl
# Create an emergency access account
resource "azuread_user" "break_glass" {
  user_principal_name = "emergency-access@yourdomain.onmicrosoft.com"
  display_name        = "Emergency Access Account"
  password            = var.break_glass_password

  # Do not require password change
  force_password_change = false
}

# Variable for the break-glass password (use a secrets manager)
variable "break_glass_password" {
  type      = string
  sensitive = true
}

# Assign Global Administrator role to the break-glass account
resource "azuread_directory_role_assignment" "break_glass_admin" {
  role_id             = azuread_directory_role.global_admin.template_id
  principal_object_id = azuread_user.break_glass.object_id
}

data "azuread_directory_role" "global_admin" {
  display_name = "Global Administrator"
}
```

## Managing Policies at Scale

Use variables and loops to manage multiple policies efficiently:

```hcl
# Define policies as a variable map
variable "conditional_access_policies" {
  type = map(object({
    display_name     = string
    state            = string
    included_groups  = list(string)
    included_apps    = list(string)
    grant_controls   = list(string)
    require_mfa      = bool
  }))
  default = {
    "admin-mfa" = {
      display_name    = "Require MFA for Admins"
      state           = "enabled"
      included_groups = ["Global Admins"]
      included_apps   = ["All"]
      grant_controls  = ["mfa"]
      require_mfa     = true
    }
    "guest-restrictions" = {
      display_name    = "Restrict Guest Access"
      state           = "enabled"
      included_groups = ["Guest Users"]
      included_apps   = ["All"]
      grant_controls  = ["mfa", "compliantDevice"]
      require_mfa     = true
    }
  }
}
```

## Best Practices

Always start Conditional Access policies in report-only mode before enabling them in production. This lets you see which sign-ins would be affected without actually blocking anyone. Maintain at least one emergency access account that is excluded from all policies. Use named locations to define trusted networks rather than hard-coding IP addresses. Test policies thoroughly because a misconfigured policy can lock out your entire organization. Layer your policies so they build upon each other rather than trying to handle everything in a single policy.

For securing your Azure infrastructure further, check out our guide on [Azure RBAC with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-rbac-with-terraform/view).

## Conclusion

Azure AD Conditional Access policies managed through Terraform give you a powerful, reproducible way to implement zero-trust security. By defining your access policies as code, you gain version control, peer review, and automated deployment. From basic MFA requirements to sophisticated location-based and device-compliance policies, Terraform makes it straightforward to manage your entire Conditional Access strategy as infrastructure as code.
