# How to Use OpenTofu with TACOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, TACOS, Terraform, IaC, DevOps, CI/CD

Description: Learn how to integrate OpenTofu with TACOS (Terraform Automation and Collaboration Software) platforms like Spacelift, Scalr, env0, and Atlantis for team workflows.

## Introduction

TACOS (Terraform Automation and Collaboration Software) are platforms that provide collaborative infrastructure management features: pull request automation, policy enforcement, cost estimation, audit logs, and more. Popular TACOS platforms that support OpenTofu include Spacelift, Scalr, env0, Atlantis, and Digger.

## Why Use a TACOS Platform

Running OpenTofu locally or with basic CI/CD has limitations:

- No state locking for concurrent team operations
- No audit trail for who changed what
- No policy-as-code enforcement
- No pull request integration with plan output
- No cost estimation before apply

TACOS platforms address these gaps with purpose-built features.

## Atlantis (Open Source)

Atlantis is the most popular open-source option and runs as a server that receives GitHub/GitLab webhooks:

```yaml
# atlantis.yaml - repository configuration

version: 3

projects:
  - name: production
    dir: environments/production
    workspace: production
    autoplan:
      when_modified: ["*.tf", "../modules/**/*.tf"]
      enabled: true
    apply_requirements:
      - approved
      - mergeable

  - name: staging
    dir: environments/staging
    workspace: staging
    autoplan:
      when_modified: ["*.tf", "../modules/**/*.tf"]
      enabled: true
```

Configure Atlantis to use OpenTofu instead of Terraform:

```yaml
# atlantis server configuration
default-tf-distribution: opentofu
default-tf-version: 1.7.0
```

Or using environment variables:
```bash
ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu
ATLANTIS_DEFAULT_TF_VERSION=1.7.0
```

You can also override the distribution per-project in `atlantis.yaml` with the `terraform_distribution: opentofu` field.

PR workflow with Atlantis:
```hcl
# In a GitHub PR comment:
atlantis plan    # Runs tofu plan, posts output as comment
atlantis apply   # Runs tofu apply after approval
```

## Spacelift

Spacelift supports OpenTofu natively. Configure a stack via API or UI:

```hcl
# spacelift stack configuration (Spacelift's own Terraform/OpenTofu provider)
resource "spacelift_stack" "production" {
  name       = "production-infrastructure"
  repository = "my-org/infrastructure"
  branch     = "main"
  project_root = "environments/production"

  # Use OpenTofu instead of Terraform
  terraform_version     = "1.7.0"
  terraform_workflow_tool = "OPEN_TOFU"

  autodeploy  = false  # Require manual approval for production
  autoretry   = false
}

resource "spacelift_policy_attachment" "production" {
  policy_id = spacelift_policy.no_destroy.id
  stack_id  = spacelift_stack.production.id
}
```

## env0

env0 uses a configuration file for per-repo settings:

```yaml
# env0.yml
environments:
  - name: production
    workspace: production
    opentofuVersion: "1.7.0"
    isTerragrunt: false
    # Use opentofuVersion to select OpenTofu; leave terraformVersion empty
    autoApprove: false
    approvalRequired: true
    requiredApprovals: 2
    runOnPullRequest: true
```

## Scalr

Scalr configuration via its provider:

```hcl
resource "scalr_workspace" "production" {
  name              = "production"
  environment_id    = scalr_environment.prod.id
  iac_platform      = "opentofu"
  terraform_version = "1.7.0"
  auto_apply        = false
  operations        = true
}
```

## Generic CI/CD Integration Pattern

For any CI/CD system (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/opentofu.yml
name: OpenTofu

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.7.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PLAN_ROLE_ARN }}
          aws-region: us-east-1

      - name: OpenTofu Init
        run: tofu init -backend-config="bucket=${{ secrets.STATE_BUCKET }}"

      - name: OpenTofu Plan
        id: plan
        run: tofu plan -out=tfplan -no-color
        continue-on-error: true

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## OpenTofu Plan\n```\n${plan}\n````
            })

  apply:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.7.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_APPLY_ROLE_ARN }}
          aws-region: us-east-1

      - name: OpenTofu Init
        run: tofu init -backend-config="bucket=${{ secrets.STATE_BUCKET }}"

      - name: OpenTofu Apply
        run: tofu apply -auto-approve
```

## Policy as Code with OPA

Most TACOS platforms support Open Policy Agent (OPA) for policy enforcement:

```rego
# no_public_s3.rego
package spacelift

deny[sprintf("S3 bucket %s must not be public", [resource.address])] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  resource.change.after.acl == "public-read"
}
```

## Conclusion

TACOS platforms significantly improve team collaboration on OpenTofu infrastructure by providing PR automation, policy enforcement, audit trails, and approval workflows. For small teams, Atlantis offers a free, self-hosted option. For larger organizations or teams needing SaaS features like cost estimation and SSO, commercial platforms like Spacelift, env0, or Scalr are worth evaluating. All major TACOS platforms now support OpenTofu natively.
