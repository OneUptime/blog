# How to Configure Automatic Authentication with Grafana API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, API, Authentication, Security, Automation, Service Accounts, Tokens

Description: Learn how to configure automatic authentication with the Grafana API using API keys, service accounts, and OAuth tokens. This guide covers best practices for securing programmatic access to Grafana for automation, CI/CD pipelines, and integrations.

Automating Grafana operations requires secure, programmatic access to its API. Whether you are provisioning dashboards, managing alerts, or integrating with CI/CD pipelines, proper authentication configuration is essential. This guide covers all authentication methods and best practices for automated Grafana API access.

## Authentication Methods Overview

Grafana supports several authentication mechanisms for API access:

```mermaid
graph TD
    A[Grafana API Client] --> B{Authentication Method}
    B --> C[Service Account Token]
    B --> D[API Key - Legacy]
    B --> E[Basic Auth]
    B --> F[OAuth Token]
    C --> G[Grafana API]
    D --> G
    E --> G
    F --> G
```

## Service Account Tokens (Recommended)

Service accounts are the recommended method for programmatic access in Grafana 9+. They provide fine-grained permissions and better auditability than legacy API keys.

### Creating a Service Account

**Via Grafana UI:**

1. Go to Administration > Service Accounts
2. Click "Add service account"
3. Configure the account:
   - Name: `automation-bot`
   - Role: Select appropriate role (Viewer, Editor, Admin)
4. Click "Create"

**Via API (requires existing admin access):**

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "automation-bot",
    "role": "Editor",
    "isDisabled": false
  }' \
  "http://grafana:3000/api/serviceaccounts"
```

### Creating Service Account Tokens

After creating the service account, generate a token:

**Via Grafana UI:**

1. Click on the service account
2. Click "Add service account token"
3. Set token name and optional expiration
4. Copy and securely store the generated token

**Via API:**

```bash
# Get service account ID first
SA_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://grafana:3000/api/serviceaccounts/search?query=automation-bot" | \
  jq -r '.serviceAccounts[0].id')

# Create token
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-pipeline-token",
    "secondsToLive": 2592000
  }' \
  "http://grafana:3000/api/serviceaccounts/$SA_ID/tokens"
```

### Using Service Account Tokens

Include the token in the Authorization header:

```bash
# Query dashboards
curl -H "Authorization: Bearer glsa_xxxxxxxxxxxxxxxxxxxx" \
  "http://grafana:3000/api/search?type=dash-db"

# Create a dashboard
curl -X POST \
  -H "Authorization: Bearer glsa_xxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d @dashboard.json \
  "http://grafana:3000/api/dashboards/db"
```

## API Keys (Legacy)

API keys are being deprecated in favor of service accounts but are still supported:

### Creating API Keys

**Via Grafana UI:**

1. Go to Configuration > API Keys
2. Click "Add API key"
3. Set name, role, and optional expiration
4. Copy the generated key

**Via API:**

```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'admin:admin' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "legacy-automation-key",
    "role": "Editor",
    "secondsToLive": 86400
  }' \
  "http://grafana:3000/api/auth/keys"
```

### Using API Keys

```bash
curl -H "Authorization: Bearer eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk" \
  "http://grafana:3000/api/dashboards/home"
```

## Basic Authentication

For simple scripts or development, basic authentication works:

```bash
# Using username:password
curl -u admin:admin \
  "http://grafana:3000/api/org"

# Using base64 encoded credentials
curl -H "Authorization: Basic $(echo -n 'admin:admin' | base64)" \
  "http://grafana:3000/api/org"
```

**Note:** Basic auth is not recommended for production automation due to credential exposure risks.

## OAuth/OIDC Token Authentication

For environments using OAuth providers:

### Configure Grafana for OAuth

```ini
# grafana.ini
[auth.generic_oauth]
enabled = true
name = OAuth
allow_sign_up = true
client_id = grafana-client
client_secret = ${OAUTH_CLIENT_SECRET}
scopes = openid profile email
auth_url = https://auth.example.com/authorize
token_url = https://auth.example.com/token
api_url = https://auth.example.com/userinfo
```

### Using OAuth Tokens

```bash
# Obtain token from OAuth provider
TOKEN=$(curl -X POST \
  -d "grant_type=client_credentials&client_id=grafana-client&client_secret=$SECRET" \
  "https://auth.example.com/token" | jq -r '.access_token')

# Use with Grafana API
curl -H "Authorization: Bearer $TOKEN" \
  "http://grafana:3000/api/dashboards/home"
```

## Configuring for Automation Scenarios

### CI/CD Pipeline Integration

Store tokens as secrets and use them in pipelines:

**GitHub Actions:**

```yaml
name: Deploy Grafana Dashboard

