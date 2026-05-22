# How to Use OpenTofu with env0

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, env0, IaC, Terraform, DevOps, CI/CD

Description: Learn how to integrate OpenTofu with env0 for scalable infrastructure automation, including environment management, cost estimation, policy enforcement, and team collaboration workflows.

---

env0 is an infrastructure management platform that helps teams automate and govern their IaC workflows. It supports OpenTofu natively, making it a strong option for organizations that want automated plan-and-apply pipelines with cost estimation, policy enforcement, and self-service environments. This guide covers how to set up and use OpenTofu with env0 effectively.

## Why env0?

env0 positions itself as a "remote backend" for infrastructure management with some distinct features:

- Self-service environment provisioning for developers
- Automatic cost estimation before applying changes
- TTL (time-to-live) for environments to control cloud spend
- Custom workflow steps and approval processes
- RBAC and policy enforcement
- Support for OpenTofu, Terraform, Pulumi, and other IaC tools

If your team needs to give developers the ability to spin up and tear down environments without direct access to cloud accounts, env0 handles that workflow well.

## Setting Up env0 with OpenTofu

### Connecting Your Repository

Start by connecting your VCS provider to env0:

1. Log into your env0 dashboard
2. Navigate to **Organization Settings > VCS Integrations**
3. Connect your GitHub, GitLab, Bitbucket, or Azure DevOps account
4. Authorize env0 to access the repositories that contain your OpenTofu configurations

### Creating a Project

Projects in env0 organize related environments. Create one for your infrastructure:

1. Go to **Projects** and click **Create Project**
2. Name it something descriptive like "Production Infrastructure"
3. Set the default VCS repository
4. Configure project-level settings (budget alerts, policies, etc.)

### Configuring an Environment Template

Templates define the blueprint for an environment. This is where you specify that OpenTofu should be used:

```bash
# Optional: pin the OpenTofu version from the template working directory
# .opentofu-version
1.12.0

# Or override the template version with an env0 environment variable
ENV0_OPENTOFU_VERSION=1.12.0
```

Alternatively, configure the template through the env0 UI:

1. Go to **Templates** and click **Create Template**
2. Select your repository and branch
3. Under **IaC Tool**, select **OpenTofu**
4. Choose the OpenTofu version, or select the option to resolve it from your code
5. Set the working directory if your configs are in a subdirectory
6. Save the template

## Managing Cloud Credentials

env0 needs credentials to interact with your cloud provider. The platform supports several credential types:

### AWS Credentials

```bash
# Option 1: Use IAM role assumption (recommended)
# In env0, create a cloud credentials set with:
# - AWS Access Key ID
# - AWS Secret Access Key
# Or use OIDC-based role assumption (no static keys)

# Option 2: Set environment variables in the template
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_DEFAULT_REGION
```

For AWS, the recommended approach is to configure OIDC federation so env0 assumes an IAM role without storing static credentials:

```hcl
# IAM role for env0 to assume
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "env0" {
  name = "env0-infrastructure-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/login.app.env0.com/"
        }
        Action = [
          "sts:AssumeRoleWithWebIdentity",
          "sts:TagSession"
        ]
        Condition = {
          StringEquals = {
            "login.app.env0.com/:aud" = "hoMiq9PdkRh9LUvVpH4wIErWg50VSG1b"
            "login.app.env0.com/:sub" = "your-env0-organization-sub"
          }
        }
      }
    ]
  })
}

# Attach necessary policies
resource "aws_iam_role_policy_attachment" "env0_admin" {
  role       = aws_iam_role.env0.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}
```

### Azure Credentials

```bash
# Set these as credential variables in env0:
# ARM_CLIENT_ID
# ARM_CLIENT_SECRET
# ARM_TENANT_ID
# ARM_SUBSCRIPTION_ID
```

### GCP Credentials

```bash
# Add a Google Cloud Service Account credential in env0 and paste the service account key JSON
# Or set GOOGLE_CREDENTIALS to the raw service account key JSON if you manage provider credentials manually
# Or use Workload Identity Federation for keyless auth
```

## Environment Variables and Secrets

env0 provides multiple scopes for managing variables:

```bash
# Organization level - shared across all projects
# Project level - shared across all environments in a project
# Template level - shared across all environments from a template
# Environment level - specific to one environment
```

Set sensitive values as encrypted variables:

1. Navigate to your project or template
2. Go to **Variables**
3. Add the variable name and value
4. Check **Sensitive** to encrypt the value

You can also commit non-sensitive defaults in an OpenTofu variable definitions file and override them in env0:

```hcl
# staging.auto.tfvars
instance_type = "t3.micro"
environment   = "staging"

# Set sensitive values such as database_password in env0, not in source control.
```

## Cost Estimation

