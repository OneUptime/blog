# How to Pass Variables via the CLI with -var in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, CLI, -var flag, Infrastructure as Code, DevOps

Description: Learn how to pass OpenTofu input variables directly from the command line using the -var flag for quick overrides and scripting.

---

The `-var` flag lets you pass variable values directly on the command line without modifying any files. It's ideal for quick overrides, CI/CD pipelines where values come from environment secrets, and one-off deployments with specific parameters.

---

## Basic -var Usage

```bash
# Pass a single string variable

tofu plan -var="region=us-west-2"

# Pass a number variable
tofu plan -var="instance_count=3"

# Pass a boolean variable
tofu plan -var="enable_monitoring=true"

# Multiple -var flags
tofu apply \
  -var="region=us-west-2" \
  -var="instance_count=3" \
  -var="environment=production"
```

---

## Passing Complex Types via -var

```bash
# Pass a list (JSON syntax required for complex types)
tofu plan -var='allowed_ports=["80","443","22"]'

# Pass a map
tofu plan -var='tags={"Environment":"prod","Team":"platform"}'

# Pass an object
tofu plan -var='server_config={"instance_type":"t3.large","disk_size_gb":100}'
```

---

## Combining -var with Other Input Methods

```bash
# -var overrides .tfvars file values
# Precedence (highest to lowest): command-line -var/-var-file (last specified wins) > *.auto.tfvars > terraform.tfvars > TF_VAR_ env vars
tofu plan \
  -var-file="defaults.tfvars" \    # base configuration
  -var="region=us-east-1"          # later -var overrides the region from the file
```

---

## Using -var in Scripts

```bash
#!/bin/bash
# deploy.sh - parameterized deployment script

ENVIRONMENT="${1:-development}"
REGION="${2:-us-east-1}"
IMAGE_TAG="${3:-latest}"

echo "Deploying to $ENVIRONMENT in $REGION with image $IMAGE_TAG"

tofu apply \
  -var="environment=$ENVIRONMENT" \
  -var="region=$REGION" \
  -var="app_image_tag=$IMAGE_TAG" \
  -auto-approve

echo "Deployment complete"
```

---

## -var for Sensitive Values in CI/CD

In CI/CD pipelines, use `-var` to pass secrets from the pipeline's secret store:

```yaml
# GitHub Actions example
- name: Deploy infrastructure
  env:
    TF_VAR_DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: |
    # Use environment variable instead of -var for secrets
    # (so the value doesn't appear in command history)
    tofu apply \
      -var="environment=production" \
      -var="region=${{ vars.AWS_REGION }}" \
      -auto-approve
    # DB_PASSWORD is passed via TF_VAR_ env var, not -var flag
```

---

## When -var Takes Effect

```bash
# -var works with all these commands
tofu plan -var="region=us-east-1"
tofu apply -var="region=us-east-1"
tofu destroy -var="region=us-east-1"
tofu import -var="region=us-east-1" aws_instance.web i-123456

# OpenTofu also accepts -var on tofu init and tofu validate, primarily
# for variables referenced in module sources or backend configuration:
tofu init -var="region=us-east-1"
tofu validate -var="region=us-east-1"
```

---

## Summary

The `-var` flag is the most direct way to override individual variable values without modifying any files. It's best used in scripts and CI/CD pipelines where values come from external sources. For sensitive values, prefer the `TF_VAR_` environment variable approach over `-var` to avoid exposing secrets in shell history and process listings.
