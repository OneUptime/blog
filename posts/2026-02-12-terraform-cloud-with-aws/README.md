# How to Use Terraform Cloud with AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Terraform Cloud, DevOps

Description: Set up Terraform Cloud for managing AWS infrastructure, including workspace configuration, remote execution, VCS integration, policy enforcement, and team collaboration.

---

Running Terraform locally or in your own CI/CD pipeline works, but it comes with operational overhead - managing state storage, handling locking, setting up runners, and dealing with credentials. Terraform Cloud handles all of that for you. It provides remote state management, remote execution, VCS-driven workflows, and policy enforcement in a managed service.

This guide covers setting up Terraform Cloud for AWS infrastructure, from workspace creation to production workflows.

## What Terraform Cloud Provides

Terraform Cloud replaces several things you'd otherwise manage yourself:

- **Remote state storage** - No need for S3 buckets and DynamoDB tables
- **State locking** - Built-in, no configuration needed
- **Remote execution** - Runs Terraform on HashiCorp's infrastructure
- **VCS integration** - Automatic plan on PR, apply on merge
- **Policy enforcement** - Sentinel policies for governance
- **Team management** - Granular access control
- **Cost estimation** - Shows expected cost changes before apply
- **Private registry** - Share modules within your organization

The free tier supports up to 500 resources, which is enough for small to medium setups.

## Setting Up Your Organization

Create a Terraform Cloud account at app.terraform.io and set up your organization.

```bash
# Install the Terraform CLI (if not already installed)
brew install terraform

# Login to Terraform Cloud
terraform login
```

This opens your browser to generate an API token. The token gets saved to `~/.terraform.d/credentials.tfrc.json`.

## Creating a Workspace

Workspaces in Terraform Cloud are like separate environments. Each workspace has its own state, variables, and settings.

### CLI-Driven Workspace

For a CLI-driven workflow (you run commands locally, execution happens remotely).

```hcl
# backend.tf
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      name = "aws-production"
    }
  }

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
```

Initialize and start using it.

```bash
# Initialize the workspace
terraform init

# Plan runs remotely
terraform plan

# Apply runs remotely
terraform apply
```

### VCS-Driven Workspace

For a VCS-driven workflow (automatic plan on PR, apply on merge), configure the workspace in the Terraform Cloud UI or via the API.

```bash
# Create a workspace connected to your VCS repo
# Do this through the Terraform Cloud UI:
# 1. Go to Workspaces > New Workspace
# 2. Choose "Version Control Workflow"
# 3. Connect to GitHub/GitLab
# 4. Select your repository
# 5. Set the working directory (e.g., "environments/production")
```

## Configuring AWS Credentials

Terraform Cloud needs AWS credentials to manage your resources. There are two approaches.

### Environment Variables (Simple)

In the Terraform Cloud workspace settings, add environment variables.

```
AWS_ACCESS_KEY_ID     = AKIAIOSFODNN7EXAMPLE     (sensitive)
AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG... (sensitive)
```

### Dynamic Credentials with OIDC (Recommended)

Terraform Cloud supports OIDC federation with AWS, eliminating static credentials.

Set up the OIDC provider in AWS.

```hcl
# One-time setup in your AWS account
resource "aws_iam_openid_connect_provider" "tfc" {
  url             = "https://app.terraform.io"
  client_id_list  = ["aws.workload.identity"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"]
}

resource "aws_iam_role" "tfc_role" {
  name = "TerraformCloudRole"

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
          "app.terraform.io:sub" = "organization:my-company:project:*:workspace:aws-*:run_phase:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "tfc_admin" {
  role       = aws_iam_role.tfc_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

Then configure the workspace to use dynamic credentials. In workspace settings, add these environment variables:

```
TFC_AWS_PROVIDER_AUTH = true
TFC_AWS_RUN_ROLE_ARN  = arn:aws:iam::123456789012:role/TerraformCloudRole
```

## Workspace Variables

Set Terraform variables in the workspace for environment-specific values.

```
# Terraform Variables (in workspace settings)
aws_region     = us-east-1
environment    = production
instance_type  = t3.medium
instance_count = 4

