# How to Create an Organization in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Organization, DevOps

Description: Step-by-step guide to creating and configuring an organization in HCP Terraform, including team setup, authentication settings, and organization-level policies.

---

An organization in HCP Terraform is the top-level container for everything. It holds your workspaces, teams, variable sets, policies, the private module registry, and billing configuration. Getting the organization set up correctly from the start saves you from painful restructuring later.

This guide covers creating an organization, configuring its settings, setting up teams, and establishing the foundation for your Terraform workflow.

## Creating the Organization

If you already have an HCP Terraform account, creating an organization takes a few clicks:

1. Log in to [app.terraform.io](https://app.terraform.io)
2. Click on the organization dropdown in the top left
3. Select "Create new organization"
4. Fill in the details:

```
Organization Name: acme-infrastructure
Email Address: infra-team@acme.com
```

The organization name must be globally unique across all of HCP Terraform. It appears in URLs, API calls, and the `cloud` block in your Terraform configurations:

```hcl
terraform {
  cloud {
    organization = "acme-infrastructure"

    workspaces {
      name = "production-aws"
    }
  }
}
```

Pick a name that is descriptive and unlikely to conflict. Company name plus a qualifier (like `acme-infrastructure` or `acme-devops`) works well.

## You Can Also Use the API

If you prefer automation, create organizations through the API:

```bash
# Create an organization via the HCP Terraform API
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "organizations",
      "attributes": {
        "name": "acme-infrastructure",
        "email": "infra-team@acme.com"
      }
    }
  }' \
  https://app.terraform.io/api/v2/organizations
```

Or use the `tfe` Terraform provider to manage HCP Terraform resources with Terraform itself:

```hcl
# Managing HCP Terraform with Terraform
provider "tfe" {
  # Token from TFE_TOKEN environment variable
}

resource "tfe_organization" "main" {
  name  = "acme-infrastructure"
  email = "infra-team@acme.com"
}
```

## Organization Settings

After creation, configure the essential settings. Navigate to your organization's Settings page.

### General Settings

```
Organization Name: acme-infrastructure (cannot change after creation)
Email: infra-team@acme.com
Session Timeout: 20160 (minutes - default is 14 days)
Session Expiration: 20160 (minutes)
```

The session timeout controls how long users stay logged in. For security-conscious teams, reduce this to a shorter period.

### Authentication Settings

Configure how users authenticate:

**Two-Factor Authentication**: Enable the organization-wide 2FA requirement. This forces all members to set up 2FA before they can access workspaces.

```
Settings > Security > Two-Factor Authentication
Require two-factor authentication for all members: Enabled
```

**SSO (Single Sign-On)**: Available on the Business tier, SSO lets your team authenticate through your identity provider (Okta, Azure AD, OneLogin):

```
Settings > SSO
SSO Provider: SAML
Single Sign-On URL: https://your-idp.com/sso/saml
```

### API Tokens

HCP Terraform uses three types of tokens:

1. **User tokens** - Tied to an individual user's permissions
2. **Team tokens** - Tied to a team's permissions
3. **Organization tokens** - Full access to the organization (use sparingly)

Create an organization token for CI/CD:

```
Settings > API Tokens > Create an organization token
Description: CI/CD Pipeline Token
```

Store this token securely. It grants full access to the organization.

## Setting Up Teams

Teams control who can do what in your organization. Create teams based on your organizational structure:

```
Settings > Teams > Create team
```

A practical team structure:

```hcl
# If managing with the tfe provider

# Owners team (automatically created)
# Full access to everything

# Platform team - manages shared infrastructure
resource "tfe_team" "platform" {
  name         = "platform"
  organization = tfe_organization.main.name

  organization_access {
    manage_workspaces = true
    manage_modules    = true
    manage_providers  = true
    manage_policies   = false  # Leave to security team
  }
}

# Application teams - deploy their own services
resource "tfe_team" "app_team_alpha" {
  name         = "app-team-alpha"
  organization = tfe_organization.main.name

  organization_access {
    manage_workspaces = false
    manage_modules    = false
  }
}

# Security team - manages policies
resource "tfe_team" "security" {
  name         = "security"
  organization = tfe_organization.main.name

  organization_access {
    manage_policies = true
  }
}

# Read-only team - auditors and stakeholders
resource "tfe_team" "readonly" {
  name         = "readonly"
  organization = tfe_organization.main.name
}
```

### Team Permissions on Workspaces

After creating teams, assign workspace-level permissions:

```hcl
# Platform team gets admin access to infrastructure workspaces
resource "tfe_team_access" "platform_infra" {
  team_id      = tfe_team.platform.id
  workspace_id = tfe_workspace.infrastructure.id
  access       = "admin"
}

# App team gets write access to their workspaces
resource "tfe_team_access" "alpha_app" {
  team_id      = tfe_team.app_team_alpha.id
  workspace_id = tfe_workspace.alpha_app.id
  access       = "write"
}

# Readonly team gets read access everywhere
resource "tfe_team_access" "readonly_infra" {
  team_id      = tfe_team.readonly.id
  workspace_id = tfe_workspace.infrastructure.id
  access       = "read"
}
```

Access levels:
- **read** - View workspace, state, and run history
- **plan** - Queue plans but cannot apply
- **write** - Queue plans and apply
- **admin** - Full control including settings and variable management
- **custom** - Fine-grained permission selection

## Projects for Workspace Organization

Projects group related workspaces within an organization. They provide an organizational layer between the organization and individual workspaces:

```hcl
resource "tfe_project" "production" {
  name         = "Production Infrastructure"
  organization = tfe_organization.main.name
}

resource "tfe_project" "staging" {
  name         = "Staging Infrastructure"
  organization = tfe_organization.main.name
}

resource "tfe_project" "shared_services" {
  name         = "Shared Services"
  organization = tfe_organization.main.name
}
```

When you create workspaces, assign them to a project:

```hcl
resource "tfe_workspace" "prod_vpc" {
  name         = "production-vpc"
  organization = tfe_organization.main.name
  project_id   = tfe_project.production.id
}
```

## VCS Provider Configuration

Connect your version control system so workspaces can be linked to repositories:

```
Settings > VCS Providers > Add VCS Provider
```

For GitHub:
1. Choose "GitHub.com" or "GitHub Enterprise"
2. Register a new OAuth application in GitHub
3. Enter the Application ID and Client Secret
4. Authorize the connection

For GitLab:
1. Choose "GitLab.com" or "GitLab Community/Enterprise"
2. Create an application in GitLab
3. Enter the Application ID and Secret

Once connected, any workspace can link to a repository in that VCS provider.

## Cost Management

If you are on a paid tier, configure cost estimation:

```
Settings > Cost Estimation
Enable Cost Estimation: Yes
```

This shows estimated monthly costs in every plan output, helping teams understand the financial impact of infrastructure changes before they apply.

## Naming Conventions

Establish naming conventions early. Once you have dozens of workspaces, consistent naming is critical:

```
# Workspace naming pattern
{project}-{environment}-{component}

# Examples
platform-prod-vpc
platform-prod-eks
app-alpha-prod-service
app-alpha-staging-service
shared-prod-dns
shared-prod-monitoring
```

Document the convention in your organization's README or wiki so everyone follows it.

## Wrapping Up

Setting up an HCP Terraform organization is the foundation for everything else. Get the team structure right, configure authentication and security settings, establish naming conventions, and connect your VCS provider. These decisions are harder to change later, so spending an hour getting them right upfront is worth it. Once the organization is configured, creating workspaces and connecting repositories becomes straightforward. For next steps, check out [creating workspaces](https://oneuptime.com/blog/post/2026-02-23-create-workspaces-hcp-terraform/view) and [connecting VCS repositories](https://oneuptime.com/blog/post/2026-02-23-connect-vcs-repositories-hcp-terraform/view).
