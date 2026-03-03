# How to Use Terragrunt apply-all for Multi-Module Apply

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Deployment, Multi-Module, Automation

Description: Learn how to use Terragrunt apply-all and run-all apply to deploy infrastructure changes across multiple modules safely with dependency ordering and error handling.

---

Deploying infrastructure changes across multiple Terraform modules in the right order is one of Terragrunt's core strengths. The `apply-all` command (now `run-all apply`) handles this by building a dependency graph and applying modules in the correct sequence, with independent modules running in parallel.

## apply-all vs run-all apply

Like the other `-all` commands, `apply-all` is deprecated in favor of the `run-all` prefix:

```bash
# Legacy (deprecated, still works)
terragrunt apply-all

# Modern (recommended)
terragrunt run-all apply
```

Use `run-all apply` going forward.

## Basic Usage

```bash
# Apply all modules in the dev environment
cd live/dev
terragrunt run-all apply
```

Terragrunt scans for all `terragrunt.hcl` files, resolves dependencies, and applies in order. You will see a confirmation prompt showing which modules will be affected:

```text
Are you sure you want to run 'terragrunt apply' in each folder of the stack described above?
  Module /path/to/live/dev/vpc
  Module /path/to/live/dev/rds
  Module /path/to/live/dev/ecs
  Module /path/to/live/dev/app

Type 'yes' to confirm:
```

## Non-Interactive Mode

For CI/CD pipelines, skip the confirmation prompt:

```bash
# Auto-approve everything
terragrunt run-all apply --terragrunt-non-interactive
```

This passes `-auto-approve` to each `terraform apply` call and skips Terragrunt's own confirmation prompt.

## Applying Saved Plans

The safest deployment approach is to plan first, review, then apply the exact plan:

```bash
# Step 1: Generate and save plans
cd live/dev
terragrunt run-all plan -out=tfplan

# Step 2: Review the plans (manually or in CI)

# Step 3: Apply the saved plans
terragrunt run-all apply tfplan
```

When applying a saved plan file, Terraform skips the confirmation prompt because the plan was already reviewed.

## Dependency-Aware Execution

The execution order respects your dependency declarations:

```hcl
# ecs/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}
inputs = {
  vpc_id = dependency.vpc.outputs.vpc_id
}

# app/terragrunt.hcl
dependency "ecs" {
  config_path = "../ecs"
}
dependency "rds" {
  config_path = "../rds"
}
```

The apply order becomes:

```text
Step 1: vpc (no dependencies)
Step 2: rds, ecs (both depend on vpc, run in parallel)
Step 3: app (depends on rds and ecs)
```

After the VPC is applied, its real outputs (not mocks) are available for the RDS and ECS modules. After RDS and ECS complete, their outputs are available for the app module.

## Error Handling

### Default Behavior

If a module fails, all modules that depend on it are skipped:

```text
vpc  -> SUCCESS
rds  -> FAILED (some API error)
ecs  -> SUCCESS
app  -> SKIPPED (depends on rds which failed)
```

Terragrunt reports which modules were skipped and why.

### Ignoring Dependency Errors

You can force all modules to attempt even if dependencies fail:

```bash
terragrunt run-all apply --terragrunt-ignore-dependency-errors --terragrunt-non-interactive
```

This is generally not recommended for apply operations since modules may fail without correct dependency outputs.

### Retry on Transient Errors

Configure automatic retries in your root `terragrunt.hcl`:

```hcl
# Root terragrunt.hcl

# Retry up to 3 times on transient errors
retry_max_attempts = 3
retry_sleep_interval_sec = 10

retryable_errors = [
  "(?s).*Error creating.*timeout.*",
  "(?s).*RequestLimitExceeded.*",
  "(?s).*Throttling.*",
  "(?s).*TooManyRequestsException.*",
  "(?s).*connection reset by peer.*",
]
```

This is particularly useful with `run-all apply` because applying many modules in parallel can trigger cloud provider rate limits.

## Controlling Parallelism

```bash
# Full parallelism (default)
terragrunt run-all apply --terragrunt-non-interactive

# Limited parallelism to reduce API rate limiting
terragrunt run-all apply --terragrunt-non-interactive --terragrunt-parallelism 3

# Sequential execution (safest but slowest)
terragrunt run-all apply --terragrunt-non-interactive --terragrunt-parallelism 1
```