One of env0's standout features is automatic cost estimation. Before any apply happens, env0 shows you the estimated cost impact of the planned changes:

```yaml
# Enable cost estimation for your project
# This is typically done in the env0 UI under Project Settings > Policies

# You can also enforce cost rules with env0 approval policies:
# - Warn if monthly cost exceeds $500
# - Block deployments that exceed $1000/month
# - Require approval for changes over $200/month
```

Cost estimation works with AWS, Azure, and GCP resources. It uses Infracost under the hood and shows line-by-line cost breakdowns for each resource change.

## Setting Up Approval Workflows

For production environments, you want manual approval gates:

```yaml
# In env0, configure approval policies:
# 1. Navigate to your template settings
# 2. Under the advanced section, add an approval policy
# 3. Select the repository and path containing your Rego files
# 4. Save the template policy assignment
```

You can also use custom policies written in OPA:

```rego
# policy.rego
# Require approval for any changes to production databases
package env0

pending["Production database changes require approval"] {
  input.variables.terraform.environment == "production"
  resource := input.plan.resource_changes[_]
  resource.type == "aws_db_instance"
}
```

## Self-Service Environments

env0 excels at self-service workflows. Developers can provision their own environments from pre-approved templates:

1. Create a template with appropriate constraints (instance sizes, regions, TTL)
2. Set a TTL (time-to-live) so environments are automatically destroyed after a set period
3. Assign the template to a project with the appropriate team access
4. Developers can now launch environments from the catalog

```yaml
# Template with TTL and constraints
# Set TTL in the env0 UI:
# - Default TTL: 8 hours (for dev environments)
# - Maximum TTL: 48 hours
# - Allow extensions: Yes, up to 2 times
```

This prevents forgotten development environments from running up cloud bills indefinitely.

## Custom Workflows

env0 supports custom workflow steps that run before or after the standard init/plan/apply sequence:

```yaml
# env0.yml with custom steps
version: 2

deploy:
  steps:
    opentofuInit:
      before:
        - name: Set up tools
          run: |
            echo "Setting up environment"
            pip install checkov

    opentofuPlan:
      after:
        - name: Scan OpenTofu plan
          run: |
            tofu show -json .tf-plan > tfplan.json
            checkov -f tfplan.json --framework terraform_plan

    opentofuApply:
      after:
        - name: Run smoke tests and notify
          run: |
            ./scripts/smoke-test.sh
            curl -X POST "$SLACK_WEBHOOK" -d '{"text":"Deployment complete"}'

destroy:
  steps:
    opentofuDestroy:
      before:
        - name: Prepare for destroy
          run: echo "Preparing for destroy"
```

## Handling Multiple Environments

A common pattern is having separate configurations for dev, staging, and production. env0 handles this through variable overrides:

```hcl
# main.tf - same configuration for all environments
variable "environment" {
  type = string
}

variable "instance_type" {
  type = string
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name        = "app-${var.environment}"
    Environment = var.environment
  }
}
```

Create separate environments from the same template, overriding variables for each:

- **Dev**: `instance_type = t3.micro`, `environment = dev`, TTL = 8 hours
- **Staging**: `instance_type = t3.medium`, `environment = staging`, TTL = none
- **Production**: `instance_type = t3.large`, `environment = production`, TTL = none, requires approval

## Monitoring Deployed Infrastructure

After env0 deploys your infrastructure, you need visibility into whether those services are actually running correctly. [OneUptime](https://oneuptime.com) can monitor your deployed applications and services, providing uptime monitoring, alerting, and incident management that complements env0's deployment workflow.

## Troubleshooting Common Issues

**OpenTofu version mismatch**: Make sure the version selected in the template, `.opentofu-version`, or `ENV0_OPENTOFU_VERSION` matches what your configuration expects. Pin to a specific version rather than using ranges.

**Credential errors**: Verify that your cloud credentials are set at the correct scope (organization or project) and assigned to the project or environment. Use `tofu init` locally with equivalent credentials to test.

**State locking conflicts**: If deployments fail with state lock errors, check that the previous run completed properly. env0 handles state locking, but manual interventions can cause conflicts.

## Conclusion

env0 provides a solid workflow layer on top of OpenTofu, especially for teams that need self-service environments, cost visibility, and governance controls. The platform's native OpenTofu support means you get all the benefits of open source IaC with enterprise-grade workflow automation. Start with a simple template, add policies as your governance needs grow, and use the self-service features to empower your development teams.

For more on OpenTofu integrations, check out our guide on [using OpenTofu with Spacelift](https://oneuptime.com/blog/post/2026-02-23-how-to-use-opentofu-with-spacelift/view) or [debugging OpenTofu configuration issues](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-opentofu-configuration-issues/view).
