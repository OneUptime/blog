# How to Pass Backend Credentials via Environment Variables in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend

Description: Learn how to pass backend credentials to OpenTofu using environment variables, keeping secrets out of configuration files and source control.

## Introduction

Hardcoding credentials in backend configuration is a security risk. OpenTofu backends respect standard cloud provider environment variables (such as `AWS_*`, `ARM_*`, `GOOGLE_APPLICATION_CREDENTIALS`, and `TF_HTTP_*`), allowing secrets to be injected at runtime from CI/CD systems, secrets managers, or shell profiles.

## S3 Backend: AWS Credentials

```hcl
# backend.tf - no credentials

terraform {
  backend "s3" {
    bucket = "acme-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Standard AWS credential environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_SESSION_TOKEN="..."         # For temporary credentials
export AWS_PROFILE="production"        # Or use a named profile

tofu init
```

## S3 Backend: IAM Role via Environment

```bash
# Assume role and export credentials
export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/TofuStateRole"
export AWS_WEB_IDENTITY_TOKEN_FILE="/var/run/secrets/token"  # IRSA

tofu init
```

## Azure Backend: Service Principal

```bash
# ARM_ prefix variables for Azure backend
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"

tofu init
```

## GCS Backend: Application Default Credentials

```bash
# Use ADC - works for service accounts, Workload Identity, and local dev
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa-key.json"

# Or use gcloud login for local development
gcloud auth application-default login

tofu init
```

## PostgreSQL Backend: Connection String via Environment

```bash
# Standard libpq environment variables
export PGUSER="tofu_user"
export PGPASSWORD="your-password"
export PGHOST="postgresql.acme-corp.com"
export PGPORT="5432"
export PGDATABASE="terraform_state"

tofu init
```

## Consul Backend: Access Token

```bash
export CONSUL_HTTP_TOKEN="your-consul-token"
export CONSUL_HTTP_ADDR="consul.acme-corp.com:8500"

tofu init
```

## HTTP Backend: Credentials

```bash
export TF_HTTP_USERNAME="tofu"
export TF_HTTP_PASSWORD="your-password"
export TF_HTTP_ADDRESS="https://state.acme-corp.com/terraform/production"

tofu init
```

## GitHub Actions: Injecting Credentials

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Init
        run: tofu init
        # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
        # are set automatically by the configure-aws-credentials action
```

## Secrets Manager Integration

```bash
# Fetch credentials from AWS Secrets Manager at runtime
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "tofu/backend-credentials" \
  --query SecretString \
  --output text)

export PGPASSWORD=$(echo $SECRET | jq -r '.pg_password')
export TF_HTTP_PASSWORD=$(echo $SECRET | jq -r '.http_password')

tofu init
```

## Combining Environment Variables with Partial Config

```bash
# Environment provides credentials; config file provides structure
export AWS_PROFILE="production"

tofu init -backend-config=backends/production.hcl
```

## Conclusion

Backend credentials should always be passed via environment variables, never hardcoded in configuration files. Each backend type has established conventions: AWS uses `AWS_*` variables, Azure uses `ARM_*` variables, GCS uses `GOOGLE_APPLICATION_CREDENTIALS` or ADC, and PostgreSQL uses standard `PG*` variables. In CI/CD pipelines, use OIDC-based authentication where available to avoid managing long-lived secrets entirely.