For production deployments, lower parallelism is often safer because it reduces the blast radius of issues and makes logs easier to follow.

## Selective Apply

You often do not need to apply everything. Target specific modules:

```bash
# Apply only networking modules
terragrunt run-all apply --terragrunt-include-dir "*/vpc" --terragrunt-include-dir "*/subnets"

# Apply everything except monitoring
terragrunt run-all apply --terragrunt-exclude-dir "*/monitoring"

# Apply a specific layer
cd live/dev/compute
terragrunt run-all apply
```

When you include specific modules, Terragrunt still respects their dependencies. If you include the app module but not the vpc module it depends on, Terragrunt will handle it gracefully (assuming vpc was already applied).

## Bootstrapping a New Environment

Setting up a new environment from scratch is one of the best use cases for `run-all apply`:

```bash
# Create the entire dev environment
cd live/dev
terragrunt run-all apply --terragrunt-non-interactive
```

Make sure all your dependencies have mock outputs configured, because on first run, no module has state yet:

```hcl
dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id             = "vpc-placeholder"
    private_subnet_ids = ["subnet-placeholder-1", "subnet-placeholder-2"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}
```

During `apply`, Terragrunt uses real outputs (not mocks) once a dependency has been applied. The execution flow is:

1. Apply vpc - creates real VPC
2. Apply rds - reads vpc's real outputs from state (not mocks)
3. Apply app - reads rds's real outputs from state

Mocks are only used during `plan` and `validate` commands, not during `apply`.

## CI/CD Pipeline Pattern

A production-grade deployment pipeline:

```yaml
# GitHub Actions
name: Deploy to Dev

on:
  push:
    branches: [main]
    paths: ['live/dev/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: dev
    concurrency:
      group: deploy-dev
      cancel-in-progress: false  # never cancel infrastructure deployments

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/GitHubDeployRole
          aws-region: us-east-1

      - name: Plan
        run: |
          cd live/dev
          terragrunt run-all plan \
            --terragrunt-non-interactive \
            --terragrunt-parallelism 3 \
            -out=tfplan 2>&1 | tee plan-output.txt

      - name: Apply
        run: |
          cd live/dev
          terragrunt run-all apply \
            --terragrunt-non-interactive \
            --terragrunt-parallelism 2 \
            tfplan
```

Key points:
- Use `concurrency` to prevent parallel deployments
- Never cancel infrastructure deployments (`cancel-in-progress: false`)
- Use saved plans for consistency between plan and apply
- Lower parallelism for apply than plan

## Monitoring Progress

For long-running applies, you may want to track progress:

```bash
# Stream output with timestamps
terragrunt run-all apply --terragrunt-non-interactive 2>&1 | while IFS= read -r line; do
  echo "$(date +%H:%M:%S) $line"
done
```

## Recovering from Partial Failures

If `run-all apply` partially fails (some modules applied, some did not), you can safely re-run it:

```bash
# Re-run the apply - already-applied modules will show "no changes"
cd live/dev
terragrunt run-all apply --terragrunt-non-interactive
```

Terraform is idempotent, so re-applying modules that already succeeded will show "no changes" and complete quickly. Only the failed modules will actually do work.

## When Not to Use run-all apply

There are situations where applying individually is better:

- **High-risk changes**: Database migrations, breaking changes to shared resources
- **Changes that require manual verification**: Review each module's plan individually
- **New module additions**: Apply the new module alone first to verify it works
- **Debugging**: When troubleshooting, isolate one module at a time

```bash
# Apply just the database module individually
cd live/dev/rds
terragrunt apply
```

## Conclusion

`run-all apply` is the workhorse command for multi-module Terragrunt deployments. It handles dependency ordering, parallel execution, and error propagation automatically. Use it with saved plans for the safest deployment workflow, configure retries for transient errors, and control parallelism based on your cloud provider's rate limits.

For tearing down infrastructure, see [How to Use Terragrunt destroy-all for Multi-Module Destroy](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-destroy-all-for-multi-module-destroy/view).
