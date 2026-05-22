# How to Use Terragrunt with CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, CI/CD, DevOps, Infrastructure as Code, Automation

Description: Learn how to integrate Terragrunt into CI/CD pipelines for automated infrastructure deployment, covering plan-on-PR workflows, apply-on-merge strategies, and production safeguards.

---

Running Terragrunt locally works fine when you're a team of one. But once multiple engineers are making infrastructure changes, you need a CI/CD pipeline to enforce reviews, run plans automatically, and apply changes in a controlled way. This post covers the patterns and practical considerations for running Terragrunt in CI/CD, regardless of which platform you use.

## The Standard Workflow

The most common pattern for Terragrunt in CI/CD follows the same flow as Terraform:

1. Engineer opens a pull request with infrastructure changes
2. CI runs `terragrunt plan` and posts the output as a PR comment
3. Team reviews the plan alongside the code
4. After merge to main, CD runs `terragrunt apply`

The difference with Terragrunt is that you're often dealing with multiple modules, dependencies between them, and generated configurations. This adds some wrinkles to the pipeline.

## Detecting Changed Modules

The first challenge is figuring out which modules need to run. You don't want to plan every module in the repo on every PR - that's slow and noisy. Terragrunt has built-in support for this:

```bash
# Only plan modules that changed or whose dependencies changed
terragrunt run --all --filter-affected -- plan
```

A more practical approach is to combine Terragrunt's built-in change detection with an environment directory:

```bash
# Plan all modules in a specific environment that have changes
cd environments/dev
terragrunt run --all \
  --filter-affected \
  --non-interactive \
  --parallelism 4 \
  -- plan
```

For large repos, you can write a script that maps changed files to affected Terragrunt modules:

```bash
#!/bin/bash
# detect-changes.sh - Find Terragrunt modules affected by changes

# Get list of changed files compared to main branch
CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

# Find all terragrunt.hcl files in changed directories
AFFECTED_MODULES=""
for file in $CHANGED_FILES; do
  dir=$(dirname "$file")
  # Walk up the directory tree looking for terragrunt.hcl
  while [ "$dir" != "." ]; do
    if [ -f "$dir/terragrunt.hcl" ]; then
      AFFECTED_MODULES="$AFFECTED_MODULES $dir"
      break
    fi
    dir=$(dirname "$dir")
  done
done

# Remove duplicates and print
echo "$AFFECTED_MODULES" | tr ' ' '\n' | sort -u
```

## Pipeline Configuration Basics

Here's a generic pipeline structure that works across most CI systems:

```yaml
# Pseudo-pipeline configuration
stages:
  - validate
  - plan
  - apply

validate:
  stage: validate
  script:
    # Validate all changed modules
    - terragrunt run --all --filter '[main...HEAD]' --non-interactive -- validate

plan:
  stage: plan
  script:
    # Generate native and JSON plan files per unit
    - terragrunt run --all --filter-affected --non-interactive --out-dir tfplans --json-out-dir plan-json -- plan

apply:
  stage: apply
  # Only run on main branch after merge
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  script:
    - terragrunt run --all --non-interactive -- apply
```

## Handling Credentials

CI/CD pipelines need cloud credentials but shouldn't have long-lived access keys sitting in environment variables. Here are the recommended approaches for each major cloud:

### AWS - OIDC Federation

```bash
# Configure OIDC provider in your AWS account first, then in CI:
export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/CI-TerraformRole"
export AWS_WEB_IDENTITY_TOKEN_FILE="/tmp/oidc-token"

# Most CI systems provide the OIDC token automatically
# Terragrunt/Terraform will use STS AssumeRoleWithWebIdentity
```

### GCP - Workload Identity Federation

```bash
# Set the credential file from workload identity
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/gcp-credentials.json"
```

### Azure - Service Principal or Managed Identity

```bash
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."
```

## Managing State Locking in CI

When multiple PRs trigger plans simultaneously, state locking becomes important. Terragrunt inherits Terraform's locking behavior, but there are some CI-specific considerations:

```bash
# For plan operations, use -lock=false only if you get frequent lock conflicts
# and you know no concurrent apply can target the same state
terragrunt run --all \
  --non-interactive \
  --parallelism 2 \
  -- plan -lock=false

# For apply, always keep locking enabled (it's the default)
terragrunt run --all \
  --non-interactive \
  --parallelism 1 \
  -- apply
```

