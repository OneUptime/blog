# How to Migrate from Terraform OSS to HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Migration, Infrastructure as Code

Description: Learn how to migrate from open-source Terraform with local or S3 backends to HCP Terraform for enhanced collaboration, governance, and state management.

---

HCP Terraform (formerly Terraform Cloud) provides managed state storage, remote execution, team management, policy enforcement, and a private module registry. Migrating from self-managed Terraform OSS brings these capabilities without building your own infrastructure. This guide covers the complete migration process from any backend to HCP Terraform.

## Why Migrate to HCP Terraform

HCP Terraform solves common challenges with self-managed Terraform: state file conflicts, lack of audit trails, manual pipeline management, and missing governance controls. It provides secure state storage with encryption, access controls, and automatic versioning. Remote execution ensures consistent environments for plan and apply operations. Sentinel policies enable policy-as-code for compliance requirements.

## Prerequisites

Before starting the migration:

```bash
# Install or update Terraform CLI
terraform version  # Ensure 1.x or later

# Create an HCP Terraform account
# Visit: https://app.terraform.io/signup

# Create an organization
# Visit: https://app.terraform.io/app/organizations/new

# Authenticate
terraform login
# Follow the prompts to generate and save a token
```

## Step 1: Create Workspaces in HCP Terraform

Create workspaces that correspond to your current configurations:

```bash
# Using the Terraform CLI
# Or use the HCP Terraform UI

# Using the tfe provider (optional, for automation)
```

```hcl
# workspace-setup/main.tf
# Use this to create workspaces programmatically
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "workspace-setup"
    }
  }
}

provider "tfe" {
  organization = "my-org"
}

resource "tfe_workspace" "networking" {
  name         = "networking-production"
  organization = "my-org"
  tag_names    = ["networking", "production"]

  vcs_repo {
    identifier     = "my-org/infrastructure"
    branch         = "main"
    oauth_token_id = var.oauth_token_id
  }
}

resource "tfe_workspace" "compute" {
  name         = "compute-production"
  organization = "my-org"
  tag_names    = ["compute", "production"]
}
```

## Step 2: Update Backend Configuration

Replace your existing backend with the HCP Terraform cloud block:

```hcl
# Before: S3 backend
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# After: HCP Terraform
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "networking-production"
    }
  }
}
```

## Step 3: Migrate State

```bash
# Initialize with the new backend
terraform init

# Terraform detects the backend change and offers to migrate
# Do you want to copy existing state to the new backend?
# Enter "yes"

# Verify the migration
terraform plan
# Should show: No changes.
```

## Step 4: Configure Workspace Settings

Set up variables, environment variables, and permissions in HCP Terraform:

```bash
# Set workspace variables using the CLI
# Or configure through the UI

# Using the tfe provider
resource "tfe_variable" "aws_region" {
  key          = "AWS_DEFAULT_REGION"
  value        = "us-east-1"
  category     = "env"
  workspace_id = tfe_workspace.networking.id
}

resource "tfe_variable" "aws_access_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key_id
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.networking.id
}

resource "tfe_variable" "aws_secret_key" {
  key          = "AWS_SECRET_ACCESS_KEY"
  value        = var.aws_secret_access_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.networking.id
}
```

For dynamic credentials (recommended):

```hcl
# Configure dynamic provider credentials
resource "tfe_workspace" "networking" {
  name         = "networking-production"
  organization = "my-org"

  # Enable dynamic credentials
  setting_overwrites {
    execution_mode = "remote"
  }
}

# Set up the trust relationship in AWS
resource "aws_iam_openid_connect_provider" "tfc" {
  url             = "https://app.terraform.io"
  client_id_list  = ["aws.workload.identity"]
  thumbprint_list = [var.tfc_thumbprint]
}

resource "aws_iam_role" "tfc" {
  name = "terraform-cloud-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.tfc.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "app.terraform.io:aud" = "aws.workload.identity"
        }
        StringLike = {
          "app.terraform.io:sub" = "organization:my-org:project:*:workspace:*:run_phase:*"
        }
      }
    }]
  })
}
```

## Step 5: Configure Teams and Permissions

```hcl
# Set up team access
resource "tfe_team" "platform" {
  name         = "platform-team"
  organization = "my-org"
}

resource "tfe_team_access" "platform_networking" {
  access       = "write"
  team_id      = tfe_team.platform.id
  workspace_id = tfe_workspace.networking.id
}

resource "tfe_team" "developers" {
  name         = "developers"
  organization = "my-org"
}

resource "tfe_team_access" "dev_networking" {
  access       = "read"
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.networking.id
}
```

## Step 6: Set Up VCS Integration

Connect your workspaces to version control:

```hcl
resource "tfe_workspace" "networking" {
  name         = "networking-production"
  organization = "my-org"

  vcs_repo {
    identifier     = "my-org/infrastructure"
    branch         = "main"
    oauth_token_id = tfe_oauth_client.github.oauth_token_id
  }

  # Specify the working directory if configs are in subdirectories
  working_directory = "environments/production/networking"

  # Auto-apply settings
  auto_apply = false  # Require manual approval for production
}
```

## Step 7: Migrate CI/CD Workflows

Replace your existing CI/CD pipeline with HCP Terraform's built-in features:

```yaml
# Before: GitHub Actions running Terraform directly
# After: GitHub Actions triggering HCP Terraform runs (optional)

# .github/workflows/terraform.yml
name: Terraform via HCP Terraform
on:
  pull_request:
    paths:
      - 'environments/production/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/tfc-workflows-github/actions/upload-configuration@v1
        with:
          workspace: networking-production
          directory: environments/production/networking
```

Or simply use VCS-driven runs where HCP Terraform detects changes automatically.

## Step 8: Add Policy Enforcement

Set up Sentinel or OPA policies:

```python
# sentinel/require-tags.sentinel
import "tfplan/v2" as tfplan

# Require all instances to have required tags
main = rule {
    all tfplan.resource_changes as _, rc {
        rc.type is "aws_instance" implies
            rc.change.after.tags contains "Environment" and
            rc.change.after.tags contains "Owner"
    }
}
```

## Batch Migration Script

For multiple workspaces:

```bash
#!/bin/bash
# migrate-to-hcp.sh
# Migrate multiple configurations to HCP Terraform

ORG="my-org"
CONFIGS=("networking" "compute" "databases" "monitoring")

for config in "${CONFIGS[@]}"; do
  echo "Migrating: $config"
  cd "environments/production/$config"

  # Update backend configuration
  cat > backend.tf <<EOF
terraform {
  cloud {
    organization = "$ORG"
    workspaces {
      name = "${config}-production"
    }
  }
}
EOF

  # Migrate state
  terraform init -migrate-state -input=false

  # Verify
  terraform plan

  cd - > /dev/null
  echo "Completed: $config"
done
```

## Best Practices

Migrate one workspace at a time. Start with non-production environments. Use dynamic credentials instead of static access keys. Set up VCS integration for automated runs. Configure appropriate team permissions before enabling access. Enable Sentinel policies for governance. Test runs in the new workspace before removing old backend configurations.

## Conclusion

Migrating from Terraform OSS to HCP Terraform enhances your infrastructure management with managed state, remote execution, and governance features. The migration process is well-supported by Terraform's built-in state migration capabilities. By following a systematic approach with one workspace at a time and proper verification, you can transition smoothly to HCP Terraform and benefit from its enterprise features.

For related guides, see [How to Migrate Terraform State Between Backends](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-terraform-state-between-backends/view) and [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view).
