# How to Connect VCS Repositories to HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, VCS, GitHub, GitLab, Version Control

Description: Learn how to connect GitHub, GitLab, Bitbucket, and Azure DevOps repositories to HCP Terraform for automated plan-on-push workflows and PR integration.

---

Connecting a version control system to HCP Terraform is what turns infrastructure code into a collaborative workflow. Once connected, pushing code to a branch triggers a plan. Opening a pull request shows the plan output as a comment. Merging to main applies the changes. This is the VCS-driven workflow, and it starts with connecting your VCS provider.

This guide covers connecting GitHub, GitLab, Bitbucket, and Azure DevOps to HCP Terraform.

## How VCS Integration Works

When you link a workspace to a repository:

1. HCP Terraform registers a webhook on the repository
2. Pushing to the configured branch triggers a speculative plan
3. Opening a PR triggers a plan and posts the results as a status check
4. Merging to the default branch triggers a full plan and (optionally) auto-apply
5. HCP Terraform only runs when files in the workspace's working directory change

The entire flow is automatic. Your team reviews infrastructure changes through the same PR process they use for application code.

## Step 1: Add a VCS Provider

Before connecting repositories, register a VCS provider with your organization.

### GitHub.com

1. Navigate to **Settings** > **VCS Providers** > **Add a VCS Provider**
2. Select **GitHub.com**
3. Follow the OAuth flow:
   - HCP Terraform asks you to create (or select) a GitHub App installation
   - Authorize the app for the GitHub organization that contains your repos
   - Choose which repositories to grant access to (all or selected)

No manual OAuth application setup is needed when using the GitHub App integration. This is the recommended approach.

### GitHub Enterprise

For self-hosted GitHub Enterprise:

1. Select **GitHub Enterprise** as the provider type
2. Enter your GitHub Enterprise URL: `https://github.mycompany.com`
3. Register an OAuth application in GitHub Enterprise:
   - Homepage URL: `https://app.terraform.io`
   - Callback URL: `https://app.terraform.io/auth/YOUR_CALLBACK_ID/callback`
4. Enter the Client ID and Client Secret from the OAuth app
5. Provide an optional personal access token for API access

### GitLab.com

1. Select **GitLab.com** as the provider type
2. In GitLab, create an application:
   - Navigate to **User Settings** > **Applications**
   - Name: `HCP Terraform`
   - Redirect URI: Provided by HCP Terraform during setup
   - Scopes: `api`
3. Enter the Application ID and Secret in HCP Terraform

### GitLab Self-Managed

1. Select **GitLab Community/Enterprise Edition**
2. Enter your GitLab URL: `https://gitlab.mycompany.com`
3. Follow the same application creation steps as GitLab.com

### Bitbucket Cloud

1. Select **Bitbucket Cloud**
2. In Bitbucket, create an OAuth consumer:
   - Navigate to your workspace settings > **OAuth consumers**
   - Callback URL: Provided by HCP Terraform
   - Permissions: `Repositories: Read`, `Pull Requests: Read`, `Webhooks: Read and Write`
3. Enter the Key and Secret in HCP Terraform

### Azure DevOps

1. Select **Azure DevOps Server** or **Azure DevOps Services**
2. Register an OAuth app in Azure DevOps or provide a personal access token
3. Configure the connection details

## Step 2: Link a Workspace to a Repository

Once the VCS provider is connected, link it to a workspace.

### Through the UI

1. Go to your workspace
2. Click **Settings** > **Version Control**
3. Click **Connect to version control**
4. Select your VCS provider
5. Choose the repository
6. Configure options:

```text
Repository: myorg/infrastructure
Branch: main
Terraform Working Directory: environments/production/networking
VCS Triggers:
  - Always trigger runs (default)
  - Only trigger when files in specified paths change
  - Tag-based triggers
```

### Through the tfe Provider

```hcl
# First, get the OAuth token ID from your VCS provider connection
data "tfe_oauth_client" "github" {
  organization     = var.organization
  service_provider = "github"
}

resource "tfe_workspace" "production" {
  name         = "production-networking"
  organization = var.organization

  vcs_repo {
    identifier     = "myorg/infrastructure"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  working_directory = "environments/production/networking"
}
```

### Through the API

```bash
# Link a workspace to a VCS repository
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "vcs-repo": {
          "identifier": "myorg/infrastructure",
          "branch": "main",
          "oauth-token-id": "ot-abc123"
        },
        "working-directory": "environments/production/networking"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/workspaces/production-networking"
```

