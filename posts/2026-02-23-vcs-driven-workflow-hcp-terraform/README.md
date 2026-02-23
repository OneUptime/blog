# How to Configure VCS-Driven Workflow in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, VCS, GitOps, CI/CD, DevOps

Description: Configure and optimize the VCS-driven workflow in HCP Terraform for automated plan-on-push, PR reviews, and merge-to-apply infrastructure deployment.

---

The VCS-driven workflow is the flagship workflow in HCP Terraform. You push code, it plans. You open a PR, it shows the impact. You merge, it applies. No manual `terraform apply` commands, no CI/CD pipelines to maintain, no state file management. Everything flows from your version control system.

This guide covers how to set up, configure, and optimize the VCS-driven workflow for production use.

## How the VCS-Driven Workflow Operates

The flow follows your standard Git branching model:

1. A developer creates a branch and makes infrastructure changes
2. They open a pull request against the target branch
3. HCP Terraform detects the PR via webhook and runs a **speculative plan**
4. The plan result appears as a status check on the PR
5. The team reviews both the code diff and the plan output
6. After approval and merge, HCP Terraform runs a **full plan**
7. If auto-apply is enabled, it applies immediately; otherwise it waits for confirmation

Speculative plans are read-only. They show what would happen but do not lock state or modify anything. This makes them safe to run on every PR.

## Setting Up the Workflow

### Prerequisites

- A VCS provider connected to your organization (GitHub, GitLab, Bitbucket, or Azure DevOps)
- A repository containing your Terraform configuration

### Create the Workspace

```hcl
resource "tfe_workspace" "production" {
  name         = "production-app"
  organization = "acme-infrastructure"
  description  = "Production application infrastructure"

  # VCS connection
  vcs_repo {
    identifier     = "acme/infrastructure"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  # Working directory for monorepo setups
  working_directory = "environments/production"

  # Do not auto-apply in production - require confirmation
  auto_apply = false

  # Pin Terraform version
  terraform_version = "1.7.0"

  # Queue all runs (do not skip intermediate commits)
  queue_all_runs = false

  # File triggers - only run when relevant files change
  trigger_patterns = [
    "environments/production/**/*",
    "modules/**/*",
  ]
}
```

### Key Settings Explained

**auto_apply**: When `true`, successful plans are applied without manual confirmation. Set this to `true` for dev/staging and `false` for production.

**queue_all_runs**: When `false`, HCP Terraform skips intermediate runs and only processes the latest commit. This prevents a queue buildup when you push multiple commits quickly.

**trigger_patterns**: Specifies which file paths trigger a run. Without this, every commit to the branch triggers a run, even if the changes are in unrelated directories.

## Repository Structure

The VCS-driven workflow works best with a clear repository structure:

```
infrastructure/
  environments/
    production/
      main.tf          # Root module for production
      variables.tf
      outputs.tf
      terraform.auto.tfvars
    staging/
      main.tf
      variables.tf
      outputs.tf
      terraform.auto.tfvars
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
```

Each environment directory is a workspace. The `modules/` directory contains shared modules. Trigger patterns ensure that module changes trigger plans in all environments that use them.

## The Terraform Configuration

Your configuration does not need a `cloud` block for VCS-driven workspaces. HCP Terraform handles the backend automatically. However, you do need to avoid conflicting backend blocks:

```hcl
# main.tf - No backend or cloud block needed for VCS-driven workspaces

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "networking" {
  source = "../../modules/networking"

  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

module "compute" {
  source = "../../modules/compute"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  environment = var.environment
}
```

Variables come from the workspace settings in HCP Terraform or from `terraform.auto.tfvars` files committed to the repo:

```hcl
# terraform.auto.tfvars - Committed to the repo
environment = "production"
vpc_cidr    = "10.0.0.0/16"
aws_region  = "us-east-1"
```

Sensitive variables (like credentials) go in the workspace variable settings, not in files.

## PR Review Workflow

When a developer opens a PR, here is what happens:

### The Speculative Plan

HCP Terraform creates a speculative plan that:
- Reads the current state
- Compares it against the proposed configuration
- Shows what would change
- Does NOT acquire a state lock
- Does NOT modify any infrastructure

The result appears as a GitHub (or GitLab/Bitbucket) status check:

```
HCP Terraform: Plan finished
  + 2 to add
  ~ 1 to change
  - 0 to destroy

Details: https://app.terraform.io/app/acme-infrastructure/workspaces/production-app/runs/run-abc123
```

### Requiring Plan Success

Configure your VCS to require the HCP Terraform status check before merging:

**GitHub**: Go to repository Settings > Branches > Branch protection rules > Require status checks to pass

**GitLab**: Go to repository Settings > Merge requests > Merge checks

This prevents merging code that would cause a plan failure.

## Post-Merge Behavior

After the PR is merged:

1. HCP Terraform detects the merge via webhook
2. It starts a new run (not a speculative plan this time - a real run)
3. The plan phase shows what will change
4. If `auto_apply = true`, it proceeds to apply
5. If `auto_apply = false`, it waits for a team member to confirm in the UI

For production, the recommended flow is:

```
PR opened -> speculative plan -> review -> merge -> full plan -> manual confirm -> apply
```

For staging:

```
PR opened -> speculative plan -> review -> merge -> full plan -> auto apply
```

## Handling Plan Failures

When a speculative plan fails on a PR:

1. The status check shows as failed on the PR
2. The developer clicks the link to see the error in HCP Terraform
3. They fix the issue, push a new commit
4. HCP Terraform runs a new speculative plan automatically
5. The cycle repeats until the plan succeeds

Common failure causes:
- Syntax errors in HCL
- Missing variable definitions
- Provider version conflicts
- Invalid resource configurations
- Policy check failures

## Advanced Configuration

### Assessments (Drift Detection)

Enable health assessments to detect configuration drift between runs:

```hcl
resource "tfe_workspace" "production" {
  name         = "production-app"
  assessments_enabled = true
  # Checks for drift on a schedule
}
```

### Run Triggers

Chain workspaces so that a successful apply in one triggers a run in another:

```hcl
# When networking apply succeeds, trigger a compute plan
resource "tfe_run_trigger" "compute_after_networking" {
  workspace_id  = tfe_workspace.production_compute.id
  sourceable_id = tfe_workspace.production_networking.id
}
```

### Custom Environment Variables

Set environment variables for the execution environment:

```hcl
resource "tfe_variable" "aws_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.production.id
}
```

## Best Practices

1. **Always require speculative plan success** before merging PRs. This catches errors before they hit production.

2. **Never auto-apply in production**. The manual confirmation step is your last line of defense.

3. **Use trigger patterns** in monorepos. Without them, every commit triggers every workspace.

4. **Pin Terraform versions** on workspaces. Avoid surprises from automatic version upgrades.

5. **Keep `terraform.auto.tfvars`** in the repo for non-sensitive values. Put sensitive values in workspace variables.

6. **Use branch protection** to prevent direct pushes to main. All changes should flow through PRs.

7. **Set up notifications** for failed runs so the team knows immediately when something breaks.

## Wrapping Up

The VCS-driven workflow is the most natural way to manage infrastructure with Terraform. It integrates into the Git workflow your team already uses, provides visibility through PR status checks, and automates the plan-apply cycle. Set up the VCS connection, configure trigger patterns for your repository structure, require plan success before merging, and use auto-apply judiciously. The result is an infrastructure deployment process that is as auditable and collaborative as your application deployment process.
