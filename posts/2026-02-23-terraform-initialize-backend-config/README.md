# How to Initialize Terraform Backend with -backend-config

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Backend Configuration, CLI, State Management, Infrastructure as Code

Description: A practical guide to using the terraform init -backend-config flag, covering syntax, file-based configs, multiple flags, reconfiguration, and CI/CD pipeline integration.

---

The `terraform init` command is where your Terraform workflow begins, and the `-backend-config` flag is one of its most important options. It lets you supply backend configuration values at initialization time rather than hardcoding them in your Terraform files. This is essential for keeping secrets out of version control and for reusing the same code across multiple environments.

## The Basics

The `-backend-config` flag comes in two forms:

```bash
# Form 1: Key-value pair
terraform init -backend-config="key=value"

# Form 2: File reference
terraform init -backend-config=path/to/file.hcl
```

You can use either form, and you can use multiple flags in a single command. Terraform merges all the values together along with anything defined in the `backend` block of your configuration.

## Key-Value Pair Syntax

Pass individual values directly on the command line:

```bash
# Pass multiple backend config values
terraform init \
  -backend-config="bucket=my-terraform-state" \
  -backend-config="key=project/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true"
```

This works with any backend. Here is an example with the Azure backend:

```bash
# Azure Blob Storage backend configuration
terraform init \
  -backend-config="storage_account_name=tfstateaccount" \
  -backend-config="container_name=tfstate" \
  -backend-config="access_key=${ARM_ACCESS_KEY}"
```

And the PostgreSQL backend:

```bash
# PostgreSQL backend configuration
terraform init \
  -backend-config="conn_str=postgres://user:pass@host:5432/dbname?sslmode=require"
```

## File-Based Configuration

For more complex setups, put your configuration in a file:

```hcl
# backend-config.hcl
bucket         = "my-terraform-state"
key            = "prod/networking/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"
```

```bash
# Pass the file
terraform init -backend-config=backend-config.hcl
```

The file uses HCL syntax (key-value pairs). It does not need a `terraform` or `backend` block - just the raw key-value pairs.

You can also use JSON format:

```json
{
  "bucket": "my-terraform-state",
  "key": "prod/networking/terraform.tfstate",
  "region": "us-east-1",
  "encrypt": true,
  "dynamodb_table": "terraform-locks"
}
```

```bash
terraform init -backend-config=backend-config.json
```

## Combining Files and Flags

You can use a file for base configuration and override specific values with flags:

```hcl
# base-backend.hcl
bucket         = "my-terraform-state"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"
```

```bash
# Use the base file but override the key for this specific project
terraform init \
  -backend-config=base-backend.hcl \
  -backend-config="key=project-b/terraform.tfstate"
```

When the same key appears in both a file and a command-line flag, the command-line flag takes precedence.

## What Goes in Backend Block vs. -backend-config

A good rule of thumb:

- **In the backend block**: Values that identify the backend type and non-sensitive structural parameters
- **In -backend-config**: Credentials, environment-specific values, and anything sensitive

```hcl
# backend.tf - committed to version control
terraform {
  backend "s3" {
    # These are safe to commit
    key    = "myproject/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# These are provided at runtime
terraform init \
  -backend-config="bucket=${STATE_BUCKET}" \
  -backend-config="dynamodb_table=${LOCK_TABLE}" \
  -backend-config="encrypt=true"
```

## The -reconfigure Flag

When you change backend configuration values, Terraform needs to reinitialize. The `-reconfigure` flag tells Terraform to discard any existing cached backend configuration and use the new values:

```bash
# Switch from one backend configuration to another
terraform init -reconfigure -backend-config=new-config.hcl
```

Without `-reconfigure`, Terraform might use cached values from a previous init and either ignore your new values or ask confusing questions about migration.

## The -migrate-state Flag

If you want to move your state to a new backend location during reconfiguration:

```bash
# Migrate state to a new backend
terraform init -migrate-state -backend-config=new-backend.hcl
```

Terraform will copy the state from the old backend to the new one. This is useful when moving between environments or changing backend storage.

