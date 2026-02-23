# How to Use the hashicorp/setup-terraform GitHub Action

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, CI/CD, HashiCorp, DevOps, Infrastructure as Code

Description: Learn how to configure and use the official hashicorp/setup-terraform GitHub Action for version management, CLI wrapper features, and Terraform Cloud integration.

---

The `hashicorp/setup-terraform` action is the official way to install and configure Terraform in GitHub Actions workflows. It does more than just download the binary - it handles version management, configures the CLI wrapper for output parsing, and sets up Terraform Cloud credentials. Most Terraform GitHub Actions workflows start with this action, but many teams do not take advantage of its full feature set.

This post covers everything the action can do and how to configure it for different scenarios.

## Basic Setup

At its simplest, the action installs a specific version of Terraform:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan
```

If you do not specify a version, the action installs the latest stable release. Pinning to a specific version is recommended for reproducible builds.

## Version Management

The `terraform_version` input supports several formats:

```yaml
# Exact version
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "1.7.5"

# Latest patch of a minor version
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "~1.7.0"

# Latest stable version (not recommended for production)
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "latest"
```

A good practice is to match the version your team uses locally. You can read it from your `.terraform-version` file:

```yaml
steps:
  - uses: actions/checkout@v4

  # Read version from .terraform-version file
  - name: Read Terraform version
    id: tf_version
    run: echo "version=$(cat .terraform-version)" >> $GITHUB_OUTPUT

  - uses: hashicorp/setup-terraform@v3
    with:
      terraform_version: ${{ steps.tf_version.outputs.version }}
```

## The CLI Wrapper

By default, the action installs a wrapper script around the Terraform binary. This wrapper does two things:

1. Captures stdout and stderr from Terraform commands
2. Exposes the output through step outputs (`stdout`, `stderr`, `exitcode`)

This is incredibly useful for workflows that need to process Terraform output:

```yaml
steps:
  - uses: hashicorp/setup-terraform@v3

  - name: Terraform Init
    run: terraform init

  - name: Terraform Plan
    id: plan
    run: terraform plan -no-color
    continue-on-error: true

  # The wrapper makes plan output available as a step output
  - name: Comment PR with plan
    if: github.event_name == 'pull_request'
    uses: actions/github-script@v7
    with:
      script: |
        const output = `#### Terraform Plan
        \`\`\`
        ${{ steps.plan.outputs.stdout }}
        \`\`\`
        *Exit code: ${{ steps.plan.outputs.exitcode }}*`;

        github.rest.issues.createComment({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: output
        });
```

### When to Disable the Wrapper

The wrapper can cause issues in some situations. If you are piping Terraform output to other commands or using `-json` output format, the wrapper may interfere:

```yaml
# Disable the wrapper when using JSON output or piping
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_wrapper: false

# Now you can safely pipe JSON output
- name: Get outputs
  run: terraform output -json | jq '.vpc_id.value'
```

Disable the wrapper when:
- You are parsing JSON output with `jq` or similar tools
- You are piping Terraform output to another command
- You need the raw exit code without wrapper interference
- You are using Terragrunt or other Terraform wrappers

## Terraform Cloud Integration

The action can configure Terraform Cloud credentials automatically:

```yaml
- uses: hashicorp/setup-terraform@v3
  with:
    cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
    cli_config_credentials_hostname: "app.terraform.io"
```

This creates a `.terraformrc` file with the credentials, so `terraform init` can connect to Terraform Cloud for remote state and operations:

```yaml
# Full workflow with Terraform Cloud
name: Terraform Cloud

on:
  push:
    branches: [main]
  pull_request:

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan
        # With remote backend, this triggers a remote plan in Terraform Cloud
```

For Terraform Enterprise with a custom hostname:

```yaml
- uses: hashicorp/setup-terraform@v3
  with:
    cli_config_credentials_token: ${{ secrets.TFE_TOKEN }}
    cli_config_credentials_hostname: "tfe.mycompany.com"
```

## Multi-Environment Workflows

Use matrix strategies to run Terraform across multiple environments:

```yaml
name: Terraform Multi-Environment

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
      # Do not cancel other environments if one fails
      fail-fast: false
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init -backend-config="environments/${{ matrix.environment }}/backend.hcl"
        working-directory: infrastructure

      - name: Terraform Plan
        run: terraform plan -var-file="environments/${{ matrix.environment }}/terraform.tfvars"
        working-directory: infrastructure
```

## Caching Terraform Providers

Provider downloads can be slow. Cache them to speed up your workflows:

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: hashicorp/setup-terraform@v3
    with:
      terraform_version: "1.7.5"

  # Cache the Terraform plugin directory
  - name: Cache Terraform providers
    uses: actions/cache@v4
    with:
      path: |
        ~/.terraform.d/plugin-cache
        .terraform/providers
      key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}
      restore-keys: |
        terraform-providers-

  - name: Terraform Init
    run: terraform init
    env:
      TF_PLUGIN_CACHE_DIR: ~/.terraform.d/plugin-cache
```

## Handling Plan Output Safely

Terraform plan output can contain sensitive values. Handle it carefully in PR comments:

```yaml
- name: Terraform Plan
  id: plan
  run: terraform plan -no-color -input=false
  continue-on-error: true

- name: Update PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  env:
    PLAN: ${{ steps.plan.outputs.stdout }}
  with:
    script: |
      // Truncate long plans to avoid GitHub API limits
      const MAX_LENGTH = 60000;
      let plan = process.env.PLAN || '';
      if (plan.length > MAX_LENGTH) {
        plan = plan.substring(0, MAX_LENGTH) + '\n\n... Plan output truncated ...';
      }

      const body = `#### Terraform Plan Output
      <details>
      <summary>Click to expand</summary>

      \`\`\`terraform
      ${plan}
      \`\`\`

      </details>

      **Exit code:** \`${{ steps.plan.outputs.exitcode }}\``;

      // Find existing comment to update instead of creating new ones
      const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
      });

      const botComment = comments.find(c =>
        c.body.includes('Terraform Plan Output')
      );

      if (botComment) {
        await github.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: botComment.id,
          body: body,
        });
      } else {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          body: body,
        });
      }
```

## Common Issues and Solutions

**Issue: "terraform: command not found"**
The setup action adds Terraform to the PATH, but if you are running commands in a different shell context (like a Docker container), the path may not be available. Use the full path or ensure the PATH is propagated.

**Issue: Wrapper causes JSON parsing errors**
Set `terraform_wrapper: false` when using `-json` output.

**Issue: Version conflict with .terraform-version**
The setup action version takes precedence. Either read from the file (shown above) or remove the explicit version input.

**Issue: Terraform Cloud rate limits**
For organizations with many repositories, concurrent runs may hit API rate limits. Use concurrency groups to limit parallel runs:

```yaml
concurrency:
  group: terraform-${{ github.ref }}
  cancel-in-progress: false
```

## Conclusion

The `hashicorp/setup-terraform` action is the foundation of most Terraform CI/CD workflows on GitHub. Its CLI wrapper feature makes it straightforward to capture and display plan output in pull requests. Combined with Terraform Cloud credential configuration, it provides a smooth path from local development to automated deployments. Pin your version, cache your providers, and use the wrapper outputs to give your team visibility into every infrastructure change.

For adding plan output to pull requests, see our guide on [adding Terraform plan comments to PRs](https://oneuptime.com/blog/post/2026-02-23-how-to-add-terraform-plan-comments-to-pull-requests/view).
