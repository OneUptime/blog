# How to Use Speculative Plans in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Speculative Plans, Pull Requests, Code Review, DevOps

Description: Learn how to use speculative plans in HCP Terraform to preview infrastructure changes during pull request reviews before merging code.

---

Speculative plans are one of those features that, once you start using them, you wonder how you ever reviewed Terraform changes without them. A speculative plan runs `terraform plan` against your proposed changes and posts the results directly in your pull request - before any code is merged. Your team can see exactly what infrastructure changes a pull request would cause, making code reviews dramatically more informed.

This guide covers how speculative plans work, how to set them up, and how to get the most value from them in your workflow.

## What Are Speculative Plans?

A speculative plan is a Terraform plan that:

- Runs automatically when you open or update a pull request
- Cannot be applied (it is plan-only, hence "speculative")
- Shows the results as a comment or status check on the pull request
- Uses the current state from the workspace to calculate the diff
- Does not create a new run in the workspace history

Think of it as a dry run that tells you "if this PR were merged right now, here is what would change in your infrastructure."

## Prerequisites

To use speculative plans, you need:

- A VCS-connected workspace in HCP Terraform (GitHub, GitLab, Bitbucket, or Azure DevOps)
- The HCP Terraform application installed on your VCS provider
- A workspace configured with a VCS repository

## Setting Up Speculative Plans

### Step 1: Connect Your VCS Provider

If you have not already:

1. Go to **Settings** > **Providers** in your HCP Terraform organization
2. Add a VCS provider (GitHub, GitLab, etc.)
3. Follow the OAuth setup flow

### Step 2: Create or Update a VCS-Connected Workspace

```hcl
# Create a VCS-connected workspace
resource "tfe_workspace" "app_infra" {
  name           = "app-infrastructure"
  organization   = "your-org"
  execution_mode = "remote"

  vcs_repo {
    identifier     = "your-org/infrastructure-repo"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  # Speculative plans are enabled by default for VCS-connected workspaces
  # But you can explicitly control it
  speculative_enabled = true
}
```

### Step 3: Verify the Setup

Speculative plans are enabled by default when you connect a VCS repository. You can verify:

```bash
# Check if speculative plans are enabled
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}" \
  | jq '.data.attributes["speculative-enabled"]'
```

## How the Workflow Looks

Here is what happens when speculative plans are working:

1. A developer creates a branch and modifies Terraform files
2. They open a pull request against the main branch
3. HCP Terraform detects the PR and starts a speculative plan
4. The plan runs using the current workspace state
5. Results appear as a status check on the pull request
6. Reviewers can click through to see the full plan output in HCP Terraform
7. If the developer pushes more commits, a new speculative plan runs automatically

### Example Pull Request Flow

```bash
# Developer creates a branch
git checkout -b add-redis-cluster

# Makes changes to Terraform configuration
cat >> main.tf << 'EOF'
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "app-redis"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
}
EOF

# Commits and pushes
git add main.tf
git commit -m "Add Redis cluster for session caching"
git push origin add-redis-cluster

# Opens a pull request
gh pr create --title "Add Redis cluster" --body "Adds ElastiCache Redis for session storage"
```

Within seconds, HCP Terraform picks up the PR and starts a speculative plan. The PR gets a status check that shows:

```
HCP Terraform - Plan: 2 to add, 0 to change, 0 to destroy
```

## Reading Speculative Plan Results

The plan output in the PR check shows exactly what Terraform would do:

```
Terraform v1.7.0
Initializing plugins and modules...

Terraform will perform the following actions:

  # aws_elasticache_subnet_group.redis will be created
  + resource "aws_elasticache_subnet_group" "redis" {
      + arn         = (known after apply)
      + description = "Redis subnet group"
      + name        = "app-redis-subnets"
      + subnet_ids  = [
          + "subnet-0a1b2c3d4e5f6g7h8",
          + "subnet-1a2b3c4d5e6f7g8h9",
        ]
    }

  # aws_elasticache_cluster.redis will be created
  + resource "aws_elasticache_cluster" "redis" {
      + arn                = (known after apply)
      + cluster_id         = "app-redis"
      + engine             = "redis"
      + node_type          = "cache.t3.medium"
      + num_cache_nodes    = 1
      + port               = 6379
    }

Plan: 2 to add, 0 to change, 0 to destroy.
```

## Speculative Plans via the CLI

You can also trigger speculative plans from the command line without opening a PR:

```bash
# Run a speculative plan from the CLI
# This is what happens when you run 'terraform plan' with remote execution
terraform plan

# The plan runs remotely but cannot be applied
# It shows "(speculative plan)" in the UI
```

