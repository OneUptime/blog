# How to Create Terraform Best Practices Documentation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Documentation, Best Practices, DevOps, Standards

Description: Learn how to create comprehensive Terraform best practices documentation that serves as a living reference for your engineering teams, covering code structure, state management, security, and more.

---

Good documentation is the backbone of consistent Terraform practices across an organization. Without it, every engineer makes their own decisions about how to structure code, manage state, and handle deployments. The result is a patchwork of inconsistent patterns that are difficult to maintain and review. Well-crafted best practices documentation provides a shared understanding that enables teams to work consistently and efficiently.

In this guide, we will cover how to create documentation that teams actually read and follow.

## Documentation Structure

Organize your documentation into logical sections that match the Terraform workflow:

```yaml
# docs/structure.yaml
# Best practices documentation outline

sections:
  - name: "Code Organization"
    topics:
      - File structure and naming
      - Module organization
      - Variable and output conventions
      - Resource naming standards

  - name: "State Management"
    topics:
      - Remote state configuration
      - State isolation strategy
      - State operations (import, mv, rm)
      - State backup and recovery

  - name: "Security"
    topics:
      - Credential management
      - Encryption standards
      - IAM best practices
      - Secret handling

  - name: "Testing"
    topics:
      - Validation and linting
      - Integration testing
      - Plan review checklist
      - Drift detection

  - name: "CI/CD"
    topics:
      - Pipeline configuration
      - Approval workflows
      - Deployment strategies
      - Rollback procedures

  - name: "Modules"
    topics:
      - When to create a module
      - Module design patterns
      - Versioning strategy
      - Publishing process
```

## Writing the Code Organization Guide

Start with the most fundamental topic - how code should be organized:

```hcl
# docs/examples/code-organization/README.md
# Code Organization Best Practices

# Standard file structure for a Terraform workspace:
#
# project/
#   main.tf          - Primary resource definitions
#   variables.tf     - Input variable declarations
#   outputs.tf       - Output value declarations
#   versions.tf      - Terraform and provider version constraints
#   locals.tf        - Local value definitions
#   data.tf          - Data source definitions
#   backend.tf       - Backend configuration
#   terraform.tfvars - Variable values (not committed for secrets)

# Example: versions.tf
# Always pin Terraform and provider versions
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

# Example: variables.tf
# Always include description, type, and validation
variable "environment" {
  description = "The deployment environment (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

# Example: locals.tf
# Use locals for computed values and repeated expressions
locals {
  name_prefix = "${var.team}-${var.service}-${var.environment}"

  common_tags = {
    Team        = var.team
    Service     = var.service
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Example: outputs.tf
# Always include description with outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}
```

## Writing the Security Practices Guide

Security documentation needs to be specific and actionable:

```hcl
# docs/examples/security/README.md
# Security Best Practices

# DO: Use IAM roles instead of access keys
provider "aws" {
  region = var.region

  assume_role {
    role_arn     = var.terraform_role_arn
    session_name = "terraform-${var.environment}"
  }
}

# DO: Encrypt all storage resources
resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.example.arn
    }
    bucket_key_enabled = true
  }
}

# DO: Use security groups with specific CIDR ranges
resource "aws_security_group_rule" "allow_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks  # Specific ranges
  security_group_id = aws_security_group.example.id
}

# DON'T: Never use 0.0.0.0/0 for SSH access
# DON'T: Never hardcode secrets in Terraform files
# DON'T: Never commit .tfvars files containing secrets

# DO: Use data sources to reference secrets
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # ... other configuration
}
```

## Writing the State Management Guide

State management is critical and often misunderstood:

```markdown
# State Management Best Practices

## Remote State Configuration
Always use remote state with locking. Never use local state files
for shared infrastructure.

## State Isolation Rules
- One state file per environment (dev, staging, production)
- One state file per team
- Shared infrastructure in its own state file

## State Operations Safety
Before any state operation:
1. Backup the current state
2. Run terraform plan to confirm current state
3. Perform the operation
4. Run terraform plan again to verify

### Moving Resources Between States
```bash
# Step 1: Remove from source state
terraform state rm 'aws_instance.example'