on:
  push:
    paths:
      - 'dashboards/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Dashboard
        env:
          GRAFANA_TOKEN: ${{ secrets.GRAFANA_SERVICE_TOKEN }}
          GRAFANA_URL: ${{ vars.GRAFANA_URL }}
        run: |
          for dashboard in dashboards/*.json; do
            curl -X POST \
              -H "Authorization: Bearer $GRAFANA_TOKEN" \
              -H "Content-Type: application/json" \
              -d @"$dashboard" \
              "$GRAFANA_URL/api/dashboards/db"
          done
```

**GitLab CI:**

```yaml
deploy_dashboards:
  stage: deploy
  script:
    - |
      for dashboard in dashboards/*.json; do
        curl -X POST \
          -H "Authorization: Bearer $GRAFANA_TOKEN" \
          -H "Content-Type: application/json" \
          -d @"$dashboard" \
          "$GRAFANA_URL/api/dashboards/db"
      done
  variables:
    GRAFANA_TOKEN: $GRAFANA_SERVICE_TOKEN
```

### Terraform Provider

Use service account tokens with the Grafana Terraform provider:

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = "https://grafana.example.com"
  auth = var.grafana_service_token
}

resource "grafana_dashboard" "metrics" {
  config_json = file("dashboard.json")
  folder      = grafana_folder.monitoring.id
}
```

### Python SDK

```python
from grafana_client import GrafanaApi

# Initialize with service account token
grafana = GrafanaApi.from_url(
    url="https://grafana.example.com",
    credential=("Authorization", "Bearer glsa_xxxxxxxxxxxx")
)

# Or with API key
grafana = GrafanaApi.from_url(
    url="https://grafana.example.com",
    credential=("Authorization", "Bearer eyJrIjoiT0tT...")
)

# List dashboards
dashboards = grafana.search.search_dashboards()
for dash in dashboards:
    print(f"{dash['title']} - {dash['uid']}")
```

### Node.js Integration

```javascript
const axios = require('axios');

const grafanaClient = axios.create({
  baseURL: process.env.GRAFANA_URL,
  headers: {
    'Authorization': `Bearer ${process.env.GRAFANA_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function createDashboard(dashboard) {
  const response = await grafanaClient.post('/api/dashboards/db', {
    dashboard: dashboard,
    overwrite: true,
    message: 'Updated via automation'
  });
  return response.data;
}

async function listAlerts() {
  const response = await grafanaClient.get('/api/v1/provisioning/alert-rules');
  return response.data;
}
```

## Security Best Practices

### Token Rotation

Implement automatic token rotation:

```bash
#!/bin/bash
# rotate-grafana-token.sh

# Create new token
NEW_TOKEN=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "automation-'$(date +%Y%m%d)'", "secondsToLive": 2592000}' \
  "http://grafana:3000/api/serviceaccounts/$SA_ID/tokens" | jq -r '.key')

# Update secret store (example: AWS Secrets Manager)
aws secretsmanager update-secret \
  --secret-id grafana/automation-token \
  --secret-string "$NEW_TOKEN"

# Delete old token
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://grafana:3000/api/serviceaccounts/$SA_ID/tokens/$OLD_TOKEN_ID"
```

### Least Privilege Access

Create service accounts with minimal required permissions:

```bash
# Create viewer-only service account for monitoring
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "monitoring-readonly",
    "role": "Viewer"
  }' \
  "http://grafana:3000/api/serviceaccounts"

# Create editor for dashboard automation
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard-automation",
    "role": "Editor"
  }' \
  "http://grafana:3000/api/serviceaccounts"
```

### Token Expiration

Always set expiration for automated tokens:

```bash
# Token valid for 30 days
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "temp-automation",
    "secondsToLive": 2592000
  }' \
  "http://grafana:3000/api/serviceaccounts/$SA_ID/tokens"
```

### Audit Logging

Enable and monitor API access:

```ini
# grafana.ini
[log]
level = info

[security]
disable_gravatar = true
cookie_secure = true

[auth]
login_maximum_inactive_lifetime_duration = 7d
login_maximum_lifetime_duration = 30d
token_rotation_interval_minutes = 10
```

## Troubleshooting

### 401 Unauthorized

```bash
# Check token validity
curl -I -H "Authorization: Bearer $TOKEN" \
  "http://grafana:3000/api/org"

# Verify service account is not disabled
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://grafana:3000/api/serviceaccounts/search?query=automation"
```

### 403 Forbidden

The token has insufficient permissions:

```bash
# Check service account role
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://grafana:3000/api/serviceaccounts/$SA_ID" | jq '.role'

# Update role if needed
curl -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "Editor"}' \
  "http://grafana:3000/api/serviceaccounts/$SA_ID"
```

### Token Expired

```bash
# List tokens to find expired ones
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://grafana:3000/api/serviceaccounts/$SA_ID/tokens"

# Create a new token
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-token", "secondsToLive": 2592000}' \
  "http://grafana:3000/api/serviceaccounts/$SA_ID/tokens"
```

## Conclusion

Proper API authentication is fundamental to Grafana automation. Key recommendations:

1. **Use service account tokens** for all new automation - they provide better security and auditability
2. **Implement token rotation** to limit exposure from compromised credentials
3. **Apply least privilege** - only grant permissions needed for the specific use case
4. **Set expiration dates** on all tokens to ensure periodic review
5. **Store tokens securely** in secret management systems, never in code

With these practices, you can build secure, maintainable automation around your Grafana infrastructure.