## Speculative Plans via the API

For custom CI/CD integrations, you can create speculative plans via the API:

```bash
# Create a configuration version for a speculative plan
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

# Step 1: Create a speculative configuration version
CONFIG_RESPONSE=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "configuration-versions",
      "attributes": {
        "speculative": true,
        "auto-queue-runs": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/configuration-versions")

# Step 2: Get the upload URL
UPLOAD_URL=$(echo "$CONFIG_RESPONSE" | jq -r '.data.attributes["upload-url"]')
CONFIG_ID=$(echo "$CONFIG_RESPONSE" | jq -r '.data.id')

# Step 3: Package and upload configuration
tar -czf config.tar.gz -C ./terraform .
curl \
  --header "Content-Type: application/octet-stream" \
  --request PUT \
  --data-binary @config.tar.gz \
  "$UPLOAD_URL"

# Step 4: Create the speculative run
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"runs\",
      \"attributes\": {
        \"message\": \"Speculative plan from CI\"
      },
      \"relationships\": {
        \"workspace\": {
          \"data\": {
            \"type\": \"workspaces\",
            \"id\": \"${WORKSPACE_ID}\"
          }
        },
        \"configuration-version\": {
          \"data\": {
            \"type\": \"configuration-versions\",
            \"id\": \"${CONFIG_ID}\"
          }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/runs"
```

## Configuring Speculative Plan Behavior

### Disabling Speculative Plans

If you do not want speculative plans on a workspace:

```hcl
resource "tfe_workspace" "no_spec_plans" {
  name                = "sensitive-workspace"
  organization        = "your-org"
  speculative_enabled = false

  vcs_repo {
    identifier     = "your-org/infra-repo"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }
}
```

### Controlling Which Files Trigger Plans

Use trigger patterns to control when speculative plans run based on which files changed:

```hcl
resource "tfe_workspace" "selective_triggers" {
  name           = "networking"
  organization   = "your-org"

  vcs_repo {
    identifier     = "your-org/monorepo"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  # Only trigger plans when files in this path change
  working_directory  = "infrastructure/networking"
  trigger_prefixes   = ["infrastructure/networking", "modules/vpc"]
}
```

Or use trigger patterns (glob-style):

```hcl
resource "tfe_workspace" "pattern_triggers" {
  name           = "app-infrastructure"
  organization   = "your-org"

  vcs_repo {
    identifier     = "your-org/monorepo"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  trigger_patterns = [
    "infrastructure/app/**/*.tf",
    "modules/shared/**/*.tf"
  ]
}
```

## Best Practices

### Require Speculative Plan Success Before Merging

Configure your VCS provider to require the HCP Terraform status check to pass:

In GitHub:
1. Go to **Settings** > **Branches** > **Branch protection rules**
2. Enable **Require status checks to pass before merging**
3. Search for and select the HCP Terraform check

### Review Plan Output, Not Just Code

Make it a team habit to click through to the full plan output during code reviews. A Terraform change might look harmless in the code but actually trigger a resource replacement.

### Use Sentinel or OPA Policies

Speculative plans also run policy checks, so you can catch policy violations before merging:

```hcl
# Example: A Sentinel policy that fails on speculative plans
# if someone tries to create publicly accessible resources
import "tfplan/v2" as tfplan

# Ensure no S3 buckets have public ACLs
main = rule {
  all tfplan.resource_changes as _, rc {
    rc.type is not "aws_s3_bucket_acl" or
    rc.change.after.acl is not "public-read"
  }
}
```

## Troubleshooting

**Speculative plans not running on PRs**: Verify the VCS connection is active. Check that the workspace's VCS repository settings match the PR's repository. Ensure `speculative_enabled` is true.

**Plans showing stale data**: Speculative plans use the current workspace state. If someone recently applied changes that are not yet in state, the speculative plan may not account for them.

**Status check stuck as "pending"**: This usually means the plan is queued. Check if there are other runs in progress on the workspace - speculative plans wait for active runs to complete.

**Plans failing with credential errors**: Speculative plans use the same workspace variables as regular runs. Make sure all required credentials are set.

## Summary

Speculative plans transform infrastructure code reviews from guesswork into informed decision-making. The setup is minimal - connect your VCS, enable speculative plans (they are on by default), and require the status check in your branch protection rules. Every pull request then automatically shows exactly what infrastructure changes it would produce, which is exactly the information reviewers need to make good decisions.

For more on the run workflow, check out our guides on [configuring auto-apply](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-auto-apply-in-hcp-terraform/view) and [monitoring run status and history](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-run-status-and-history-in-hcp-terraform/view).
