# How to Use the get_env Function in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Environment Variable, CI/CD

Description: Learn how to use the get_env function in Terragrunt to read environment variables, set defaults, and integrate with CI/CD pipelines for dynamic configuration.

---

The `get_env()` function in Terragrunt reads environment variables at configuration time. It is a simple function, but it opens up a lot of flexibility - especially when you need to inject values from CI/CD pipelines, use different settings per developer, or keep secrets out of your configuration files.

## Basic Syntax

The function takes one or two arguments:

```hcl
# With a default value - returns the default if the variable is not set
get_env("VARIABLE_NAME", "default_value")

# Without a default - Terragrunt errors if the variable is not set
get_env("VARIABLE_NAME")
```

Here is a simple example:

```hcl
# live/dev/app/terragrunt.hcl

terraform {
  source = "../../../modules/app"
}

inputs = {
  # Use the IMAGE_TAG env var, defaulting to "latest"
  image_tag = get_env("IMAGE_TAG", "latest")
}
```

If you run:

```bash
# Without setting IMAGE_TAG
terragrunt plan
# image_tag will be "latest"

# With IMAGE_TAG set
IMAGE_TAG=v1.2.3 terragrunt plan
# image_tag will be "v1.2.3"
```

## Required vs Optional Environment Variables

When you call `get_env()` without a default, Terragrunt will throw an error if the variable is not set:

```hcl
inputs = {
  # This will ERROR if DATABASE_PASSWORD is not set
  database_password = get_env("DATABASE_PASSWORD")

  # This will use "latest" as fallback - never errors
  image_tag = get_env("IMAGE_TAG", "latest")
}
```

Use the no-default version when a value absolutely must come from the environment (like secrets or deployment-specific identifiers). Use the default version for values that have a reasonable fallback.

## Common Use Cases

### CI/CD Pipeline Integration

The most common use of `get_env()` is pulling values from CI/CD pipelines:

```hcl
# live/dev/app/terragrunt.hcl

locals {
  # Values injected by the CI/CD pipeline
  image_tag  = get_env("CI_COMMIT_SHA", "latest")
  build_id   = get_env("CI_PIPELINE_ID", "local")
  deploy_env = get_env("DEPLOY_ENVIRONMENT", "dev")
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  container_image = "my-registry.com/app:${local.image_tag}"
  build_id        = local.build_id
  environment     = local.deploy_env

  tags = {
    DeployedBy = get_env("CI_PIPELINE_URL", "manual")
    GitCommit  = local.image_tag
  }
}
```

In your CI/CD pipeline (GitHub Actions example):

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      CI_COMMIT_SHA: ${{ github.sha }}
      CI_PIPELINE_ID: ${{ github.run_id }}
      CI_PIPELINE_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      DEPLOY_ENVIRONMENT: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: |
          cd live/prod/app
          terragrunt apply -auto-approve
```

### AWS Account Selection

Use environment variables to switch between AWS accounts without changing configuration files:

```hcl
# live/terragrunt.hcl (root)

locals {
  # Allow overriding the AWS profile via environment
  aws_profile = get_env("AWS_PROFILE", "default")
  aws_region  = get_env("AWS_REGION", "us-east-1")
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region  = "${local.aws_region}"
  profile = "${local.aws_profile}"
}
EOF
}
```

Now developers can switch profiles:

```bash
# Use the dev account
AWS_PROFILE=dev-account terragrunt plan

# Use the staging account
AWS_PROFILE=staging-account terragrunt plan
```

### Secrets and Sensitive Values

Never hardcode secrets in Terragrunt files. Use `get_env()` to pull them from the environment:

```hcl
inputs = {
  # Database credentials from environment
  db_master_username = get_env("DB_USERNAME")
  db_master_password = get_env("DB_PASSWORD")

  # API keys
  datadog_api_key   = get_env("DATADOG_API_KEY")
  pagerduty_api_key = get_env("PAGERDUTY_API_KEY")
}
```

These can be set in your CI/CD pipeline using secrets management, or locally via a `.envrc` file (if you use direnv):

```bash
# .envrc (not committed to git)
export DB_USERNAME="admin"
export DB_PASSWORD="super-secret-password"
export DATADOG_API_KEY="dd-api-key-here"
```

### Feature Flags

Control infrastructure features via environment variables:

```hcl
locals {
  # Feature flags controlled by environment
  enable_monitoring = get_env("ENABLE_MONITORING", "true") == "true"
  enable_waf        = get_env("ENABLE_WAF", "false") == "true"
  debug_mode        = get_env("DEBUG_MODE", "false") == "true"
}