# Step 2: Import into destination state
cd ../destination
terraform import 'aws_instance.example' i-1234567890abcdef0
```

### Recovering from State Issues
```bash
# List available state versions (S3 backend)
aws s3api list-object-versions \
  --bucket myorg-terraform-state \
  --prefix path/to/terraform.tfstate

# Restore a previous version
aws s3api get-object \
  --bucket myorg-terraform-state \
  --key path/to/terraform.tfstate \
  --version-id "versionId123" \
  restored-state.tfstate
```
```

## Making Documentation Discoverable

Documentation that nobody reads is useless. Make it easy to find:

```yaml
# docs/discovery.yaml
# How we make documentation discoverable

discovery_methods:
  - method: "Link from CLI output"
    description: >
      Our CI pipeline posts links to relevant documentation
      when it detects common issues.

  - method: "IDE integration"
    description: >
      Custom TFLint rules link to our docs when violations
      are detected.

  - method: "Onboarding"
    description: >
      New team members are walked through the documentation
      during their first week.

  - method: "Slack bot"
    description: >
      Our Slack bot can answer Terraform questions by
      referencing the docs.

  - method: "PR templates"
    description: >
      PR templates include a checklist that references
      relevant best practices.
```

## Keeping Documentation Updated

Stale documentation is worse than no documentation because it misleads:

```yaml
# docs/maintenance.yaml
# Documentation maintenance schedule

ownership:
  primary: "platform-team"
  reviewers: "all team leads"

review_schedule:
  monthly:
    - Check all code examples still work
    - Verify links are not broken
    - Review feedback from help channel

  quarterly:
    - Update for new Terraform features
    - Update for new provider versions
    - Incorporate lessons from post-mortems
    - Add new common patterns

  triggers:
    - Terraform major version release
    - New organizational standard adopted
    - Significant incident post-mortem
    - New module added to library
```

## Using Examples Effectively

Every best practice should include a concrete example:

```hcl
# docs/examples/module-design/main.tf
# Module Design Best Practices Example

# GOOD: Module with clear inputs, validation, and outputs
module "web_service" {
  source = "../../modules/internal/web-service"

  # Required inputs are clearly documented
  service_name = "payment-api"
  team         = "payments"
  environment  = "production"

  # Optional inputs have sensible defaults
  instance_count = 3  # Default is 2
  enable_https   = true  # Default is true
}

# The module outputs everything consumers need
output "service_url" {
  value = module.web_service.endpoint_url
}

output "service_arn" {
  value = module.web_service.service_arn
}
```

## Documentation Format and Style

Establish a consistent format for all documentation:

```yaml
# docs/style-guide.yaml
# Documentation style guide

format:
  - Use Markdown for all documentation
  - Include a table of contents for documents over 500 words
  - Use code blocks with language hints for all examples
  - Include both DO and DON'T examples
  - Every section should answer "why" not just "how"

tone:
  - Write for an intermediate Terraform user
  - Be direct and specific
  - Avoid jargon without explanation
  - Use second person (you/your)

examples:
  - Every rule must have a code example
  - Examples should be copy-pasteable
  - Include comments explaining the why
  - Show both correct and incorrect patterns
```

## Best Practices for Best Practices Documentation

Write for the reader, not the author. Organize documentation around the questions engineers ask, not around the topics the platform team thinks are important.

Include the "why" behind every practice. Engineers are more likely to follow a practice when they understand the reasoning. "Always use remote state" is less compelling than "Always use remote state because local state files cannot be shared, have no locking, and are easily lost."

Use real examples from your codebase. Generic examples are less useful than examples that match your actual infrastructure patterns.

Keep it concise. A 50-page document that covers everything is less useful than a focused guide that covers the most important practices clearly.

Test your examples. Code examples that do not work erode trust in the documentation. Set up automated testing for your documentation examples.

Collect feedback continuously. Add a feedback mechanism to every documentation page and review the feedback regularly.

## Conclusion

Creating effective Terraform best practices documentation is an ongoing investment that pays off in more consistent, secure, and maintainable infrastructure. The key is to make documentation specific, discoverable, and current. Start with the most impactful practices, include concrete examples, and establish a maintenance process that keeps the documentation reliable and relevant as your organization's practices evolve.
