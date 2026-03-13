# How to Use Terraform with Octopus Deploy for Releases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Octopus Deploy, Releases, DevOps, Infrastructure as Code, CI/CD, Deployments

Description: Learn how to integrate Terraform with Octopus Deploy to manage infrastructure provisioning as part of your release management and deployment process.

---

Octopus Deploy is a deployment automation tool focused on release management, multi-environment deployments, and operational runbooks. It provides native Terraform support through built-in steps that let you run Terraform plan, apply, and destroy operations as part of your deployment process. This guide covers how to set up Terraform within Octopus Deploy for a complete infrastructure and application release pipeline.

## Why Use Terraform with Octopus Deploy?

Octopus Deploy brings structured release management to Terraform workflows. Instead of running Terraform from the command line or a basic CI pipeline, Octopus provides environment promotion with approval gates, release versioning and auditing, variable management across environments, runbooks for operational tasks like Terraform destroy, tenant-based deployments for multi-customer infrastructure, and built-in Terraform steps that handle state management.

## Prerequisites

You need Octopus Deploy installed (self-hosted or cloud), Terraform configurations packaged or accessible from a Git repository, cloud provider credentials, and Octopus Deploy workers with Terraform installed.

## Step 1: Configure Terraform in Octopus Deploy

First, set up the necessary accounts and variable sets.

```hcl
# octopus-setup.tf
# Manage Octopus Deploy configuration with Terraform
terraform {
  required_providers {
    octopusdeploy = {
      source  = "OctopusDeployLabs/octopusdeploy"
      version = "~> 0.21"
    }
  }
}

provider "octopusdeploy" {
  address = var.octopus_url
  api_key = var.octopus_api_key
  space_id = var.octopus_space_id
}

# Create an AWS account in Octopus Deploy
resource "octopusdeploy_aws_account" "terraform" {
  name            = "Terraform AWS Account"
  access_key      = var.aws_access_key
  secret_key      = var.aws_secret_key
  description     = "AWS account for Terraform operations"
  tenanted_deployment_participation = "Untenanted"
}

# Create environments
resource "octopusdeploy_environment" "staging" {
  name        = "Staging"
  description = "Staging environment for infrastructure and applications"
}

resource "octopusdeploy_environment" "production" {
  name        = "Production"
  description = "Production environment"
}
```

## Step 2: Create a Terraform Project in Octopus

Set up a project with the deployment lifecycle.

```hcl
# octopus-project.tf
# Create a lifecycle for Terraform deployments
resource "octopusdeploy_lifecycle" "infrastructure" {
  name        = "Infrastructure Lifecycle"
  description = "Lifecycle for Terraform infrastructure deployments"

  phase {
    name                         = "Staging"
    minimum_environments_before_promotion = 1
    optional_deployment_targets   = [octopusdeploy_environment.staging.id]
  }

  phase {
    name                         = "Production"
    minimum_environments_before_promotion = 0
    optional_deployment_targets   = [octopusdeploy_environment.production.id]
  }
}

# Create the Terraform project
resource "octopusdeploy_project" "infrastructure" {
  name             = "Infrastructure - Terraform"
  lifecycle_id     = octopusdeploy_lifecycle.infrastructure.id
  project_group_id = octopusdeploy_project_group.platform.id
  description      = "Terraform infrastructure provisioning project"

  connectivity_policy {
    skip_machine_behavior = "None"
  }
}

# Create a project group for platform resources
resource "octopusdeploy_project_group" "platform" {
  name        = "Platform Infrastructure"
  description = "Projects related to infrastructure management"
}
```

## Step 3: Define Terraform Variables in Octopus

Manage Terraform variables through Octopus Deploy's variable system.

```hcl
# octopus-variables.tf
# Define project variables for Terraform
resource "octopusdeploy_variable" "aws_region" {
  owner_id = octopusdeploy_project.infrastructure.id
  name     = "TerraformVars.aws_region"
  type     = "String"

  # Different values per environment
  value = "us-east-1"
  scope {
    environments = [octopusdeploy_environment.staging.id]
  }
}

resource "octopusdeploy_variable" "aws_region_prod" {
  owner_id = octopusdeploy_project.infrastructure.id
  name     = "TerraformVars.aws_region"
  type     = "String"
  value    = "us-east-1"
  scope {
    environments = [octopusdeploy_environment.production.id]
  }
}

resource "octopusdeploy_variable" "instance_type" {
  owner_id = octopusdeploy_project.infrastructure.id
  name     = "TerraformVars.instance_type"
  type     = "String"
  value    = "t3.medium"
  scope {
    environments = [octopusdeploy_environment.staging.id]
  }
}

resource "octopusdeploy_variable" "instance_type_prod" {
  owner_id = octopusdeploy_project.infrastructure.id
  name     = "TerraformVars.instance_type"
  type     = "String"
  value    = "t3.large"
  scope {
    environments = [octopusdeploy_environment.production.id]
  }
}
```

## Step 4: Create the Deployment Process

Define the deployment process with Terraform steps.

