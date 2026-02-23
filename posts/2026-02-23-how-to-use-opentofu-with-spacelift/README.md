# How to Use OpenTofu with Spacelift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Spacelift, IaC, Terraform, DevOps, CI/CD

Description: A hands-on guide to integrating OpenTofu with Spacelift for automated infrastructure management, covering stack configuration, policies, drift detection, and best practices.

---

Spacelift is a platform for managing infrastructure-as-code workflows at scale. It supports Terraform, OpenTofu, Pulumi, and CloudFormation, making it a natural fit if you are migrating to OpenTofu or running both tools in parallel. This guide covers everything you need to set up OpenTofu with Spacelift, from initial configuration to advanced policy management.

## Why Spacelift with OpenTofu?

Running OpenTofu locally works fine for small projects, but as your infrastructure grows, you need a better workflow. Spacelift provides:

- Centralized state management
- Plan approval workflows
- Policy-as-code with Open Policy Agent (OPA)
- Drift detection and remediation
- Role-based access control
- Integration with VCS providers (GitHub, GitLab, Bitbucket)

The combination of OpenTofu's open source license and Spacelift's workflow automation gives you a powerful, unrestricted IaC pipeline.

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- A Spacelift account (free tier is available)
- A VCS repository with your OpenTofu configurations
- Cloud provider credentials (AWS, Azure, GCP, etc.)

### Connecting Your VCS Repository

In the Spacelift dashboard, navigate to the VCS integrations page and connect your Git provider:

1. Go to **Settings > Source Code**
2. Select your VCS provider (GitHub, GitLab, or Bitbucket)
3. Follow the OAuth flow to grant Spacelift access to your repositories

## Creating a Stack with OpenTofu

A "stack" in Spacelift is a managed instance of an IaC project. To create one that uses OpenTofu:

1. Click **Create Stack** in the dashboard
2. Select your repository and branch
3. Under the **Backend** section, choose **OpenTofu** as the tool
4. Specify the OpenTofu version you want to use

You can also create stacks programmatically using the Spacelift Terraform provider:

```hcl
# Configure the Spacelift provider
terraform {
  required_providers {
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.0"
    }
  }
}

# Create a stack that uses OpenTofu
resource "spacelift_stack" "infrastructure" {
  name        = "production-infrastructure"
  description = "Production infrastructure managed with OpenTofu"

  # Repository settings
  repository   = "my-org/infrastructure"
  branch       = "main"
  project_root = "environments/production"

  # Use OpenTofu instead of Terraform
  opentofu_version = "1.6.2"

  # Enable auto-deploy on push to main
  autodeploy = true

  # Labels for organization
  labels = ["production", "opentofu", "aws"]
}
```

## Configuring Cloud Credentials

Spacelift needs access to your cloud provider to plan and apply changes. The recommended approach is to use cloud integrations rather than static credentials.

### AWS Integration

```hcl
# Create an AWS integration
resource "spacelift_aws_integration" "production" {
  name = "production-aws"

  # The IAM role that Spacelift will assume
  role_arn                       = "arn:aws:iam::123456789012:role/spacelift-production"
  duration_seconds               = 3600
  generate_credentials_in_worker = false
}

# Attach the integration to your stack
resource "spacelift_aws_integration_attachment" "production" {
  integration_id = spacelift_aws_integration.production.id
  stack_id       = spacelift_stack.infrastructure.id
  read           = true
  write          = true
}
```

### Azure Integration

```hcl
# Create an Azure integration
resource "spacelift_azure_integration" "production" {
  name       = "production-azure"
  tenant_id  = "your-tenant-id"
  default_subscription_id = "your-subscription-id"
}

# Attach to your stack
resource "spacelift_azure_integration_attachment" "production" {
  integration_id = spacelift_azure_integration.production.id
  stack_id       = spacelift_stack.infrastructure.id
  read           = true
  write          = true

  subscription_id = "your-subscription-id"
}
```

## Setting Up Environment Variables

Many OpenTofu configurations require environment variables or input variables. Spacelift provides several ways to manage these:

```hcl
# Set environment variables on the stack
resource "spacelift_environment_variable" "database_password" {
  stack_id   = spacelift_stack.infrastructure.id
  name       = "TF_VAR_database_password"
  value      = var.database_password
  write_only = true  # Sensitive value, not visible in UI
}

# Mount a file (e.g., a backend configuration)
resource "spacelift_mounted_file" "backend_config" {
  stack_id      = spacelift_stack.infrastructure.id
  relative_path = "backend.auto.tfvars"
  content       = base64encode(file("backend-config.tfvars"))
  write_only    = false
}
```

## Implementing Policies

One of Spacelift's strongest features is its policy engine. You can write policies in Rego (the OPA language) to control what can and cannot be deployed.

### Plan Policy

Plan policies evaluate the output of `tofu plan` and can approve, reject, or flag changes:

