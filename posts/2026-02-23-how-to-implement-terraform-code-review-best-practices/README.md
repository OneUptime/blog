# How to Implement Terraform Code Review Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Code Review, DevOps, Infrastructure as Code, Best Practices

Description: A practical guide to establishing effective Terraform code review practices that catch misconfigurations before they reach production.

---

Code review is one of the most effective ways to catch problems before they hit production. When you are reviewing Terraform code, the stakes are high because a missed issue can take down infrastructure or expose sensitive data. But reviewing infrastructure code is different from reviewing application code. You need to think about state, dependencies, blast radius, and cloud provider quirks.

This guide covers practical code review practices for Terraform that actually work in real teams.

## Set Up the Foundation

Before you can review Terraform code effectively, you need some structure in place. Your repository should have a consistent layout that reviewers can navigate quickly.

```text
infrastructure/
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
  environments/
    production/
      main.tf
      backend.tf
      terraform.tfvars
    staging/
      main.tf
      backend.tf
      terraform.tfvars
```

Enforce this structure with a contributing guide and use linting to catch deviations:

```bash
# Install and run terraform fmt to enforce formatting
terraform fmt -check -recursive -diff

# Use tflint for deeper linting
tflint --init
tflint --recursive
```

## Require Plan Output in Pull Requests

The single most important code review practice for Terraform is requiring a plan output in every pull request. Reviewing HCL code alone is not enough because you cannot always predict what Terraform will actually do.

```yaml
# GitHub Actions workflow that posts plan output to PRs
name: Terraform Plan
on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tfvars'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan 2>&1 | tee plan.txt
        continue-on-error: true

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan.txt', 'utf8');
            const truncated = plan.length > 60000
              ? plan.substring(0, 60000) + '\n... (truncated)'
              : plan;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan Output\n\`\`\`\n${truncated}\n\`\`\``
            });
```

## Create a Terraform Review Checklist

Give your reviewers a concrete checklist. Not everything applies to every PR, but having the list means nothing gets overlooked.

```markdown
## Terraform PR Review Checklist

### Security
- [ ] No hardcoded secrets or credentials
- [ ] IAM policies follow least privilege
- [ ] Security groups are not overly permissive (no 0.0.0.0/0 on sensitive ports)
- [ ] Encryption is enabled where applicable
- [ ] No public access to resources that should be private

### State and Dependencies
- [ ] No resources will be destroyed unintentionally
- [ ] Resource dependencies are explicit where needed
- [ ] lifecycle blocks are used appropriately (prevent_destroy, ignore_changes)
- [ ] State moves are documented if resource addresses changed

### Code Quality
- [ ] Variables have descriptions and type constraints
- [ ] Outputs are documented
- [ ] Resource naming follows team conventions
- [ ] No deprecated resource types or arguments
- [ ] Modules are versioned with pinned versions
```

## Review the Plan, Not Just the Code

When reviewing a pull request, spend most of your time on the plan output. Here is what to look for:

### Watch for Destructive Changes

The most dangerous thing in a Terraform plan is a destroy-and-recreate. Look for lines that say "must be replaced" or show a `-/+` prefix:

```text
# aws_instance.web must be replaced
-/+ resource "aws_instance" "web" {
      ~ ami           = "ami-abc123" -> "ami-def456" # forces replacement
      ~ id            = "i-1234567890abcdef0" -> (known after apply)
        instance_type = "t3.medium"
        ...
    }
```

If you see this, ask: "Is this replacement intentional? What is the impact on running workloads?"

### Check the Resource Count

A plan that says "50 to add, 0 to change, 0 to destroy" when you expected a small change is a red flag. Something is probably wrong with the state or the configuration.

### Look for Sensitive Values

Terraform marks some values as sensitive, but not all providers do this correctly. Watch for database passwords, API keys, or other secrets showing up in plain text in the plan output.

## Enforce Automated Checks

Do not rely solely on human reviewers. Automate the things that can be automated:

```yaml
# Pre-commit hooks for Terraform
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.86.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
      - id: terraform_tfsec
      - id: terraform_docs
        args:
          - --hook-config=--path-to-file=README.md
          - --hook-config=--add-to-existing-file=true
```

Run security scanners as required status checks:

```hcl
# Require these checks to pass before merging
resource "github_branch_protection" "main" {
  repository_id = github_repository.infra.node_id
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = [
      "terraform-fmt",
      "terraform-validate",
      "tfsec",
      "checkov",
      "terraform-plan"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 2
    require_code_owner_reviews      = true
  }
}
```

## Review Module Changes Carefully

Changes to shared modules deserve extra scrutiny because they affect every environment that uses them. When reviewing module changes:

1. Check that the module version is bumped appropriately (semver)
2. Verify that new variables have sensible defaults for backward compatibility
3. Look at all consumers of the module to understand the blast radius
4. Make sure the module README and examples are updated

```hcl
# Good: Module with version constraint
module "vpc" {
  source  = "git::https://github.com/my-org/terraform-modules.git//vpc?ref=v2.3.1"

  cidr_block = "10.0.0.0/16"
  # ...
}

# Risky: Module pointing to main branch
module "vpc" {
  source  = "git::https://github.com/my-org/terraform-modules.git//vpc"

  cidr_block = "10.0.0.0/16"
  # ...
}
```

## Handle Large Changes

Sometimes a pull request is genuinely large - a new environment, a major migration, or a module refactor. For these:

- Break the PR into logical, reviewable chunks when possible
- Use `moved` blocks instead of destroy-and-recreate when renaming resources
- Provide a detailed description explaining the "why" behind the change
- Consider a live walkthrough with the reviewer

```hcl
# Use moved blocks for resource renames
moved {
  from = aws_instance.web_server
  to   = aws_instance.application_server
}

resource "aws_instance" "application_server" {
  ami           = var.ami_id
  instance_type = var.instance_type
  # ...
}
```

## Establish Ownership with CODEOWNERS

Use a CODEOWNERS file to make sure the right people review infrastructure changes:

```text
# CODEOWNERS
# Production changes require platform team review
environments/production/    @my-org/platform-team
modules/                    @my-org/platform-team

# Staging can be reviewed by any senior engineer
environments/staging/       @my-org/senior-engineers

# Network changes need security team sign-off
modules/networking/         @my-org/security-team @my-org/platform-team
```

## Document Review Decisions

When a reviewer approves a potentially risky change, document why. Future you will thank present you when trying to understand why a specific configuration was chosen.

```hcl
# This security group allows SSH from 0.0.0.0/0 intentionally.
# Approved in PR #423 by @security-lead on 2026-02-20.
# Reason: Bastion host requires public SSH access.
# Compensating controls: fail2ban, key-only auth, CloudWatch alerts.
resource "aws_security_group_rule" "bastion_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.bastion.id
}
```

## Wrapping Up

Good Terraform code review is a combination of automated checks and human judgment. Automate formatting, linting, security scanning, and plan generation. Then use human reviewers to evaluate intent, blast radius, and architectural decisions. The goal is not to slow down deployments but to catch the mistakes that automated tools miss.

For keeping tabs on your infrastructure health after deployment, check out [OneUptime](https://oneuptime.com) for monitoring, incident management, and status pages.
