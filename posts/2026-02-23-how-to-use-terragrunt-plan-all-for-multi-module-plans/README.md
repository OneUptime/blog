# How to Use Terragrunt plan-all for Multi-Module Plans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Planning, Multi-Module

Description: Learn how to use Terragrunt plan-all and run-all plan to generate execution plans across multiple modules with proper dependency ordering and output management.

---

Before you apply changes to your infrastructure, you need to see what will change. In a multi-module Terragrunt project, running `terraform plan` one module at a time is tedious and error-prone. The `plan-all` command (and its modern equivalent `run-all plan`) lets you generate plans for every module in your environment at once.

## plan-all vs run-all plan

Terragrunt originally had a set of dedicated commands: `plan-all`, `apply-all`, and `destroy-all`. These are now deprecated in favor of the more flexible `run-all` command:

```bash
# Legacy command (deprecated but still works)
terragrunt plan-all

# Modern equivalent (recommended)
terragrunt run-all plan
```

Both do the same thing. Use `run-all plan` for new projects. The rest of this post uses the modern syntax, but everything applies to `plan-all` as well.

## Basic Usage

Navigate to a directory containing multiple Terragrunt modules and run:

```bash
cd live/dev
terragrunt run-all plan
```

Terragrunt will:

1. Find all `terragrunt.hcl` files recursively in `live/dev/`
2. Build the dependency graph
3. Run `terraform plan` on each module in dependency order
4. Output the plan for each module, prefixed with its path

## What the Output Looks Like

```text
Group 1
- Module /path/to/live/dev/vpc

Group 2
- Module /path/to/live/dev/rds
- Module /path/to/live/dev/ecs-cluster

Group 3
- Module /path/to/live/dev/app

[live/dev/vpc] Initializing the backend...
[live/dev/vpc]
[live/dev/vpc] Terraform will perform the following actions:
[live/dev/vpc]
[live/dev/vpc]   # aws_vpc.this will be created
[live/dev/vpc]   + resource "aws_vpc" "this" {
[live/dev/vpc]       + cidr_block = "10.0.0.0/16"
[live/dev/vpc]     }
[live/dev/vpc]
[live/dev/vpc] Plan: 5 to add, 0 to change, 0 to destroy.

[live/dev/rds] Initializing the backend...
[live/dev/rds]
[live/dev/rds] Terraform will perform the following actions:
...
```

Groups represent dependency levels. Modules in the same group can run in parallel.

## Handling First-Time Plans

When planning modules for the first time, dependencies have not been applied yet, so there are no outputs to read. This is where mock outputs become essential:

```hcl
# live/dev/app/terragrunt.hcl

dependency "vpc" {
  config_path = "../vpc"

  # Mock outputs allow planning before the VPC exists
  mock_outputs = {
    vpc_id             = "vpc-mock-12345"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}
```

Without mock outputs, `run-all plan` would fail on the first run because the VPC state does not exist yet.

## Saving Plans

You can pass `-out` to save the plan for each module:

```bash
# Save plans to files
terragrunt run-all plan -out=tfplan
```

Each module gets its own `tfplan` file in its `.terragrunt-cache` directory. You can later apply these saved plans:

```bash
# Apply the saved plans
terragrunt run-all apply tfplan
```

This is the safest approach for CI/CD - plan and review first, then apply the exact plan that was reviewed.

## Targeting Specific Modules

Sometimes you only want to plan certain modules:

```bash
# Plan only networking modules
terragrunt run-all plan --terragrunt-include-dir "*/vpc" --terragrunt-include-dir "*/subnets"

# Plan everything except monitoring
terragrunt run-all plan --terragrunt-exclude-dir "*/monitoring"

# Plan a specific group of modules
cd live/dev/networking
terragrunt run-all plan
```

## Reducing Noise

With many modules, plan output gets long. Here are strategies to manage it:

### Limit Terragrunt Log Level

```bash
# Only show errors from Terragrunt itself (Terraform output still shows)
terragrunt run-all plan --terragrunt-log-level error
```

### Save Output to File

```bash
# Capture all output for review
terragrunt run-all plan 2>&1 | tee plan-output.txt

# Search for specific changes
grep "will be" plan-output.txt
```

### Use Compact Plan Format

```bash
# Use Terraform's compact plan output
terragrunt run-all plan -compact-warnings
```

## Parallelism Control

By default, independent modules are planned in parallel. Control this with:

```bash
# Plan with limited parallelism (useful for rate limiting)
terragrunt run-all plan --terragrunt-parallelism 2

# Plan sequentially for easier output reading
terragrunt run-all plan --terragrunt-parallelism 1
```

Sequential planning (`--terragrunt-parallelism 1`) makes the output much easier to read since modules do not interleave their output.

## CI/CD Pipeline Pattern

A common CI/CD pattern is to plan on pull requests and apply on merge:

```yaml
# GitHub Actions example
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'live/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Setup Terragrunt
        run: |
          curl -L -o terragrunt https://github.com/gruntwork-io/terragrunt/releases/latest/download/terragrunt_linux_amd64
          chmod +x terragrunt
          sudo mv terragrunt /usr/local/bin/

      - name: Plan dev
        id: plan
        run: |
          cd live/dev
          terragrunt run-all plan --terragrunt-non-interactive 2>&1 | tee plan.txt
        continue-on-error: true

      - name: Comment PR with plan
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('live/dev/plan.txt', 'utf8');
            const truncated = plan.length > 60000 ? plan.substring(0, 60000) + '\n...truncated' : plan;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Terraform Plan\n```\n' + truncated + '\n```'
            });
```

## Detecting Changes

You can check if any module has changes:

```bash
# Plan with -detailed-exitcode
# Exit code 0 = no changes, 1 = error, 2 = changes detected
terragrunt run-all plan -detailed-exitcode

echo $?  # Check exit code
```

This is useful in CI/CD to decide whether to proceed with an apply or skip it.

## Planning with Variable Overrides

Pass extra variables during planning:

```bash
# Override a variable for all modules
terragrunt run-all plan -var="image_tag=v2.0.0"

# Use a specific tfvars file
terragrunt run-all plan -var-file=overrides.tfvars
```

Note that these extra arguments are passed to every module. If a module does not have the specified variable, it will show a warning.

## Common Issues

**Slow plans**: If planning is slow, it is usually because each module initializes independently, downloading providers and modules. Use a provider cache:

```bash
# Set up a shared provider cache
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p $TF_PLUGIN_CACHE_DIR
terragrunt run-all plan
```

**Rate limiting**: Planning many modules against cloud APIs can trigger rate limits. Reduce parallelism:

```bash
terragrunt run-all plan --terragrunt-parallelism 2
```

**Mock output type mismatches**: If your mock outputs do not match the expected types, the plan may fail. Ensure mocks have the correct structure:

```hcl
# Wrong - mock returns a string but module expects a list
mock_outputs = {
  subnet_ids = "subnet-mock"
}

# Correct - mock returns a list
mock_outputs = {
  subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
}
```

## Conclusion

Running plans across multiple modules is one of the first things you will do with Terragrunt's `run-all` command. It gives you visibility into what will change across your entire environment before you commit to any changes. Use mock outputs for first-time plans, control parallelism for readability and rate limiting, and integrate with CI/CD for automated plan reviews on pull requests.

For applying the planned changes, see [How to Use Terragrunt apply-all for Multi-Module Apply](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-apply-all-for-multi-module-apply/view).
