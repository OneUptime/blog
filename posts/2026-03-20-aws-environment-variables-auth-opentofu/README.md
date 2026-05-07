# How to Authenticate with AWS Using Environment Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Environment Variable, Authentication, CI/CD

Description: Learn how to configure AWS authentication in OpenTofu using environment variables, the most portable method for CI/CD pipelines and local development.

## Introduction

Environment variables are the most portable authentication method for OpenTofu with AWS. They require no changes to your HCL configuration and work identically across local development, GitHub Actions, GitLab CI, Jenkins, and any other environment.

## Standard AWS Environment Variables

```bash
# Long-term access key credentials

export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# For temporary credentials (from STS AssumeRole or AWS SSO)
export AWS_SESSION_TOKEN="AQoXnyc4lcK4w4OIAAAAAAAc..."

# Set the default region
export AWS_DEFAULT_REGION="us-east-1"
```

With these variables set, the AWS provider requires no explicit configuration:

```hcl
provider "aws" {
  # Region can also come from AWS_DEFAULT_REGION or AWS_REGION
  # No credentials needed here - they come from environment variables
}
```

## Using AWS SSO with Environment Variables

When using AWS IAM Identity Center (SSO), export temporary credentials:

```bash
# Login with SSO
aws sso login --profile my-sso-profile

# Export temporary credentials for the OpenTofu process
eval $(aws configure export-credentials --profile my-sso-profile --format env)

# Now run OpenTofu
tofu plan
```

The `export-credentials` command sets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` automatically.

## GitHub Actions Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v6

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          # Use OIDC (preferred) instead of static keys
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.11.6"

      - run: tofu init
      - run: tofu apply -auto-approve
```

The `configure-aws-credentials` action sets the standard environment variables; OpenTofu picks them up automatically.

## GitLab CI Configuration

```yaml
# .gitlab-ci.yml
variables:
  AWS_DEFAULT_REGION: "us-east-1"
  # Define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN
  # as masked CI/CD variables in GitLab's UI; jobs inherit them automatically.

deploy:
  stage: deploy
  image: ghcr.io/opentofu/opentofu:1.11.6
  script:
    - tofu init
    - tofu apply -auto-approve
  environment:
    name: production
```

## Priority of Authentication Methods

The AWS provider checks for credentials in this order:

```mermaid
flowchart TD
    A[Parameters in provider configuration] --> B[Environment variables]
    B --> C[Shared credentials files]
    C --> D[Shared configuration files]
    D --> E[Container credentials]
    E --> F[Instance profile credentials and Region]
```

Environment variables take precedence over credential files and instance metadata, which makes them reliable for CI overrides.

## Security Best Practices

**Never hardcode credentials in `.tf` files.** OpenTofu recommends using environment variables to keep provider credentials out of your version-controlled OpenTofu code.

**Use short-lived credentials.** Prefer OIDC or assumed roles over long-term access keys. If you must use long-term access keys, rotate them regularly and scope their permissions as narrowly as possible.

**Mask credentials in CI.** Configure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as masked/secret variables in your CI platform so they never appear in logs.

**Use separate credentials per environment.** Production deployments should use a different IAM user or role than development.

## Conclusion

Environment variables are the most flexible and portable way to authenticate OpenTofu with AWS. Combine them with OIDC authentication in GitHub Actions or IAM instance profiles for production workloads-eliminating long-lived static credentials entirely.
