# How to Use Terraform with Infrastructure Orchestration Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Orchestration, DevOps, Infrastructure as Code, Platform Engineering

Description: Learn how to integrate Terraform with infrastructure orchestration platforms like Spacelift, env0, and Scalr to manage complex multi-team infrastructure workflows.

---

Infrastructure orchestration platforms sit on top of Terraform and add capabilities that the CLI alone cannot provide: policy enforcement, drift detection, cost estimation, approval workflows, and multi-workspace coordination. Platforms like Spacelift, env0, Scalr, and Terraform Cloud Enterprise transform Terraform from a single-user tool into an organization-wide infrastructure management system.

In this guide, we will explore how to use Terraform with these orchestration platforms, how to structure your configurations for orchestration, and how to set up workflows that coordinate changes across multiple Terraform workspaces.

## Why Use an Orchestration Platform

Terraform by itself handles individual state files well. But organizations manage hundreds of state files across multiple teams, cloud accounts, and environments. Orchestration platforms solve the coordination problems that arise at this scale.

They provide policy-as-code enforcement to prevent non-compliant resources from being created. They detect drift between your Terraform state and actual infrastructure. They estimate costs before changes are applied. And they coordinate dependencies between workspaces so that changes are applied in the correct order.

## Setting Up Spacelift for Terraform Orchestration

Spacelift is a popular orchestration platform that provides deep Terraform integration.

```hcl
# spacelift/main.tf - Configure Spacelift stacks

terraform {
  required_providers {
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.8"
    }
  }
}

provider "spacelift" {}

# Create a stack for the networking layer
resource "spacelift_stack" "networking" {
  name        = "networking-production"
  description = "Production VPC and networking resources"
  repository  = "company/infrastructure"
  branch      = "main"
  project_root = "terraform/networking"

  terraform_version = "1.7.0"

  # Enable drift detection
  autodeploy = false

  labels = ["production", "networking", "layer-1"]
}

# Create a stack for the compute layer
resource "spacelift_stack" "compute" {
  name        = "compute-production"
  description = "Production compute resources (ECS, EC2)"
  repository  = "company/infrastructure"
  branch      = "main"
  project_root = "terraform/compute"

  terraform_version = "1.7.0"
  autodeploy        = false

  labels = ["production", "compute", "layer-2"]
}

# Define a dependency: compute depends on networking
resource "spacelift_stack_dependency" "compute_needs_networking" {
  stack_id            = spacelift_stack.compute.id
  depends_on_stack_id = spacelift_stack.networking.id
}

# Pass outputs from networking to compute via dependency references
resource "spacelift_stack_dependency_reference" "vpc_id" {
  stack_dependency_id = spacelift_stack_dependency.compute_needs_networking.id
  output_name         = "vpc_id"
  input_name          = "TF_VAR_vpc_id"
}

resource "spacelift_stack_dependency_reference" "subnet_ids" {
  stack_dependency_id = spacelift_stack_dependency.compute_needs_networking.id
  output_name         = "private_subnet_ids"
  input_name          = "TF_VAR_subnet_ids"
}
```

## Implementing Policy Enforcement

Orchestration platforms let you define policies that run before Terraform applies changes.

```hcl
# Spacelift policy: Require tags on all resources
resource "spacelift_policy" "require_tags" {
  name = "require-mandatory-tags"
  type = "PLAN"
  body = <<-EOT
    package spacelift

    # Define required tags
    required_tags := {"Environment", "Team", "ManagedBy", "CostCenter"}

    # Check all resources in the plan
    deny[msg] {
      resource := input.terraform.resource_changes[_]
      resource.change.actions[_] == "create"

      # Get the tags from the resource
      tags := object.get(resource.change.after, "tags", {})

      # Check for missing required tags
      missing := required_tags - {tag | tags[tag]}
      count(missing) > 0

      msg := sprintf("Resource %s is missing required tags: %v", [resource.address, missing])
    }
  EOT

  labels = ["autoattach:production"]
}

# Policy: Restrict instance types in production
resource "spacelift_policy" "restrict_instance_types" {
  name = "restrict-instance-types"
  type = "PLAN"
  body = <<-EOT
    package spacelift

    # Allowed instance types for production
    allowed_types := {
      "t3.medium", "t3.large", "t3.xlarge",
      "m5.large", "m5.xlarge", "m5.2xlarge",
      "r5.large", "r5.xlarge"
    }

    deny[msg] {
      resource := input.terraform.resource_changes[_]
      resource.type == "aws_instance"
      resource.change.actions[_] == "create"

      instance_type := resource.change.after.instance_type
      not allowed_types[instance_type]

      msg := sprintf("Instance type %s is not allowed in production. Use one of: %v",
        [instance_type, allowed_types])
    }
  EOT

  labels = ["autoattach:production"]
}

# Attach policies to stacks
resource "spacelift_policy_attachment" "require_tags_compute" {
  policy_id = spacelift_policy.require_tags.id
  stack_id  = spacelift_stack.compute.id
}
```

## Using env0 for Terraform Orchestration

env0 provides another approach to orchestration with a focus on cost management and self-service.