## Configuring Working Directories for Monorepos

In a monorepo, multiple workspaces share one repository. Each workspace watches a different directory:

```text
infrastructure/
  environments/
    production/
      networking/     # -> production-networking workspace
      compute/        # -> production-compute workspace
      database/       # -> production-database workspace
    staging/
      networking/     # -> staging-networking workspace
      compute/        # -> staging-compute workspace
  modules/
    vpc/
    ecs-cluster/
    rds/
```

```hcl
resource "tfe_workspace" "prod_networking" {
  name              = "production-networking"
  working_directory = "environments/production/networking"

  vcs_repo {
    identifier     = "myorg/infrastructure"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}

resource "tfe_workspace" "prod_compute" {
  name              = "production-compute"
  working_directory = "environments/production/compute"

  vcs_repo {
    identifier     = "myorg/infrastructure"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}
```

Changes to `environments/production/networking/` only trigger the networking workspace. Changes to shared modules trigger all workspaces that use them - configure this with trigger patterns.

## Trigger Patterns

By default, a workspace runs whenever any file in the repository changes. For monorepos, narrow this down:

```hcl
resource "tfe_workspace" "prod_networking" {
  name = "production-networking"

  # Only trigger when these paths change
  trigger_patterns = [
    "environments/production/networking/**/*",
    "modules/vpc/**/*",
    "modules/transit-gateway/**/*",
  ]

  vcs_repo {
    identifier     = "myorg/infrastructure"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}
```

This way, a change to the compute module does not trigger a networking plan.

## Pull Request Integration

When VCS is connected, PRs get automatic plan feedback:

1. Developer opens a PR that modifies `environments/production/networking/main.tf`
2. HCP Terraform detects the change via webhook
3. A speculative plan runs (read-only, does not modify state)
4. The plan result appears as a status check on the PR
5. Reviewers see whether the change adds, modifies, or destroys resources
6. After merging, a real plan runs, followed by apply (if auto-apply is on)

The status check includes a link to the full plan output in HCP Terraform.

## Branch-Based Workflows

You can configure which branch triggers runs:

```hcl
resource "tfe_workspace" "production" {
  name = "production-app"

  vcs_repo {
    identifier     = "myorg/infrastructure"
    branch         = "main"    # Only runs trigger from main
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}

resource "tfe_workspace" "staging" {
  name = "staging-app"

  vcs_repo {
    identifier     = "myorg/infrastructure"
    branch         = "staging"  # Runs trigger from staging branch
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}
```

PRs targeting `main` show plans for the production workspace. PRs targeting `staging` show plans for the staging workspace.

## Handling Multiple VCS Providers

If your organization uses multiple VCS systems, you can connect them all:

```hcl
# GitHub for application infrastructure
data "tfe_oauth_client" "github" {
  organization     = var.organization
  service_provider = "github"
}

# GitLab for platform infrastructure
data "tfe_oauth_client" "gitlab" {
  organization     = var.organization
  service_provider = "gitlab_hosted"
}

resource "tfe_workspace" "app_infra" {
  name = "app-infrastructure"

  vcs_repo {
    identifier     = "myorg/app-infra"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}

resource "tfe_workspace" "platform_infra" {
  name = "platform-infrastructure"

  vcs_repo {
    identifier     = "myorg/platform-infra"
    oauth_token_id = data.tfe_oauth_client.gitlab.oauth_token_id
  }
}
```

## Troubleshooting Common Issues

**Webhook not firing**: Check that the webhook was created in your repository settings. HCP Terraform creates it automatically, but permissions issues can prevent it. Verify the VCS provider connection is still active.

**Plans triggering for wrong workspaces**: Check the working directory and trigger patterns. Without proper configuration, any file change triggers all workspaces connected to the repository.

**Permission errors**: Ensure the VCS app or OAuth token has sufficient permissions. For GitHub, it needs read access to the repository content and write access for status checks.

**Branch not matching**: If you configured a specific branch but runs are not triggering, verify the branch name matches exactly, including case.

## Wrapping Up

Connecting VCS repositories to HCP Terraform enables the full GitOps workflow for infrastructure. Configure the VCS provider once at the organization level, then link it to as many workspaces as you need. Use working directories and trigger patterns for monorepos, and leverage PR integration for collaborative reviews. The combination of VCS-driven runs and PR status checks makes infrastructure changes as reviewable and traceable as application code changes.
