# How to Use API Tokens in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, API Tokens, Authentication, Automation, Security

Description: A comprehensive guide to creating, managing, and securing API tokens in HCP Terraform for automation and CI/CD integrations.

---

API tokens are the keys to automating anything in HCP Terraform. Whether you are integrating with CI/CD pipelines, scripting workspace management, or building custom tooling around your Terraform workflows, you need to understand how tokens work, which type to use, and how to keep them secure.

HCP Terraform offers three types of API tokens, each designed for different use cases. Picking the wrong one can either leave you with too little access or too much. Let us break down each type and how to use them properly.

## The Three Types of API Tokens

### 1. User API Tokens

User tokens inherit all the permissions of the user who created them. If you are an organization owner, your user token has owner-level access. If you are a regular team member, the token has whatever access your teams grant you.

**When to use**: Personal scripting, local development, Terraform CLI authentication.

```bash
# Generate a user token via the CLI
terraform login

# This opens a browser window to app.terraform.io
# After authorizing, the token is stored in ~/.terraform.d/credentials.tfrc.json
```

The stored credentials file looks like this:

```json
{
  "credentials": {
    "app.terraform.io": {
      "token": "your-user-api-token-here"
    }
  }
}
```

You can also create a user token through the API:

```bash
# Create a user API token
curl \
  --header "Authorization: Bearer $EXISTING_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "description": "CI pipeline token"
      }
    }
  }' \
  https://app.terraform.io/api/v2/users/user-xxxxxxxx/authentication-tokens
```

### 2. Team API Tokens

Team tokens have the combined permissions of the team across all workspaces. They are not tied to any individual user, which makes them better for shared automation.

**When to use**: CI/CD pipelines, shared automation scripts, service integrations where multiple people need access.

```bash
# Create a team token via the API
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxx/authentication-token
```

You can also manage team tokens with Terraform:

```hcl
# Create a team token using the TFE provider
resource "tfe_team_token" "ci_pipeline" {
  team_id = tfe_team.ci_team.id
}

# Store the token securely - it is only available at creation time
output "ci_token" {
  value     = tfe_team_token.ci_pipeline.token
  sensitive = true
}
```

### 3. Organization API Tokens

Organization tokens have access to organization-level endpoints but limited workspace access. They can manage teams, workspaces, and organization settings.

**When to use**: Organization management automation, workspace provisioning scripts, admin tooling.

```bash
# Generate an organization token
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  https://app.terraform.io/api/v2/organizations/your-org/authentication-token
```

## Choosing the Right Token Type

Here is a decision matrix to help you pick:

| Scenario | Token Type | Reason |
|---|---|---|
| Local `terraform plan` and `apply` | User | Tied to your personal permissions |
| GitHub Actions pipeline | Team | Shared access, not tied to one person |
| Workspace provisioning script | Organization | Needs to create and manage workspaces |
| Monitoring and read-only dashboards | Team | Create a read-only team with a token |
| Terraform provider for managing TFC | Team or Organization | Depends on scope of management |

## Setting Up Tokens for CI/CD

The most common use case for API tokens is CI/CD integration. Here is how to set it up properly.

### Store the Token as a Secret

Never hardcode tokens. Use your CI/CD platform's secret management:

```yaml
# GitHub Actions example
# First, add TF_API_TOKEN as a repository secret in GitHub

name: Terraform Plan
on:
  pull_request:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -no-color
```

### Configure the CLI Credentials File

For non-GitHub Actions environments, create the credentials file:

```bash
# Create the credentials file for CI environments
mkdir -p ~/.terraform.d
cat > ~/.terraform.d/credentials.tfrc.json << EOF
{
  "credentials": {
    "app.terraform.io": {
      "token": "${TFC_TOKEN}"
    }
  }
}
EOF
```

Or use the environment variable approach:

```bash
# Set the token as an environment variable
# Terraform CLI checks this automatically
export TF_TOKEN_app_terraform_io="your-api-token"
```

The environment variable format is `TF_TOKEN_` followed by the hostname with dots replaced by underscores.

## Token Expiration and Rotation

HCP Terraform supports token expiration, which you should always use for automation tokens:

```bash
# Create a team token with an expiration date
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "expired-at": "2026-06-01T00:00:00.000Z"
      }
    }
  }' \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxx/authentication-token
```

For token rotation, here is a practical approach:

```bash
#!/bin/bash
# rotate-token.sh - Rotate a team API token

TEAM_ID="team-xxxxxxxx"
ORG_TOKEN="your-org-token"

# Delete the existing token
curl \
  --header "Authorization: Bearer $ORG_TOKEN" \
  --request DELETE \
  "https://app.terraform.io/api/v2/teams/${TEAM_ID}/authentication-token"

# Create a new token with expiration
NEW_TOKEN=$(curl -s \
  --header "Authorization: Bearer $ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "expired-at": "2026-09-01T00:00:00.000Z"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/teams/${TEAM_ID}/authentication-token" \
  | jq -r '.data.attributes.token')

# Update the secret in your CI/CD system
# This varies by platform - example for GitHub Actions using gh CLI
echo "$NEW_TOKEN" | gh secret set TF_API_TOKEN --repo your-org/your-repo

echo "Token rotated successfully"
```

## Listing and Auditing Tokens

You can list existing tokens to audit access:

```bash
# List user tokens
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/users/user-xxxxxxxx/authentication-tokens

# Check if a team token exists
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxx/authentication-token
```

## Security Best Practices

### Use the Least Privileged Token

Do not use an organization token when a team token will do. Do not use a user token from an admin account for a pipeline that only needs to read workspace state.

### Set Expiration Dates

Every automation token should have an expiration date. Set a calendar reminder to rotate before it expires.

### Avoid User Tokens in CI/CD

If someone leaves the organization, their user tokens get revoked. If your CI/CD pipeline depends on a user token, it breaks. Always use team tokens for shared automation.

### Never Log Tokens

Make sure your CI/CD pipelines do not accidentally print tokens in logs:

```bash
# Bad - this will log the token
echo "Using token: $TFC_TOKEN"

# Good - mask the token
echo "Using token: ${TFC_TOKEN:0:4}****"
```

### Store Tokens in Secret Managers

Use tools like HashiCorp Vault, AWS Secrets Manager, or your CI/CD platform's built-in secret storage:

```hcl
# Example: Reading a TFC token from Vault
data "vault_generic_secret" "tfc_token" {
  path = "secret/terraform/hcp-terraform-token"
}

provider "tfe" {
  token = data.vault_generic_secret.tfc_token.data["token"]
}
```

## Revoking Tokens

When a token is compromised or no longer needed, revoke it immediately:

```bash
# Revoke a specific user token
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  https://app.terraform.io/api/v2/authentication-tokens/at-xxxxxxxx

# Revoke a team token
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxx/authentication-token

# Revoke an organization token
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  https://app.terraform.io/api/v2/organizations/your-org/authentication-token
```

## Summary

API tokens in HCP Terraform come in three flavors - user, team, and organization - each suited for different scenarios. The most important principles are: use team tokens for CI/CD (not user tokens), always set expiration dates, store tokens in proper secret managers, and rotate them on a regular schedule.

For related topics, see our guides on [using the HCP Terraform API for automation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-hcp-terraform-api-for-automation/view) and [using HCP Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-github-actions/view).
