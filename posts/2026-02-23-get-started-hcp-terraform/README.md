# How to Get Started with HCP Terraform (Terraform Cloud)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Getting Started, DevOps

Description: A complete beginner's guide to HCP Terraform covering account setup, organization creation, workspace configuration, and running your first remote plan and apply.

---

HCP Terraform (formerly Terraform Cloud) is HashiCorp's managed service for running Terraform. Instead of running `terraform plan` and `terraform apply` on your laptop with state files stored locally or in an S3 bucket, HCP Terraform handles state management, remote execution, access control, and policy enforcement for you.

This guide walks you through setting up HCP Terraform from scratch and running your first remote Terraform workflow.

## What HCP Terraform Provides

Before diving in, here is what you get:

- **Remote state storage** with encryption, locking, and versioning built in
- **Remote execution** so plans and applies run on HashiCorp's infrastructure
- **VCS integration** to trigger runs automatically when you push code
- **Team management** with role-based access control
- **Policy enforcement** using Sentinel or OPA
- **Cost estimation** for AWS, Azure, and GCP resources
- **Private module registry** for sharing modules across your organization

The free tier supports up to 500 managed resources, which is plenty for getting started and small teams.

## Create an Account

Head to [app.terraform.io](https://app.terraform.io) and sign up. You can use an email address or sign in with GitHub, GitLab, or Bitbucket. If you choose a VCS provider, HCP Terraform can integrate with your repositories right away.

After signing up, you land on the main dashboard. The first thing to do is create an organization.

## Create Your Organization

An organization is the top-level container in HCP Terraform. It holds workspaces, teams, policies, and the module registry.

1. Click "New organization" from the dashboard
2. Enter an organization name (this must be globally unique)
3. Provide your email address
4. Click "Create organization"

```
Organization: my-company-infra
Email: devops@mycompany.com
```

For the organization name, use something that identifies your company or team. You will see this name in URLs and API calls.

## Install the Terraform CLI

If you do not already have Terraform installed:

```bash
# macOS with Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify installation
terraform version
```

For other platforms, download the binary from [terraform.io/downloads](https://developer.hashicorp.com/terraform/downloads).

## Authenticate the CLI

Connect your local Terraform CLI to HCP Terraform:

```bash
# Start the login flow
terraform login

# This opens a browser window where you authorize the CLI
# A token is generated and stored locally at ~/.terraform.d/credentials.tfrc.json
```

After authentication, your CLI can interact with HCP Terraform APIs.

## Create Your First Workspace

Workspaces in HCP Terraform are the equivalent of separate working directories with their own state. Create one through the UI or CLI.

Through the UI:
1. Navigate to your organization
2. Click "New workspace"
3. Choose a workflow type:
   - **VCS-driven** - Runs trigger automatically from VCS pushes
   - **CLI-driven** - You trigger runs from your local terminal
   - **API-driven** - External systems trigger runs via API

For getting started, choose **CLI-driven**. Name it something descriptive:

```
Workspace name: dev-infrastructure
Description: Development environment AWS infrastructure
```

## Configure the Cloud Block

In your Terraform configuration, add a `cloud` block to connect to your workspace:

```hcl
# main.tf

terraform {
  cloud {
    organization = "my-company-infra"

    workspaces {
      name = "dev-infrastructure"
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

Initialize the configuration:

```bash
terraform init

# Output:
# Initializing HCP Terraform...
# Initializing provider plugins...
# HCP Terraform has been successfully initialized!
```

## Set Variables

Your workspace needs variables, especially credentials. In the HCP Terraform UI:

1. Go to your workspace
2. Click "Variables"
3. Add environment variables for AWS credentials:

```
Key: AWS_ACCESS_KEY_ID
Value: AKIA...
Category: Environment variable
Sensitive: Yes

Key: AWS_SECRET_ACCESS_KEY
Value: wJalr...
Category: Environment variable
Sensitive: Yes

Key: AWS_DEFAULT_REGION
Value: us-east-1
Category: Environment variable
```

Mark credentials as sensitive so they are write-only and never displayed.

You can also add Terraform variables:

```
Key: aws_region
Value: us-east-1
Category: Terraform variable

Key: environment
Value: dev
Category: Terraform variable
```

## Write a Simple Configuration

Add some resources to test:

```hcl
# variables.tf

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
```

```hcl
# s3.tf

resource "aws_s3_bucket" "example" {
  bucket = "my-company-${var.environment}-example-bucket"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "example" {
  bucket = aws_s3_bucket.example.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

```hcl
# outputs.tf

output "bucket_name" {
  value       = aws_s3_bucket.example.id
  description = "Name of the created S3 bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.example.arn
  description = "ARN of the created S3 bucket"
}
```

## Run Your First Plan

With CLI-driven workflow, trigger a plan from your terminal:

```bash
terraform plan

# Terraform uploads your configuration to HCP Terraform
# The plan runs remotely on HCP Terraform's infrastructure
# Output streams back to your terminal

# Plan: 2 to add, 0 to change, 0 to destroy.
```

The plan runs on HCP Terraform's runners, not on your machine. Your configuration is uploaded, the plan executes, and the output streams back to your terminal.

## Apply the Changes

```bash
terraform apply

# Remote plan runs first
# You see the plan output
# Then you are prompted to confirm:
# Do you want to perform these actions in workspace "dev-infrastructure"?
# Enter "yes" to confirm.

# Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
# Outputs:
#   bucket_arn  = "arn:aws:s3:::my-company-dev-example-bucket"
#   bucket_name = "my-company-dev-example-bucket"
```

## View the Run in the UI

After the apply, go to the HCP Terraform UI and navigate to your workspace. You will see:

- **Runs tab**: Shows the run history with plan and apply logs
- **States tab**: Shows state file versions with the ability to view or download any version
- **Variables tab**: Shows your configured variables
- **Settings tab**: Workspace configuration options

Each run shows the full plan output, who triggered it, when it ran, and whether it succeeded or failed.

## View State

HCP Terraform manages your state file. You can view it through:

```bash
# View current state locally
terraform show

# List resources in state
terraform state list

# View a specific resource
terraform state show aws_s3_bucket.example
```

The state is stored encrypted in HCP Terraform. You never need to manage state files, configure locking, or worry about concurrent access.

## Next Steps

From here, you can:

- **Add team members** to your organization and configure permissions
- **Connect a VCS repository** for automatic plan-on-push workflows
- **Create more workspaces** for different environments or components
- **Set up variable sets** to share common variables across workspaces
- **Enable cost estimation** to see the cost impact of changes before applying
- **Add policy checks** using Sentinel or Open Policy Agent

For more on these topics, check out the guides on [creating workspaces](https://oneuptime.com/blog/post/2026-02-23-create-workspaces-hcp-terraform/view), [connecting VCS repositories](https://oneuptime.com/blog/post/2026-02-23-connect-vcs-repositories-hcp-terraform/view), and [using variables](https://oneuptime.com/blog/post/2026-02-23-variables-hcp-terraform-workspaces/view).

## Wrapping Up

HCP Terraform removes the operational overhead of managing Terraform state, execution environments, and access control. Getting started takes about 15 minutes - create an organization, set up a workspace, configure credentials, and run your first plan. The free tier is generous enough for small teams, and upgrading adds features like policy enforcement and cost estimation as your needs grow.
