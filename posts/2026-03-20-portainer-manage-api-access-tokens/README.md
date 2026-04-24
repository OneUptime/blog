# How to Manage Your API Access Tokens in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Access Tokens, Automation, Security, Docker, REST API

Description: Learn how to create and manage Portainer API access tokens for automating deployments and integrating with CI/CD pipelines without using username/password authentication.

---

API access tokens in Portainer provide a secure way to authenticate API calls without exposing your password. They are ideal for CI/CD pipelines, automation scripts, and integrations that need programmatic access to Portainer.

## Creating an API Access Token

1. Log in to Portainer.
2. Click your username → **My Account**.
3. Scroll to **Access tokens**.
4. Click **Add access token**.
5. Enter a description (e.g., "GitHub Actions Deployment").
6. Re-enter your password.
7. Click **Add access token**.
8. **Copy the token immediately** - it is shown only once.

## Using the Token in API Calls

```bash
# Use your Portainer URL. Portainer exposes HTTPS on 9443 by default.
PORTAINER_URL="https://portainer.example.com:9443"

TOKEN="your_api_key_here"

# List all environments
curl -H "X-API-Key: $TOKEN" \
  "$PORTAINER_URL/api/endpoints"

# Update an existing file-based stack
curl -X PUT \
  -H "X-API-Key: $TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/stacks/1?endpointId=1" \
  -d '{"StackFileContent":"version: \"3\"\nservices:\n  web:\n    image: nginx:latest"}'
```

## Using in GitHub Actions

Store the token as a GitHub Secret and use it in workflows:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Portainer

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Redeploy Git-based stack via Portainer API
        run: |
          curl -X PUT \
            -H "X-API-Key: ${{ secrets.PORTAINER_TOKEN }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.PORTAINER_URL }}/api/stacks/1/git/redeploy?endpointId=1" \
            -d '{"Env":[],"Prune":false}'
```

## Managing Multiple Tokens

Create separate tokens for each integration, and use separate Portainer users if integrations need different permissions:

| Token Description | Used By | Backing User Permissions |
|---|---|---|
| GitHub Actions | CI/CD pipeline | User can redeploy only the target stack/environment |
| Monitoring Script | Cron job | User has read-only access to the target environment |
| Terraform Provider | IaC | User has the broader management permissions it needs |

Separate tokens let you revoke access for one integration without affecting others. If integrations need different access levels, create separate Portainer users because tokens inherit the permissions of the user that created them.

## Revoking a Token

1. Go to **My Account > Access tokens**.
2. Find the token by description.
3. Click the trash icon to revoke it.

Revoked tokens immediately stop working in all API calls.

## Token Security Best Practices

```bash
# Store tokens in environment variables, never in code
export PORTAINER_TOKEN="your_api_key_here"

# Use GitHub/GitLab secrets for CI/CD (not plaintext in YAML)
# Use a secrets manager (Vault, AWS SSM) for production automation

# Portainer API keys inherit the permissions of the Portainer user
# Give each service user only the minimum required Portainer permissions
```