```hcl
# octopus-deployment-process.tf
# Define the deployment process with Terraform steps
resource "octopusdeploy_deployment_process" "infrastructure" {
  project_id = octopusdeploy_project.infrastructure.id

  # Step 1: Terraform Plan
  step {
    name               = "Terraform Plan"
    condition          = "Success"
    start_trigger      = "StartAfterPrevious"
    target_roles       = ["terraform-worker"]

    apply_terraform_template_action {
      name                       = "Plan Infrastructure"
      template_directory         = "terraform"
      managed_account            = octopusdeploy_aws_account.terraform.id
      terraform_additional_init_params = "-backend-config=key=#{Octopus.Environment.Name}/terraform.tfstate"

      # Use inline Terraform or reference packaged files
      template = {
        additional_variable_files = "environments/#{Octopus.Environment.Name | ToLower}.tfvars"
      }

      # Run plan only, do not apply
      plan_only = true
    }
  }

  # Step 2: Manual Intervention for Production
  step {
    name               = "Approve Changes"
    condition          = "Success"
    start_trigger      = "StartAfterPrevious"

    manual_intervention_action {
      name                 = "Review Terraform Plan"
      instructions         = "Review the Terraform plan output and approve the changes."
      responsible_team_ids = [var.platform_team_id]

      environments = [octopusdeploy_environment.production.id]
    }
  }

  # Step 3: Terraform Apply
  step {
    name               = "Terraform Apply"
    condition          = "Success"
    start_trigger      = "StartAfterPrevious"
    target_roles       = ["terraform-worker"]

    apply_terraform_template_action {
      name                       = "Apply Infrastructure"
      template_directory         = "terraform"
      managed_account            = octopusdeploy_aws_account.terraform.id
      terraform_additional_init_params = "-backend-config=key=#{Octopus.Environment.Name}/terraform.tfstate"

      template = {
        additional_variable_files = "environments/#{Octopus.Environment.Name | ToLower}.tfvars"
      }
    }
  }
}
```

## Step 5: Create Runbooks for Terraform Operations

Runbooks in Octopus Deploy handle operational tasks like destroying infrastructure.

```hcl
# octopus-runbooks.tf
# Create a runbook for Terraform destroy operations
resource "octopusdeploy_runbook" "terraform_destroy" {
  project_id  = octopusdeploy_project.infrastructure.id
  name        = "Destroy Infrastructure"
  description = "Destroy Terraform-managed infrastructure in a specific environment"

  retention_policy {
    quantity_to_keep = 10
  }
}

# Create a runbook for Terraform state management
resource "octopusdeploy_runbook" "terraform_state" {
  project_id  = octopusdeploy_project.infrastructure.id
  name        = "Terraform State Operations"
  description = "Import, remove, or move resources in Terraform state"

  retention_policy {
    quantity_to_keep = 20
  }
}

# Create a runbook for drift detection
resource "octopusdeploy_runbook" "drift_detection" {
  project_id  = octopusdeploy_project.infrastructure.id
  name        = "Infrastructure Drift Detection"
  description = "Run Terraform plan to detect configuration drift"

  retention_policy {
    quantity_to_keep = 30
  }
}
```

## Step 6: Terraform Configurations for Octopus Workers

The Terraform configurations used within Octopus should follow this structure.

```hcl
# terraform/main.tf
# Infrastructure managed through Octopus Deploy
terraform {
  required_version = ">= 1.0"

  # State is managed by Octopus Deploy's Terraform steps
  backend "s3" {
    bucket         = "my-terraform-state"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
    # Key is set by Octopus Deploy per environment
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
  # Credentials are provided by Octopus Deploy's AWS account
}

# Variables that Octopus Deploy will set
variable "aws_region" {
  type = string
}

variable "environment" {
  type = string
}

variable "instance_type" {
  type = string
}

# Resources
module "vpc" {
  source = "./modules/vpc"
  environment = var.environment
}

module "compute" {
  source        = "./modules/compute"
  instance_type = var.instance_type
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
}

# Outputs available in Octopus Deploy
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_endpoint" {
  value = module.compute.cluster_endpoint
}
```

## Using Terraform Outputs in Application Deployments

Octopus Deploy can capture Terraform outputs and use them in subsequent deployment steps.

```hcl
# terraform/outputs.tf
# These outputs will be available as Octopus variables
output "load_balancer_dns" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the load balancer"
}

output "database_endpoint" {
  value       = aws_rds_cluster.main.endpoint
  description = "Database cluster endpoint"
  sensitive   = true
}

output "cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster name"
}
```

In Octopus Deploy, these outputs become available as output variables that subsequent steps can reference using the `#{Octopus.Action[Apply Infrastructure].Output.TerraformValueOutputs[load_balancer_dns]}` syntax.

## Best Practices

Use Octopus Deploy's environment scoping for Terraform variables so each environment gets appropriate values. Create separate runbooks for destructive operations like Terraform destroy. Use manual intervention steps for production Terraform applies. Leverage Octopus Deploy's release versioning to track which Terraform configurations were applied to each environment. Store Terraform state remotely with the state key scoped per environment. Use Octopus Deploy workers with pre-installed Terraform to speed up deployments. Capture Terraform outputs as Octopus variables for use in application deployment steps.

## Conclusion

Terraform and Octopus Deploy together provide structured release management for infrastructure changes. Octopus Deploy adds approval workflows, environment promotion, variable management, and runbooks to Terraform's infrastructure provisioning capabilities. This combination is particularly valuable for organizations that need strong governance and audit trails around infrastructure changes, making it easier to manage complex multi-environment deployments with confidence.
