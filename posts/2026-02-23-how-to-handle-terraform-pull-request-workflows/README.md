# How to Handle Terraform Pull Request Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Team Collaboration, Pull Requests, DevOps, Infrastructure as Code

Description: Learn how to set up effective Terraform pull request workflows that ensure safe infrastructure changes with automated validation, planning, and team review processes.

---

Managing infrastructure changes through Terraform requires discipline, especially when multiple engineers are making changes simultaneously. Pull request workflows provide the structure needed to ensure that every change is reviewed, validated, and applied safely. Without a well-defined PR workflow, teams risk deploying broken configurations, overwriting each other's changes, or introducing security vulnerabilities into their infrastructure.

This guide walks you through building a robust Terraform pull request workflow from scratch, covering automation, validation, and team collaboration patterns.

## Why Terraform Needs Structured PR Workflows

Terraform manages real infrastructure. A misconfigured resource block can take down production services, expose sensitive data, or rack up unexpected cloud costs. Unlike application code where a bug might affect a single feature, a Terraform mistake can cascade across your entire infrastructure.

Pull request workflows add guardrails. They ensure that every change goes through automated checks and human review before reaching your infrastructure. This is not just a best practice - it is a necessity for teams operating at scale.

## Setting Up the Basic Workflow

A typical Terraform PR workflow follows these steps: a developer creates a feature branch, makes changes, opens a pull request, automated checks run, reviewers approve, and the change is merged and applied.

Start by structuring your repository to support this flow:

```hcl
# Repository structure for PR workflows
# environments/
#   production/
#     main.tf
#     variables.tf
#     backend.tf
#   staging/
#     main.tf
#     variables.tf
#     backend.tf
# modules/
#   networking/
#     main.tf
#     variables.tf
#     outputs.tf
```

Each environment should have its own directory with a separate state file. This isolation prevents changes to staging from accidentally affecting production during the PR process.

## Automating Terraform Validation in PRs

The first automated check in your PR pipeline should validate the Terraform configuration. This catches syntax errors and basic misconfiguration before anyone spends time reviewing the code.

Create a CI pipeline that runs on every pull request:

```yaml
# .github/workflows/terraform-pr.yml
name: Terraform PR Validation

on:
  pull_request:
    paths:
      - 'environments/**'
      - 'modules/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # Initialize without backend to validate syntax
      - name: Terraform Init
        run: terraform init -backend=false
        working-directory: environments/${{ matrix.environment }}

      # Check formatting
      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        working-directory: environments/${{ matrix.environment }}

      # Validate configuration
      - name: Terraform Validate
        run: terraform validate
        working-directory: environments/${{ matrix.environment }}
```

This pipeline runs format checks and validation for each environment affected by the pull request. The `-backend=false` flag allows validation without needing cloud credentials during the initial check.

## Adding Terraform Plan to Pull Requests

The most valuable automated check is running `terraform plan` and posting the output directly to the pull request. This lets reviewers see exactly what infrastructure changes will occur.

```yaml
# Additional step for terraform plan
  plan:
    needs: validate
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init
        working-directory: environments/${{ matrix.environment }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Run plan and save output
      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: environments/${{ matrix.environment }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Post plan output as PR comment
      - name: Comment Plan Output
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan - ${{ matrix.environment }}
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });
```

Reviewers can now see the full plan output without leaving the pull request interface.

## Implementing Security Scanning

Add security scanning tools to catch potential vulnerabilities before they reach production:

```yaml
# Security scanning step
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Run tfsec for security analysis
      - name: tfsec Security Scan
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          soft_fail: false

      # Run checkov for compliance checks
      - name: Checkov Compliance Scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          output_format: github_failed_only
```

These tools scan for common security issues like overly permissive IAM policies, unencrypted storage, and publicly accessible resources.

## Defining the Review Process

Automated checks are only half the equation. Human review is essential for catching logic errors and ensuring changes align with your infrastructure strategy.

Define clear review requirements:

```yaml
# .github/CODEOWNERS
# Require platform team review for all infrastructure changes
/environments/production/ @platform-team
/environments/staging/ @platform-team @dev-leads

# Module changes need architecture review
/modules/ @architecture-team @platform-team
```

Set up branch protection rules to enforce these requirements. Require at least two approvals for production changes and one for staging. This ensures that no single person can push infrastructure changes without oversight.

## Handling the Apply Step

After a pull request is merged, you need to apply the changes. There are two common approaches: automated apply on merge and manual apply with approval.

For automated apply:

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches:
      - main
    paths:
      - 'environments/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    environment: production  # Requires environment approval
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: environments/production

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: environments/production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

The `environment: production` setting in GitHub Actions allows you to add an additional approval gate before the apply runs, even after the PR is merged.

## Managing Concurrent Pull Requests

When multiple pull requests modify the same Terraform state, you need a strategy to handle conflicts. State locking prevents concurrent applies, but you also need to manage plan drift.

Implement a queuing system for applies:

```hcl
# Use remote state with locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    # DynamoDB table for state locking
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

When a plan becomes stale due to another PR being merged first, your CI pipeline should automatically re-run the plan and request a new review.

## Monitoring and Observability

Track the health of your PR workflow with metrics. Monitor how long PRs take to merge, how often plans fail, and how frequently applies encounter errors. Tools like OneUptime can help you monitor the health of your CI/CD pipelines and alert you when Terraform operations fail unexpectedly. Learn more about monitoring infrastructure workflows in our guide on [infrastructure monitoring best practices](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-on-call-terraform-operations/view).

## Best Practices Summary

Keep your PR workflow lean but thorough. Every check should serve a purpose. Format validation catches style issues. Plan output shows the impact. Security scanning catches vulnerabilities. Human review catches logic errors.

Label your pull requests by risk level. Changes that only modify tags are low risk. Changes that modify security groups or IAM policies are high risk. Route high-risk changes through additional review.

Document your workflow so that new team members can get up to speed quickly. Include examples of good pull request descriptions, common review feedback, and the expected timeline for reviews.

A well-designed Terraform PR workflow transforms infrastructure management from a risky manual process into a safe, repeatable, and auditable practice. Invest the time upfront to set it up properly, and your team will move faster with greater confidence.
