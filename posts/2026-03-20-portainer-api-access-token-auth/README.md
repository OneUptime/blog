# How to Authenticate with the Portainer API Using Access Tokens - Token Auth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Authentication, Security, Automation

Description: Learn how to create and use Portainer API access tokens for long-lived, non-expiring authentication in CI/CD pipelines and automation scripts.

## Introduction

While JWT tokens are the primary authentication method for interactive sessions, Portainer also supports **API access tokens** - long-lived, non-expiring tokens that are ideal for CI/CD pipelines, automation scripts, and service integrations. Unlike JWTs, access tokens do not expire automatically and can be revoked individually without affecting other sessions.

## Prerequisites

- Portainer CE or BE
- A Portainer user account
- The required permissions for the environments or resources you want to manage

## Access Tokens vs JWT Tokens

| Feature | JWT Tokens | API Access Tokens |
|---------|-----------|-------------------|
| Expiry | Configurable (hours/days) | Never expires until revoked |
| Acquisition | Username + password | Created in account settings |
| Use case | Interactive sessions | CI/CD, automation |
| Revocation | Logout or expiry | Individual revocation |
| Storage | Temp files, memory | Secrets manager |

## Step 1: Create an API Access Token

### Via Portainer UI

1. Log into Portainer.
2. Click your **username** in the top-right corner.
3. Select **My account**.
4. Scroll to the **Access tokens** section.
5. Click **Add access token**.
6. Enter a descriptive name: e.g., `GitHub Actions CI/CD`, `Terraform Pipeline`
7. If your Portainer instance uses internal authentication, re-enter your current password.
8. Click **Add access token**.

> **IMPORTANT**: Copy the token value immediately. It will only be shown once.

### Via Portainer API (Using JWT Auth First)

```bash
# Step 1: Get a JWT first

TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Step 2: Get your user ID
USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/users/me" | jq -r '.Id')

echo "User ID: $USER_ID"

# Step 3: Create an API access token
# For internal-auth users, include your current password in the payload
API_TOKEN_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/users/${USER_ID}/tokens" \
  -d '{"password":"yourpassword","description":"GitHub Actions CI/CD Token"}')

# Extract the raw access token
RAW_TOKEN=$(echo "$API_TOKEN_RESPONSE" | jq -r '.rawAPIKey')
echo "API Token: $RAW_TOKEN"
# Save this immediately - it cannot be retrieved again
```

## Step 2: Use the Access Token in API Requests

Access tokens are used in the `X-API-Key` header:

```bash
# Set your API access token
API_KEY="ptr_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# List environments using the API key
curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints" | jq .

# List stacks
curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/stacks" | jq .

# Create a container
curl -s -X POST -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/create?name=my-nginx" \
  -d '{
    "Image": "nginx:latest"
  }'
```

## Step 3: Store Access Tokens Securely

### GitHub Actions Secrets

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
      - uses: actions/checkout@v4

      - name: Deploy stack to Portainer
        env:
          PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
          PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
        run: |
          # Use the API key stored in GitHub Secrets
          curl -s -X POST \
            -H "X-API-Key: $PORTAINER_API_KEY" \
            -H "Content-Type: application/json" \
            "${PORTAINER_URL}/api/stacks/webhooks/YOUR_WEBHOOK_ID"
```

### HashiCorp Vault

```bash
# Store in Vault
vault kv put secret/portainer/api_key value="ptr_XXXXXXXX"

# Retrieve when needed
API_KEY=$(vault kv get -field=value secret/portainer/api_key)
```

### Linux Secrets File (Restricted Permissions)

```bash
# Store in a file with restricted permissions
echo "ptr_XXXXXXXXXXXXXXXX" > ~/.portainer-api-key
chmod 600 ~/.portainer-api-key

# Use in scripts
API_KEY=$(cat ~/.portainer-api-key)
```

## Step 4: List Your Access Tokens

```bash
# List all API tokens for a user
USER_ID=1  # or get it from /api/users/me

curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/users/${USER_ID}/tokens" | jq .
```

## Step 5: Revoke an Access Token

When a token is no longer needed or compromised:

```bash
# List tokens to get the token ID
curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/users/${USER_ID}/tokens" | \
  jq '.[] | {id: .id, description: .description}'

# Revoke a specific token by ID
TOKEN_ID=3

curl -s -X DELETE -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/users/${USER_ID}/tokens/${TOKEN_ID}"

echo "Token revoked."
```

## Step 6: Access Token Naming Best Practices

Use descriptive names that identify:
- **The system using it**: `github-actions`, `terraform-cloud`, `ansible`
- **The environment**: `production`, `staging`
- **Creation date**: for rotation tracking

Examples:
- `github-actions-production-2026-03`
- `terraform-infra-pipeline`
- `grafana-oncall-alerts`
- `monitoring-script-server1`

## Complete Python Example

```python
import os
import requests

class PortainerClient:
    def __init__(self, url, api_key):
        self.url = url.rstrip('/')
        self.headers = {"X-API-Key": api_key}

    def get_endpoints(self):
        response = requests.get(
            f"{self.url}/api/endpoints",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def list_stacks(self):
        response = requests.get(
            f"{self.url}/api/stacks",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
client = PortainerClient(
    url=os.environ["PORTAINER_URL"],
    api_key=os.environ["PORTAINER_API_KEY"]
)

endpoints = client.get_endpoints()
for ep in endpoints:
    print(f"Environment: {ep['Name']} (ID: {ep['Id']})")
```

## Conclusion

API access tokens provide a robust and secure way to authenticate automation scripts, CI/CD pipelines, and third-party integrations with Portainer. Unlike JWT tokens, they do not expire automatically, making them ideal for long-running systems. Always store them in a secrets manager, use descriptive names for easy management, and revoke tokens immediately when they are no longer needed or potentially compromised.
