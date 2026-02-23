# How to Handle HCP Terraform Authentication from CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Authentication, CLI, Security, API Tokens

Description: Learn how to authenticate the Terraform CLI with HCP Terraform using tokens, environment variables, and credential helpers.

---

Getting authentication right between the Terraform CLI and HCP Terraform is something every practitioner needs to handle. Whether you are working locally, running in CI/CD, or managing multiple organizations, there are several authentication methods available. This guide covers all of them, along with best practices for keeping your tokens secure.

## How Terraform CLI Authentication Works

When you run `terraform init`, `terraform plan`, or `terraform apply` with a cloud block, the CLI needs to prove your identity to HCP Terraform. It does this using an API token. Terraform looks for this token in a specific order:

1. Environment variable `TF_TOKEN_app_terraform_io`
2. Credentials file at `~/.terraform.d/credentials.tfrc.json`
3. Credential helper (if configured)

If none of these provide a valid token, you will see an authentication error.

## Method 1: terraform login Command

The simplest way to authenticate for local development is `terraform login`:

```bash
# Start the login flow
terraform login

# Terraform opens your browser to app.terraform.io
# You create an API token and paste it back into the terminal
# The token is stored in ~/.terraform.d/credentials.tfrc.json
```

The token generated through `terraform login` is a user token tied to your personal account. It has the same permissions as your user across all organizations you belong to.

After running `terraform login`, check that the credentials file was created:

```bash
# Verify the credentials file exists
ls -la ~/.terraform.d/credentials.tfrc.json

# The file contains your token (do not share this)
# {
#   "credentials": {
#     "app.terraform.io": {
#       "token": "your-api-token-here"
#     }
#   }
# }
```

## Method 2: Environment Variables

For CI/CD pipelines and automation, environment variables are the preferred approach. The variable name is derived from the hostname:

```bash
# For HCP Terraform (app.terraform.io)
export TF_TOKEN_app_terraform_io="your-api-token"

# For Terraform Enterprise with custom hostname
# Replace dots with underscores in the hostname
export TF_TOKEN_terraform_internal_acme_com="your-api-token"
```

The naming convention is `TF_TOKEN_` followed by the hostname with dots replaced by underscores.

Here is how to set this up in common CI/CD systems:

```yaml
# GitHub Actions
name: Terraform Plan
on: [pull_request]

jobs:
  plan:
    runs-on: ubuntu-latest
    env:
      # Store the token as a GitHub secret
      TF_TOKEN_app_terraform_io: ${{ secrets.TF_API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform plan
```

```yaml
# GitLab CI
terraform_plan:
  image: hashicorp/terraform:latest
  variables:
    # Store the token in GitLab CI/CD variables
    TF_TOKEN_app_terraform_io: $TF_API_TOKEN
  script:
    - terraform init
    - terraform plan
```

## Method 3: Credentials File (Manual)

You can create or edit the credentials file directly instead of using `terraform login`:

```bash
# Create the credentials directory if it does not exist
mkdir -p ~/.terraform.d

# Write the credentials file
cat > ~/.terraform.d/credentials.tfrc.json << 'EOF'
{
  "credentials": {
    "app.terraform.io": {
      "token": "your-api-token-here"
    }
  }
}
EOF

# Secure the file permissions
chmod 600 ~/.terraform.d/credentials.tfrc.json
```

This approach is useful when you need to script the setup or when `terraform login` is not available (like in Docker containers).

## Method 4: Credential Helpers

Credential helpers are external programs that Terraform calls to retrieve tokens. They integrate with system keychains and secret managers:

```json
// ~/.terraformrc or ~/.terraform.d/credentials.tfrc.json
{
  "credentials_helpers": {
    "credstore": {}
  }
}
```

You can write a custom credential helper that pulls tokens from HashiCorp Vault, AWS Secrets Manager, or any other secret store:

```bash
#!/bin/bash
# terraform-credentials-vault
# Custom credential helper that fetches tokens from Vault

# Terraform calls this with "get" and passes the hostname via stdin
COMMAND=$1

if [ "$COMMAND" = "get" ]; then
  # Read hostname from stdin
  read -r INPUT
  HOSTNAME=$(echo "$INPUT" | jq -r '.hostname')

  # Fetch the token from Vault
  TOKEN=$(vault kv get -field=token "secret/terraform/$HOSTNAME")

  # Return the token in the expected JSON format
  echo "{\"token\": \"$TOKEN\"}"
fi
```

Place the credential helper in your PATH with the naming convention `terraform-credentials-<name>`.

## Token Types

HCP Terraform has three types of tokens, and choosing the right one matters:

### User Tokens

Generated per user through the UI or `terraform login`. They carry the user's permissions across all organizations.

```bash
# Generate a user token via API (requires existing authentication)
curl -s \
  --request POST \
  --header "Authorization: Bearer $EXISTING_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "description": "CI pipeline token"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/users/user-ID/authentication-tokens"
```

Use user tokens for: local development, interactive workflows.

### Team Tokens

Scoped to a specific team within an organization. They have the combined permissions of that team.

```bash
# Generate a team token
curl -s \
  --request POST \
  --header "Authorization: Bearer $ADMIN_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/teams/team-ID/authentication-token"
```

Use team tokens for: CI/CD pipelines that need access to specific workspaces.

### Organization Tokens

Scoped to the entire organization with broad access. Use these carefully.

```bash
# Generate an organization token
curl -s \
  --request POST \
  --header "Authorization: Bearer $ADMIN_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org/authentication-token"
```

Use organization tokens for: administrative automation, workspace management scripts.

## Security Best Practices

Keep your authentication secure with these practices:

```bash
# Never commit credentials to git
echo ".terraform.d/" >> ~/.gitignore_global
echo "credentials.tfrc.json" >> ~/.gitignore_global

# Set restrictive file permissions
chmod 600 ~/.terraform.d/credentials.tfrc.json

# Use short-lived tokens when possible
# Rotate tokens regularly
# Use team tokens instead of personal tokens for CI/CD
```

For CI/CD, always use your platform's secret management:

```yaml
# GitHub Actions - use encrypted secrets
- name: Terraform Plan
  env:
    TF_TOKEN_app_terraform_io: ${{ secrets.TF_API_TOKEN }}
  run: terraform plan
```

Never hardcode tokens in Terraform files, scripts, or Dockerfiles.

## Troubleshooting Authentication Issues

Common problems and fixes:

```bash
# Error: "unauthorized" during terraform init
# Fix: Check that your token is valid
terraform login

# Error: "organization not found"
# Fix: Verify organization name and token permissions
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/my-org" | jq .

# Error: token environment variable not being picked up
# Fix: Check the variable name matches the hostname exactly
# For app.terraform.io, the variable must be TF_TOKEN_app_terraform_io
env | grep TF_TOKEN

# Error: credentials file not found
# Fix: Check the file location
ls -la ~/.terraform.d/credentials.tfrc.json
```

## Multiple Organization Authentication

If you work with multiple organizations or both HCP Terraform and Terraform Enterprise, your credentials file can hold multiple entries:

```json
{
  "credentials": {
    "app.terraform.io": {
      "token": "hcp-terraform-token"
    },
    "terraform.internal.acme.com": {
      "token": "enterprise-token"
    }
  }
}
```

Each hostname gets its own token. Terraform automatically uses the correct one based on the `hostname` setting in your cloud block.

## Summary

For local development, `terraform login` is the fastest path. For CI/CD, use environment variables with team tokens stored in your platform's secret manager. For complex setups, credential helpers integrate with enterprise secret management systems. Whichever method you choose, keep your tokens secure, use the principle of least privilege when selecting token types, and rotate credentials regularly.