```hcl
# env0/main.tf - Configure env0 templates and environments

terraform {
  required_providers {
    env0 = {
      source  = "env0/env0"
      version = "~> 0.3"
    }
  }
}

provider "env0" {
  api_key    = var.env0_api_key
  api_secret = var.env0_api_secret
}

# Create a project for the platform team
resource "env0_project" "platform" {
  name        = "Platform Infrastructure"
  description = "Core platform infrastructure managed by the platform team"
}

# Create a template from a Terraform module
resource "env0_template" "web_service" {
  name        = "Web Service"
  description = "Deploy a containerized web service"
  type        = "terraform"

  repository      = "https://github.com/company/infrastructure-modules"
  path            = "modules/web-service"
  revision        = "main"
  terraform_version = "1.7.0"

  project_ids = [env0_project.platform.id]
}

# Define configurable variables for the template
resource "env0_configuration_variable" "service_name" {
  name        = "service_name"
  description = "Name of the service to deploy"
  type        = "terraform"
  template_id = env0_template.web_service.id
  is_required = true
}

resource "env0_configuration_variable" "size" {
  name        = "size"
  description = "Size tier for the service"
  type        = "terraform"
  template_id = env0_template.web_service.id
  value       = "small"
  enum        = ["small", "medium", "large"]
}

# Set up cost estimation and budget alerts
resource "env0_project_budget" "platform" {
  project_id = env0_project.platform.id
  amount     = 50000  # Monthly budget in dollars
  timeframe  = "monthly"
}
```

## Multi-Stack Orchestration Patterns

Real-world infrastructure is organized in layers, and changes in one layer affect others. Orchestration platforms help coordinate these dependencies.

```hcl
# Define a complete infrastructure stack hierarchy

# Layer 1: Shared networking
resource "spacelift_stack" "network" {
  name         = "shared-network"
  project_root = "terraform/layers/network"
  repository   = "company/infrastructure"
  branch       = "main"
  labels       = ["layer-1", "shared"]
}

# Layer 2: Security (depends on network)
resource "spacelift_stack" "security" {
  name         = "security"
  project_root = "terraform/layers/security"
  repository   = "company/infrastructure"
  branch       = "main"
  labels       = ["layer-2", "security"]
}

resource "spacelift_stack_dependency" "security_on_network" {
  stack_id            = spacelift_stack.security.id
  depends_on_stack_id = spacelift_stack.network.id
}

# Layer 3: Data tier (depends on network and security)
resource "spacelift_stack" "data" {
  name         = "data-tier"
  project_root = "terraform/layers/data"
  repository   = "company/infrastructure"
  branch       = "main"
  labels       = ["layer-3", "data"]
}

resource "spacelift_stack_dependency" "data_on_network" {
  stack_id            = spacelift_stack.data.id
  depends_on_stack_id = spacelift_stack.network.id
}

resource "spacelift_stack_dependency" "data_on_security" {
  stack_id            = spacelift_stack.data.id
  depends_on_stack_id = spacelift_stack.security.id
}

# Layer 4: Application (depends on all lower layers)
resource "spacelift_stack" "application" {
  name         = "application"
  project_root = "terraform/layers/application"
  repository   = "company/infrastructure"
  branch       = "main"
  labels       = ["layer-4", "application"]
}

resource "spacelift_stack_dependency" "app_on_data" {
  stack_id            = spacelift_stack.application.id
  depends_on_stack_id = spacelift_stack.data.id
}

resource "spacelift_stack_dependency" "app_on_security" {
  stack_id            = spacelift_stack.application.id
  depends_on_stack_id = spacelift_stack.security.id
}
```

## Drift Detection and Remediation

Orchestration platforms can detect when infrastructure drifts from the Terraform state.

```hcl
# Configure drift detection on Spacelift
resource "spacelift_drift_detection" "compute" {
  stack_id  = spacelift_stack.compute.id
  reconcile = false  # Alert only, do not auto-fix
  schedule  = ["0 */6 * * *"]  # Check every 6 hours
}

# For non-critical resources, enable auto-reconciliation
resource "spacelift_drift_detection" "monitoring" {
  stack_id  = spacelift_stack.monitoring.id
  reconcile = true  # Automatically fix drift
  schedule  = ["0 * * * *"]  # Check every hour
}
```

## Approval Workflows

Set up approval gates for sensitive changes.

```hcl
# Require approval for production changes
resource "spacelift_policy" "require_approval" {
  name = "require-production-approval"
  type = "APPROVAL"
  body = <<-EOT
    package spacelift

    # Require 2 approvals for production stacks
    approve {
      input.run.state == "UNCONFIRMED"
      count(input.reviews.approvals) >= 2
    }

    # Reject if any reviewer rejects
    reject {
      input.run.state == "UNCONFIRMED"
      count(input.reviews.rejections) > 0
    }
  EOT

  labels = ["autoattach:production"]
}
```

## Best Practices

Structure your Terraform code in layers with clear dependencies. Networking goes in one workspace, security in another, and applications in a third. This makes orchestration straightforward because the dependency graph is explicit.

Use policies extensively. Start with tag requirements and resource restrictions, then expand to cost limits and compliance checks as your policy library grows.

Enable drift detection for all production stacks. Knowing when infrastructure drifts from the desired state is critical for maintaining consistency.

Keep orchestration configuration in Terraform itself. Managing your Spacelift stacks, env0 templates, or Scalr workspaces through Terraform creates a self-managing system where the orchestration platform is also defined as code.

For more on Terraform state management at scale, see our guide on [Terraform State Multi-Tenancy](https://oneuptime.com/blog/post/2025-12-18-terraform-state-multi-tenancy/view).

## Conclusion

Infrastructure orchestration platforms extend Terraform with the governance, coordination, and visibility features that organizations need at scale. By managing Terraform through platforms like Spacelift, env0, or Scalr, you gain policy enforcement, drift detection, cost management, and multi-stack coordination. The key is treating the orchestration platform configuration itself as code, defining stacks, policies, and dependencies in Terraform so that your entire infrastructure management system is version-controlled and reproducible.
