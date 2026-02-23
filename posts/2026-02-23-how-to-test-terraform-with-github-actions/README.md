# How to Test Terraform with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, CI/CD, Testing, DevOps, Automation

Description: Learn how to set up comprehensive Terraform testing in GitHub Actions with formatting checks, validation, plan review, security scanning, and integration testing.

---

GitHub Actions is a natural fit for Terraform testing. It integrates directly with pull requests, supports matrix strategies for testing multiple modules, and has a growing ecosystem of Terraform-specific actions. This guide covers everything from basic validation to full integration testing pipelines.

## Basic Setup

Start with a workflow that runs on pull requests touching Terraform files.

```yaml
# .github/workflows/terraform-test.yml
name: Terraform Tests

on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tfvars'
      - '.github/workflows/terraform-test.yml'

# Prevent concurrent runs on the same PR
concurrency:
  group: terraform-${{ github.head_ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
```

## Stage 1: Format and Validate

These checks need no cloud credentials and run fast.

```yaml
jobs:
  format-and-validate:
    name: Format & Validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Format Check
        id: fmt
        run: terraform fmt -check -recursive -diff
        continue-on-error: true

      - name: Validate All Modules
        id: validate
        run: |
          STATUS=0
          for dir in $(find . -name "*.tf" -exec dirname {} \; | sort -u); do
            echo "::group::Validating $dir"
            cd "$dir"
            terraform init -backend=false -input=false > /dev/null 2>&1
            if ! terraform validate; then
              STATUS=1
            fi
            cd "$GITHUB_WORKSPACE"
            echo "::endgroup::"
          done
          exit $STATUS

      - name: Post Format Results
        if: steps.fmt.outcome == 'failure'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `**Terraform Format Check Failed**\n\nRun \`terraform fmt -recursive\` locally and push the changes.`
            })

      - name: Fail on format error
        if: steps.fmt.outcome == 'failure'
        run: exit 1
```

## Stage 2: Lint with TFLint

TFLint catches provider-specific issues that `terraform validate` misses.

```yaml
  lint:
    name: Lint
    needs: format-and-validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest

      - name: Init TFLint
        run: tflint --init
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run TFLint
        run: |
          for dir in $(find . -name "*.tf" -exec dirname {} \; | sort -u); do
            echo "::group::Linting $dir"
            tflint --chdir="$dir"
            echo "::endgroup::"
          done
```

## Stage 3: Security Scanning

Run security scanners to catch misconfigurations.

```yaml
  security:
    name: Security Scan
    needs: format-and-validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trivy Security Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'table'
          exit-code: '1'
          severity: 'HIGH,CRITICAL'
          trivyignores: '.trivyignore'

      - name: Checkov Scan
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          quiet: true
          output_format: github_failed_only
```

## Stage 4: Native Terraform Tests

Run the built-in test framework for each module.

```yaml
  unit-tests:
    name: Unit Tests
    needs: [lint, security]
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        module:
          - modules/networking
          - modules/compute
          - modules/database
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Run Tests
        working-directory: ${{ matrix.module }}
        run: |
          terraform init -backend=false
          terraform test -verbose
```

## Stage 5: Plan Review on PRs

Show the Terraform plan directly in the pull request for human review.

```yaml
  plan:
    name: Plan
    needs: unit-tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PLAN_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init

      - name: Terraform Plan
        id: plan
        working-directory: environments/${{ matrix.environment }}
        run: terraform plan -no-color -input=false
        continue-on-error: true

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `### Terraform Plan - ${{ matrix.environment }}

            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`

            *Plan status: ${{ steps.plan.outcome }}*`;

            // Find existing comment to update
            const comments = await github.rest.issues.listComments({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
            });

            const botComment = comments.data.find(c =>
              c.body.includes(`Terraform Plan - ${{ matrix.environment }}`)
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                comment_id: botComment.id,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: output,
              });
            } else {
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: output,
              });
            }

      - name: Fail on plan error
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

## Stage 6: Integration Tests (On Demand)

Integration tests are expensive. Run them only when explicitly requested.

```yaml
  integration:
    name: Integration Tests
    needs: plan
    if: contains(github.event.pull_request.labels.*.name, 'run-integration')
    runs-on: ubuntu-latest
    environment: testing
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE_ARN }}
          aws-region: us-east-1

      - name: Run Integration Tests
        working-directory: test
        timeout-minutes: 30
        run: go test -v -timeout 25m ./...
        env:
          TEST_PREFIX: "gha-${{ github.run_id }}"

      - name: Cleanup on Failure
        if: failure()
        run: |
          echo "Integration tests failed. Running cleanup..."
          cd test
          go test -v -timeout 10m -run TestCleanup ./...
```

## Caching for Faster Runs

Speed up workflows by caching Terraform providers and Go modules.

```yaml
      - name: Cache Terraform Providers
        uses: actions/cache@v4
        with:
          path: ~/.terraform.d/plugin-cache
          key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: terraform-providers-

      - name: Configure Provider Cache
        run: |
          mkdir -p ~/.terraform.d/plugin-cache
          echo 'plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"' > ~/.terraformrc
```

## OIDC Authentication

Use GitHub's OIDC provider instead of long-lived credentials:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      # OIDC - no stored secrets needed
      role-to-assume: arn:aws:iam::123456789012:role/github-terraform-test
      aws-region: us-east-1
```

Set up the trust policy in AWS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:*"
        }
      }
    }
  ]
}
```

## Reusable Workflows

If you have multiple Terraform repositories, create a reusable workflow:

```yaml
# .github/workflows/terraform-reusable.yml
name: Reusable Terraform Test

on:
  workflow_call:
    inputs:
      terraform_version:
        type: string
        default: '1.7.0'
      working_directory:
        type: string
        required: true
    secrets:
      AWS_ROLE_ARN:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working_directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ inputs.terraform_version }}
      - run: terraform init -backend=false
      - run: terraform fmt -check
      - run: terraform validate
      - run: terraform test -verbose
```

Call it from other workflows:

```yaml
# In a consuming repository
jobs:
  test-networking:
    uses: myorg/terraform-workflows/.github/workflows/terraform-reusable.yml@main
    with:
      working_directory: modules/networking
    secrets:
      AWS_ROLE_ARN: ${{ secrets.AWS_TEST_ROLE }}
```

GitHub Actions gives you everything you need for a solid Terraform testing pipeline. Start with format, validate, and lint. Add security scanning next. Then add native tests and plan review. Integration tests come last, gated behind labels or environment approvals to control costs.

For GitLab users, see [How to Test Terraform with GitLab CI](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-with-gitlab-ci/view). For pipeline architecture, see [How to Set Up End-to-End Terraform Testing Pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-end-to-end-terraform-testing-pipelines/view).