```rego
# policy/plan.rego
# Prevent deletion of production databases
package spacelift

# Warn on any resource deletions
warn["Resource deletion detected"] {
  some resource
  input.terraform.resource_changes[resource].change.actions[_] == "delete"
}

# Deny deletion of RDS instances in production
deny["Cannot delete production RDS instances"] {
  some resource
  change := input.terraform.resource_changes[resource]
  change.type == "aws_db_instance"
  change.change.actions[_] == "delete"
}
```

### Push Policy

Push policies control which Git pushes trigger runs:

```rego
# policy/push.rego
package spacelift

# Only trigger runs when .tf files change
track {
  input.push.affected_files[_] == glob.match("**/*.tf", [], _)
}

# Ignore changes to documentation
ignore {
  not any_tf_files_changed
}

any_tf_files_changed {
  input.push.affected_files[_] == glob.match("**/*.tf", [], _)
}
```

Attach policies to your stack:

```hcl
resource "spacelift_policy" "plan_policy" {
  name = "prevent-production-deletions"
  body = file("policy/plan.rego")
  type = "PLAN"
}

resource "spacelift_policy_attachment" "plan_policy" {
  policy_id = spacelift_policy.plan_policy.id
  stack_id  = spacelift_stack.infrastructure.id
}
```

## Drift Detection

Spacelift can periodically run plans to detect configuration drift - when the actual infrastructure state differs from what your code defines:

```hcl
resource "spacelift_drift_detection" "infrastructure" {
  stack_id  = spacelift_stack.infrastructure.id

  # Check for drift every 30 minutes
  schedule = ["*/30 * * * *"]

  # Automatically reconcile drift
  reconcile = false  # Set to true to auto-fix drift

  # Ignore specific resources that change frequently
  ignore_state = false
}
```

When drift is detected, Spacelift creates a tracked run that shows the differences. You can configure it to automatically apply corrections or require manual review.

## Stack Dependencies

In larger setups, you often have stacks that depend on outputs from other stacks. Spacelift handles this with stack dependencies:

```hcl
# Networking stack
resource "spacelift_stack" "networking" {
  name             = "networking"
  repository       = "my-org/infrastructure"
  project_root     = "modules/networking"
  opentofu_version = "1.6.2"
}

# Application stack depends on networking
resource "spacelift_stack" "application" {
  name             = "application"
  repository       = "my-org/infrastructure"
  project_root     = "modules/application"
  opentofu_version = "1.6.2"
}

# Define the dependency
resource "spacelift_stack_dependency" "app_on_network" {
  stack_id            = spacelift_stack.application.id
  depends_on_stack_id = spacelift_stack.networking.id
}

# Pass outputs from networking to application
resource "spacelift_stack_dependency_reference" "vpc_id" {
  stack_dependency_id = spacelift_stack_dependency.app_on_network.id
  output_name         = "vpc_id"
  input_name          = "TF_VAR_vpc_id"
}
```

## Working with Private Modules

If your organization uses private OpenTofu modules, configure Spacelift to access them:

```hcl
# Context for private module access
resource "spacelift_context" "module_access" {
  name        = "private-module-access"
  description = "Credentials for accessing private modules"
}

resource "spacelift_environment_variable" "git_token" {
  context_id = spacelift_context.module_access.id
  name       = "GIT_TOKEN"
  value      = var.git_token
  write_only = true
}

# Attach the context to stacks that need module access
resource "spacelift_context_attachment" "module_access" {
  context_id = spacelift_context.module_access.id
  stack_id   = spacelift_stack.infrastructure.id
}
```

## Monitoring and Notifications

Spacelift integrates with Slack, Microsoft Teams, and webhooks for notifications. You can also use [OneUptime](https://oneuptime.com) to monitor the infrastructure that Spacelift deploys, ensuring you catch availability issues and performance degradation before they affect your users.

## Best Practices

1. **Use contexts for shared configuration.** If multiple stacks need the same environment variables or credentials, create a Spacelift context and attach it to those stacks.

2. **Pin your OpenTofu version.** Specify an exact version in your stack configuration to avoid surprises from version updates.

3. **Start with manual approvals.** Before enabling autodeploy, run with manual approval for a few weeks to build confidence in your policies.

4. **Use plan policies extensively.** They are your safety net against accidental changes to production resources.

5. **Review drift detection results regularly.** Drift often indicates manual changes that should be codified or process gaps that need addressing.

## Conclusion

Spacelift and OpenTofu together provide a solid foundation for managing infrastructure at scale. The combination of an open source IaC tool with a purpose-built workflow platform gives you flexibility without vendor lock-in on the core tooling layer. Start with a single stack, build out your policies, and expand as your team gets comfortable with the workflow. For an alternative platform integration, see our guide on [using OpenTofu with env0](https://oneuptime.com/blog/post/2026-02-23-how-to-use-opentofu-with-env0/view).
