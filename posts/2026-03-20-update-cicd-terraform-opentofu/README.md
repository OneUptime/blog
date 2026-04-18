# How to Update CI/CD Pipelines from Terraform to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CI/CD, GitHub Action, GitLab, Migration, DevOps

Description: Learn how to update GitHub Actions, GitLab CI, and other CI/CD pipelines to use OpenTofu instead of Terraform - replacing setup actions, binary calls, and environment variables.

## Introduction

Migrating CI/CD from Terraform to OpenTofu is mostly a find-and-replace of the binary name and setup action. The commands, flags, and exit codes are identical. The main changes are: replace `hashicorp/setup-terraform` with `opentofu/setup-opentofu`, and replace `terraform` with `tofu` in run commands.

## GitHub Actions: Before and After

### Before (Terraform)

```yaml
# .github/workflows/terraform.yml

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.0"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan
```

### After (OpenTofu)

```yaml
# .github/workflows/opentofu.yml
jobs:
  opentofu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.9.0"   # Matches OpenTofu version scheme

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan
        run: tofu plan -out=tfplan

      - name: OpenTofu Apply
        if: github.ref == 'refs/heads/main'
        run: tofu apply tfplan
```

## GitLab CI: Before and After

### Before (Terraform)

```yaml
# .gitlab-ci.yml
terraform:
  image: hashicorp/terraform:1.9
  script:
    - terraform init
    - terraform plan -out=tfplan
    - terraform apply tfplan
  only:
    - main
```

### After (OpenTofu)

```yaml
# .gitlab-ci.yml
opentofu:
  image: ghcr.io/opentofu/opentofu:1.9
  script:
    - tofu init
    - tofu plan -out=tfplan
    - tofu apply tfplan
  only:
    - main
```

## Environment Variables: No Changes Needed

Most Terraform environment variables continue to work with OpenTofu:

```bash
# These work unchanged in OpenTofu
TF_LOG=DEBUG
TF_LOG_PATH=/tmp/tofu-debug.log
TF_VAR_environment=production
TF_CLI_ARGS_plan="-parallelism=20"
TF_PLUGIN_CACHE_DIR=/tmp/plugin-cache
```

## Atlantis: Update workflow.yaml

```yaml
# atlantis.yaml - before
workflows:
  default:
    plan:
      steps:
        - init
        - plan
    apply:
      steps:
        - apply
```

```yaml
# atlantis.yaml - after
workflows:
  opentofu:
    plan:
      steps:
        - run: tofu init -input=false
        - run: tofu plan -input=false -out=tfplan
    apply:
      steps:
        - run: tofu apply tfplan

repos:
  - id: /.*/
    workflow: opentofu
    allowed_overrides: []
```

Set Atlantis environment variable:
```bash
# Atlantis server configuration (v0.24.0+)
ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu
```

## Terragrunt: One Variable Change

```hcl
# terragrunt.hcl - change terraform_binary
terraform_binary = "tofu"   # Was: "terraform"
```

## Full GitHub Actions Pipeline with PR Comments

```yaml
name: OpenTofu CI/CD

on:
  pull_request:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.9.0"
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: tofu init
      - id: plan
        run: tofu plan -no-color 2>&1 | tee /tmp/plan-output.txt
      - uses: actions/github-script@v7
        with:
          script: |
            const plan = require('fs').readFileSync('/tmp/plan-output.txt', 'utf8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## OpenTofu Plan\n\`\`\`\n${plan.slice(0, 65000)}\n\`\`\``
            })

  apply:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: tofu init && tofu apply -auto-approve
```

## Conclusion

Updating CI/CD from Terraform to OpenTofu is straightforward: swap `hashicorp/setup-terraform` for `opentofu/setup-opentofu`, replace `terraform` with `tofu` in commands, and update container images to `ghcr.io/opentofu/opentofu`. All flags, exit codes, and environment variables remain identical. The migration can be done incrementally - one pipeline at a time - with no risk to existing state.