## CI/CD Pipeline Examples

### GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]

jobs:
  apply:
    runs-on: ubuntu-latest
    env:
      # AWS credentials from GitHub Secrets
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: |
          terraform init \
            -backend-config="bucket=${{ vars.TF_STATE_BUCKET }}" \
            -backend-config="key=${{ github.repository }}/terraform.tfstate" \
            -backend-config="region=us-east-1" \
            -backend-config="dynamodb_table=${{ vars.TF_LOCK_TABLE }}"

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        run: terraform apply tfplan
```

### GitLab CI

```yaml
# .gitlab-ci.yml
variables:
  TF_STATE_BUCKET: "terraform-state-prod"
  TF_LOCK_TABLE: "terraform-locks"

stages:
  - init
  - plan
  - apply

terraform-init:
  stage: init
  image: hashicorp/terraform:1.7
  script:
    - terraform init
        -backend-config="bucket=${TF_STATE_BUCKET}"
        -backend-config="key=${CI_PROJECT_NAME}/terraform.tfstate"
        -backend-config="region=us-east-1"
        -backend-config="dynamodb_table=${TF_LOCK_TABLE}"
  artifacts:
    paths:
      - .terraform/
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    environment {
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
    }
    stages {
        stage('Init') {
            steps {
                sh '''
                    terraform init \
                      -backend-config="bucket=${TF_STATE_BUCKET}" \
                      -backend-config="key=${JOB_NAME}/terraform.tfstate" \
                      -backend-config="region=us-east-1"
                '''
            }
        }
        stage('Plan') {
            steps {
                sh 'terraform plan -out=tfplan'
            }
        }
        stage('Apply') {
            steps {
                sh 'terraform apply tfplan'
            }
        }
    }
}
```

## Interactive Prompts

If you do not provide all required backend configuration values, Terraform will prompt you interactively:

```bash
$ terraform init

Initializing the backend...
bucket
  The name of the S3 bucket

  Enter a value: my-terraform-state

region
  The region of the S3 bucket

  Enter a value: us-east-1
```

This can be useful for local development but breaks automated pipelines. The `-input=false` flag disables interactive prompts and causes Terraform to fail if any required values are missing:

```bash
# Fail instead of prompting - good for CI/CD
terraform init -input=false -backend-config=config.hcl
```

## Debugging Backend Configuration

If you are having trouble with your backend configuration, use the `TF_LOG` environment variable to see what Terraform is doing:

```bash
# Enable debug logging
export TF_LOG=DEBUG

# Run init with your config
terraform init -backend-config=config.hcl

# Look for lines containing "backend" in the output
# This shows the merged configuration Terraform is using
```

You can also check the cached backend configuration:

```bash
# The cached config is stored here
cat .terraform/terraform.tfstate

# This shows which backend is configured and its parameters
```

## Common Errors

### "Backend configuration changed"

```
Error: Backend configuration changed

A change in the backend configuration has been detected, which may require
migrating existing state.
```

Fix: Add `-reconfigure` or `-migrate-state`:

```bash
terraform init -reconfigure -backend-config=config.hcl
```

### "Required backend configuration is missing"

```
Error: Required backend configuration is missing
```

Fix: Make sure you are providing all required values. Check the backend documentation for which parameters are mandatory.

### "Failed to get existing workspaces"

This usually means the credentials or permissions are wrong. Verify your credentials work by testing access to the backend storage directly:

```bash
# For S3, test with AWS CLI
aws s3 ls s3://your-state-bucket/

# For Azure, test with az CLI
az storage blob list --account-name your-account --container-name tfstate
```

## Summary

The `-backend-config` flag is the primary mechanism for supplying dynamic and sensitive backend configuration to Terraform. Whether you pass individual key-value pairs, reference configuration files, or combine both approaches, it keeps your code clean and your secrets safe. For CI/CD pipelines, always use `-input=false` to prevent interactive prompts, and use `-reconfigure` when switching between environments. For more background on partial configuration patterns, see our guide on [backend partial configuration in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-backend-partial-configuration/view).