inputs = {
  enable_monitoring = local.enable_monitoring
  enable_waf        = local.enable_waf
  log_level         = local.debug_mode ? "DEBUG" : "INFO"
}
```

Note that `get_env()` always returns a string. If you need a boolean, compare the string value as shown above.

### Dynamic Terraform Parallelism

```hcl
terraform {
  source = "../../../modules/vpc"

  extra_arguments "parallelism" {
    commands = ["plan", "apply"]
    # Allow CI/CD to control parallelism for rate limiting
    arguments = ["-parallelism=${get_env("TF_PARALLELISM", "10")}"]
  }
}
```

## Type Handling

Since `get_env()` always returns a string, you need to handle type conversions manually when passing values to Terraform variables that expect other types:

```hcl
locals {
  # String to number
  instance_count = tonumber(get_env("INSTANCE_COUNT", "2"))

  # String to boolean
  enable_ha = get_env("ENABLE_HA", "false") == "true"

  # String to list (comma-separated)
  allowed_cidrs = split(",", get_env("ALLOWED_CIDRS", "10.0.0.0/8,172.16.0.0/12"))
}

inputs = {
  instance_count = local.instance_count
  enable_ha      = local.enable_ha
  allowed_cidrs  = local.allowed_cidrs
}
```

## Environment-Specific Defaults

Combine `get_env()` with other Terragrunt features for environment-specific behavior:

```hcl
locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment

  # Default values that differ by environment
  default_instance_type = local.environment == "prod" ? "m5.xlarge" : "t3.small"
  default_min_capacity  = local.environment == "prod" ? "3" : "1"
}

inputs = {
  # Environment variable overrides the environment-based default
  instance_type = get_env("INSTANCE_TYPE", local.default_instance_type)
  min_capacity  = tonumber(get_env("MIN_CAPACITY", local.default_min_capacity))
}
```

This pattern gives you sensible defaults per environment while still allowing overrides through environment variables.

## Using with direnv

The `direnv` tool is a natural companion for `get_env()`. It automatically loads and unloads environment variables based on your current directory:

```bash
# live/dev/.envrc
export AWS_PROFILE="dev-account"
export DEPLOY_ENVIRONMENT="dev"
export TF_PARALLELISM="10"
```

```bash
# live/prod/.envrc
export AWS_PROFILE="prod-account"
export DEPLOY_ENVIRONMENT="prod"
export TF_PARALLELISM="5"
```

When you `cd` into a directory, `direnv` loads the appropriate `.envrc`. Your Terragrunt configuration picks up the values via `get_env()`. Add `.envrc` to your `.gitignore` or use `.envrc.example` as a template.

## Debugging

To check what `get_env()` resolves to, you have a few options:

```bash
# Print the environment variable before running Terragrunt
echo $IMAGE_TAG
terragrunt plan

# Use render-json to see resolved values
terragrunt render-json | jq '.inputs'

# Set environment variables inline for testing
IMAGE_TAG=test DB_PASSWORD=test terragrunt render-json | jq '.inputs'
```

## Security Considerations

Be aware that `get_env()` values end up as `TF_VAR_*` environment variables when Terraform runs. This means:

- They may appear in process listings (`ps aux`)
- They are visible in CI/CD logs if you are not careful
- They are stored in the Terraform state if used as resource attributes

For highly sensitive values, consider using Terraform's native secrets management (like `aws_secretsmanager_secret` data sources) instead of passing secrets through environment variables.

## Conclusion

The `get_env()` function bridges the gap between your runtime environment and your infrastructure configuration. It is essential for CI/CD integration, secrets management, developer-specific overrides, and feature flags.

Keep in mind that it always returns strings - convert types as needed. Use defaults for values that have reasonable fallbacks, and omit defaults for values that must be explicitly provided. Combined with tools like `direnv`, it creates a smooth workflow for managing infrastructure across different environments and contexts.

For more Terragrunt functions, see [How to Use Terragrunt Functions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-functions/view).