## Caching in CI Pipelines

Terragrunt downloads providers and modules on every run, which can slow down pipelines significantly. For `run --all`, use Terragrunt's provider cache server instead of setting Terraform's shared plugin cache directly:

```bash
# Enable Terragrunt's provider cache server
export TG_PROVIDER_CACHE=1
export TG_PROVIDER_CACHE_DIR="/tmp/terragrunt-provider-cache"

# In your CI config, cache this directory between runs
# Also cache the Terragrunt download directory
export TG_DOWNLOAD_DIR="/tmp/terragrunt-cache"
```

Most CI platforms let you cache directories between pipeline runs. Cache `$TG_PROVIDER_CACHE_DIR` and you'll save minutes on each run.

## Plan Output as PR Comments

Posting plan output directly on the PR is the best way to get reviews. Here's a shell script that formats the output:

````bash
#!/bin/bash
# post-plan-comment.sh - Format and post plan output to PR

PLAN_OUTPUT=$(terragrunt run --all --filter-affected --non-interactive -- plan -no-color 2>&1)
EXIT_CODE=$?

# Truncate if too long for PR comment (GitHub has a 65536 char limit)
if [ ${#PLAN_OUTPUT} -gt 60000 ]; then
  PLAN_OUTPUT="${PLAN_OUTPUT:0:60000}

... (output truncated, see full log in CI)"
fi

# Format as markdown
COMMENT="## Terragrunt Plan Output

```
$PLAN_OUTPUT
```

Exit code: $EXIT_CODE"

# Post to PR using your CI platform's API
# (GitHub example using gh CLI)
gh pr comment "$PR_NUMBER" --body "$COMMENT"
````

## Environment Promotion Pattern

A common CI/CD pattern is promoting changes through environments. With Terragrunt, this often means applying to dev first, then staging, then production:

```bash
# Stage 1: Apply to dev
cd environments/dev
terragrunt run --all --non-interactive -- apply

# Stage 2: Run integration tests
./run-integration-tests.sh dev

# Stage 3: Apply to staging (manual approval gate recommended)
cd environments/staging
terragrunt run --all --non-interactive -- apply

# Stage 4: Apply to production (always require manual approval)
cd environments/prod
terragrunt run --all --non-interactive -- apply
```

## Handling run --all Failures

When using `run --all`, a failure in one module stops dependent modules but doesn't stop independent ones by default. In CI, you often want deterministic output and no retry delays:

```bash
# Run modules one at a time and don't retry transient failures
terragrunt run --all \
  --non-interactive \
  --parallelism 1 \
  --no-auto-retry \
  -- plan
```

You can also use `--queue-ignore-errors` if you want remaining modules to keep going even when one module fails.

## Security Considerations

A few things to keep in mind when running Terragrunt in CI:

- Never log the full plan output to public build logs - it may contain sensitive values
- Use `--no-color` for cleaner log output
- Set `--non-interactive` to prevent pipelines from hanging on prompts
- Consider running `plan` and `apply` as separate pipeline stages with an approval gate
- Use short-lived credentials via OIDC rather than static access keys

```bash
# Standard CI flags for Terragrunt
export TF_IN_AUTOMATION=true
export TF_INPUT=false

terragrunt run --all \
  --non-interactive \
  --no-color \
  -- apply
```

## Timeouts and Retries

Infrastructure operations can be slow. Configure appropriate timeouts in your CI system and use Terragrunt's retry features:

```hcl
# terragrunt.hcl - Configure automatic retries
errors {
  retry "transient_errors" {
    retryable_errors = [
      "(?s).*Error creating.*timeout.*",
      "(?s).*Error waiting.*status.*",
      "(?s).*rate exceeded.*"
    ]

    max_attempts       = 3
    sleep_interval_sec = 30
  }
}
```

## Summary

Running Terragrunt in CI/CD comes down to a few key principles: detect what changed, plan on PRs, apply on merge, and use short-lived credentials. The `run --all` command handles dependency ordering automatically, and with proper caching, pipelines stay reasonably fast. In the next posts, we'll cover specific implementations for [GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-github-actions/view) and [GitLab CI](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-gitlab-ci/view).
