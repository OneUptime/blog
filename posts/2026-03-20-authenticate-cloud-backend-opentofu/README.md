# How to Authenticate with Cloud Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud Backend, Authentication, Terraform Cloud, API Tokens

Description: Learn how to authenticate OpenTofu with the Terraform Cloud backend using API tokens, environment variables, and CI/CD-specific authentication methods.

## Introduction

Authentication with the Terraform Cloud backend requires an API token that grants access to your organization's workspaces and state. OpenTofu supports multiple ways to supply that token: interactive login, environment variables, credentials files, and CI/CD secret injection. Choosing the right method depends on where OpenTofu runs.

## Authentication Methods Overview

```text
Method                    | Use Case
--------------------------|----------------------------------------
tofu login                | Interactive: developer machines
TF_TOKEN_* env var        | CI/CD: GitHub Actions, GitLab CI
credentials.tfrc.json     | Persistent: shared CI/CD agents
setup-opentofu input      | GitHub Actions
```

## Method 1: Interactive Login

```bash
# Opens browser to generate API token

tofu login

# For Terraform Enterprise (custom hostname)
tofu login tfe.internal.company.com

# What it does:
# 1. Opens app.terraform.io in browser
# 2. Prompts you to create or use existing API token
# 3. Saves token to ~/.terraform.d/credentials.tfrc.json

# Logout
tofu logout
```

## Method 2: Environment Variables

```bash
# Standard Terraform Cloud
export TF_TOKEN_app_terraform_io="your-api-token"

# For Terraform Enterprise
export TF_TOKEN_tfe_internal_company_com="your-tfe-token"
# Note: periods in hostname are replaced with underscores

# Verify authentication
tofu init  # Should succeed without prompting for credentials
```

## Method 3: Credentials File

File: `~/.terraform.d/credentials.tfrc.json`

```json
{
  "credentials": {
    "app.terraform.io": {
      "token": "your-terraform-cloud-api-token"
    },
    "tfe.internal.company.com": {
      "token": "your-tfe-api-token"
    }
  }
}
```

Also settable via the OpenTofu CLI config file, for example `~/.tofurc`:

```hcl
credentials "app.terraform.io" {
  token = "your-token"
}
```

## Method 4: GitHub Actions with a Token Secret

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: '1.11.6'
          # Provide token from GitHub Actions secrets
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: OpenTofu Init
        run: tofu init
```

## Method 5: Team API Tokens

```bash
# Team tokens provide access to all workspaces the team can access
# Generate via: Organization Settings → API Tokens → Team Tokens

# Generate programmatically via API
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/teams/$TEAM_ID/authentication-tokens" \
  -d '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "description": "CI token"
      }
    }
  }'

# Use the team token in CI/CD
export TF_TOKEN_app_terraform_io="team-token-value"
```

## Method 6: Organization Tokens

```bash
# Organization tokens are for organization-level administration
# They cannot start runs or create configuration versions
# Use for administrative scripts, not regular deployments

curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-company/authentication-token" \
  -d '{
    "data": {
      "type": "authentication-token"
    }
  }'
```

## Token Types and Permissions

```text
Token Type         | Scope                     | Recommended For
-------------------|---------------------------|------------------
User Token         | User's permissions        | Developer machines
Team Token         | Team's workspaces         | CI/CD pipelines
Organization Token | Org-level admin only      | Admin scripts
```

## Workspace-Specific Access

```bash
# HCP Terraform/OpenTofu CLI does not expose a separate workspace token type
# For least privilege, use a team token from a team that only has access
# to the target workspace
export TF_TOKEN_app_terraform_io="team-token-value"
tofu init  # Uses the workspace permissions granted to that team
```

## CI/CD Secret Management

```text
# GitHub Actions: store token as secret
# Settings → Secrets → Actions → New repository secret: TF_API_TOKEN

- uses: opentofu/setup-opentofu@v1
  with:
    cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

# GitLab CI: use CI/CD variables
# Settings → CI/CD → Variables: TF_TOKEN_app_terraform_io

variables:
  TF_TOKEN_app_terraform_io: $TF_API_TOKEN

# Jenkins: use credentials binding
withCredentials([string(credentialsId: 'tf-cloud-token', variable: 'TF_TOKEN')]) {
  sh 'export TF_TOKEN_app_terraform_io=$TF_TOKEN && tofu apply'
}
```

## Verifying Authentication

```bash
# Test backend authentication
tofu init  # Should complete without prompting for credentials

# Test API access directly
curl -H "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/account/details" | \
  jq -r '.data.attributes.username'
```

## Token Rotation

```bash
# Rotate tokens periodically for security
# 1. Generate new token in Terraform Cloud UI or API
# 2. Update secret in CI/CD system
# 3. Revoke old token

# Revoke a team or user token by token ID
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://app.terraform.io/api/v2/authentication-tokens/$TOKEN_ID"

# Organization tokens are revoked by organization name:
# DELETE /api/v2/organizations/my-company/authentication-token
```

## Conclusion

For developer machines, use `tofu login` to store credentials interactively. For CI/CD pipelines, use the `TF_TOKEN_app_terraform_io` environment variable set from a secrets manager - team tokens for shared pipelines, and team tokens scoped to a single workspace when you need the narrowest practical access. The `opentofu/setup-opentofu` GitHub Actions action accepts a `cli_config_credentials_token` parameter that handles credential file creation automatically, making it the simplest authentication method for GitHub Actions workflows.
