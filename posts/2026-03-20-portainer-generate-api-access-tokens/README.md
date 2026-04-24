# How to Generate API Access Tokens in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, Security, Access Tokens

Description: Generate and manage API access tokens in Portainer for use in automation scripts, CI/CD pipelines, and third-party integrations.

## Introduction

Portainer provides two types of authentication for API access: JWT tokens (short-lived, from username/password login) and API Access Tokens (long-lived, persistent). API Access Tokens are ideal for automation, CI/CD pipelines, and monitoring scripts where storing credentials isn't practical.

## JWT Tokens vs. API Access Tokens

| Feature | JWT Token | API Access Token |
|---------|-----------|-----------------|
| Obtained via | Username/password | Account settings or API |
| Lifetime | Session duration (default: 8h) | Until manually revoked |
| Use case | Interactive sessions | Automation, API calls |
| Format | Bearer JWT | `ptr_` prefixed token |

## Method 1: Generate Token via Web UI

1. Log in to Portainer
2. Click your username in the top-right corner
3. Select **My account** (or **Account settings**)
4. Scroll to **Access tokens**
5. Click **Add access token**
6. Enter a descriptive name (e.g., `ci-cd-pipeline`, `monitoring-script`)
7. Re-enter your password when prompted
8. Copy the generated token immediately - it's shown only once

## Method 2: Generate Token via API

```bash
# Step 1: Get a JWT via username/password

JWT=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Step 2: Look up your current user ID
USER_ID=$(curl -s \
  -H "Authorization: Bearer $JWT" \
  https://portainer.example.com/api/users/me \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

# Step 3: Create an API access token
curl -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/users/${USER_ID}/tokens \
  -d '{
    "description": "ci-cd-pipeline",
    "password": "adminpassword"
  }'

# Response includes the token (shown only once):
# {"rawAPIKey":"ptr_abc123...","apiKey":{"id":1,"description":"ci-cd-pipeline","userId":1,"prefix":"ptr_abc"}}
```

## Using an API Access Token

Include the token in the `X-API-Key` header:

```bash
# Using the API access token (not Authorization: Bearer)
API_TOKEN="ptr_abc123yourtokenhere"

# List environments
curl -s \
  -H "X-API-Key: $API_TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -m json.tool

# List containers on environment 1
curl -s \
  -H "X-API-Key: $API_TOKEN" \
  https://portainer.example.com/api/endpoints/1/docker/containers/json \
  | python3 -m json.tool

# Deploy a standalone stack
curl -X POST \
  -H "X-API-Key: $API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/stacks/create/standalone/string?endpointId=1" \
  -d '{
    "Name": "my-app",
    "StackFileContent": "version: \"3\"\nservices:\n  web:\n    image: nginx"
  }'
```

## CI/CD Pipeline Example

### GitHub Actions

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

      - name: Deploy Stack via Portainer API
        env:
          PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
          PORTAINER_TOKEN: ${{ secrets.PORTAINER_API_TOKEN }}
          STACK_NAME: my-app
          ENDPOINT_ID: 1
        run: |
          # Read stack file
          STACK_CONTENT=$(cat docker-compose.yml)

          # Find the stack on the selected environment
          STACK_ID=$(curl -s \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "${PORTAINER_URL}/api/stacks" \
            | python3 -c "import os,sys,json; stacks=json.load(sys.stdin); name=os.environ['STACK_NAME']; endpoint_id=int(os.environ['ENDPOINT_ID']); print(next((str(s['Id']) for s in stacks if s['Name']==name and s['EndpointId']==endpoint_id), ''))")

          if [ -z "$STACK_ID" ]; then
            echo "Stack ${STACK_NAME} not found on endpoint ${ENDPOINT_ID}" >&2
            exit 1
          fi

          # Update existing file-based stack
          curl -X PUT \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
            -d "{\"StackFileContent\": $(echo "$STACK_CONTENT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")}"
```

## Listing and Revoking Tokens

```bash
# List all tokens for the current user
curl -s \
  -H "Authorization: Bearer $JWT" \
  https://portainer.example.com/api/users/${USER_ID}/tokens \
  | python3 -m json.tool

# Revoke a specific token by ID
TOKEN_ID=1
curl -X DELETE \
  -H "Authorization: Bearer $JWT" \
  "https://portainer.example.com/api/users/${USER_ID}/tokens/${TOKEN_ID}"
```

## Security Best Practices

- Give each token a descriptive name tied to its use case
- Use separate tokens per pipeline/application - never share tokens
- Revoke tokens when pipelines are decommissioned
- Store tokens in secrets managers (GitHub Secrets, HashiCorp Vault, etc.)
- Never hardcode tokens in source code or Dockerfiles
- Regularly audit active tokens via **Account** → **Access tokens**

## Conclusion

API Access Tokens provide a secure, long-lived mechanism for programmatic Portainer access. By using the `X-API-Key` header instead of username/password authentication, your automation scripts are immune to password changes and session timeouts. Always treat these tokens as sensitive credentials and rotate them regularly.