# Sensitive variables
db_password = ******* (marked as sensitive)
```

These override the `default` values in your variable definitions.

## Multi-Environment Setup

Use workspace tags and naming conventions for multi-environment setups.

```hcl
# backend.tf - using workspace tags
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      tags = ["aws", "networking"]
    }
  }
}
```

Or use the project feature to group related workspaces.

```
my-company (organization)
  aws-infrastructure (project)
    aws-dev-networking (workspace)
    aws-dev-compute (workspace)
    aws-prod-networking (workspace)
    aws-prod-compute (workspace)
```

## Run Triggers

Connect workspaces so changes cascade through your infrastructure layers.

```
Networking Workspace (changes trigger) --> Compute Workspace
                                      --> Database Workspace
```

Configure run triggers in the workspace settings. When the networking workspace applies successfully, it automatically triggers a plan in the compute workspace.

## Sentinel Policies

Sentinel is Terraform Cloud's policy-as-code framework. Use it to enforce organizational standards.

```python
# Ensure all S3 buckets have encryption enabled
import "tfplan/v2" as tfplan

s3_buckets = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_s3_bucket" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

encryption_check = rule {
  all s3_buckets as _, bucket {
    bucket.change.after.server_side_encryption_configuration is not null
  }
}

main = rule {
  encryption_check
}
```

```python
# Prevent resources from being created without required tags
import "tfplan/v2" as tfplan

required_tags = ["Environment", "Team", "ManagedBy"]

tagged_resources = filter tfplan.resource_changes as _, rc {
  rc.change.after.tags is not null
}

tag_check = rule {
  all tagged_resources as _, resource {
    all required_tags as tag {
      resource.change.after.tags contains tag
    }
  }
}

main = rule {
  tag_check
}
```

## Cost Estimation

Terraform Cloud shows estimated cost changes for every plan. When you modify an RDS instance from `db.t3.medium` to `db.r6g.large`, you'll see the estimated monthly cost difference before applying.

This is enabled by default for paid plans and requires no configuration.

## Team Access Control

Set up teams with different permissions.

```
Platform Team:
  - All workspaces: admin

Backend Team:
  - aws-*-compute workspaces: write
  - aws-*-networking workspaces: read

Frontend Team:
  - aws-*-cdn workspaces: write
  - All other workspaces: read
```

Permission levels:
- **Read** - Can view state, plans, and applies
- **Plan** - Can queue plans but not apply
- **Write** - Can queue plans and apply
- **Admin** - Full control including settings

## Private Module Registry

Share modules within your organization through the private registry.

```hcl
# Reference a module from your private registry
module "vpc" {
  source  = "app.terraform.io/my-company/vpc/aws"
  version = "2.1.0"

  name = "production"
  cidr = "10.0.0.0/16"
}
```

Publish modules by connecting a VCS repository that follows the `terraform-<PROVIDER>-<NAME>` naming convention.

## Migrating from S3 Backend

If you're currently using S3 backend, migrate to Terraform Cloud.

```bash
# 1. Update your backend configuration
# Change from:
#   backend "s3" { ... }
# To:
#   cloud { ... }

# 2. Run init to migrate
terraform init

# Terraform will ask:
# Do you want to copy existing state to the new backend?
# Type: yes
```

## CLI Integration Tips

Some useful patterns for CLI-driven workspaces.

```bash
# Target specific resources (runs remotely)
terraform plan -target=module.vpc

# Refresh state without changing anything
terraform apply -refresh-only

# Import an existing resource
terraform import aws_s3_bucket.example my-existing-bucket

# Show current state
terraform state list
terraform state show aws_vpc.main
```

## Wrapping Up

Terraform Cloud removes the operational burden of managing state, locking, and execution environments. For teams, the VCS integration, policy enforcement, and access controls make it significantly easier to collaborate on infrastructure. Start with the free tier, migrate your state from S3, and add policies and team controls as your organization grows.

For self-managed alternatives, check out our guides on [Terraform CI/CD with GitHub Actions](https://oneuptime.com/blog/post/2026-02-12-terraform-cicd-github-actions-for-aws/view) and [Terragrunt for DRY configurations](https://oneuptime.com/blog/post/2026-02-12-terragrunt-for-dry-terraform-aws-configurations/view).
