# How to Create API Tokens for Service Accounts in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API Tokens, CI/CD

Description: Learn how to create and manage ArgoCD API tokens for service accounts, enabling automated CI/CD pipelines and programmatic access to your GitOps workflows.

---

API tokens are the primary way to enable programmatic access to ArgoCD. Whether you need a CI/CD pipeline to trigger syncs, a monitoring system to check application health, or an automation script to manage applications, API tokens provide authenticated access without interactive login.

This guide covers creating, managing, and securing API tokens for service accounts in ArgoCD.

## Understanding API Tokens vs User Sessions

ArgoCD supports two authentication mechanisms:

- **User sessions** - Created when users log in via UI, CLI, or SSO. They expire based on session settings.
- **API tokens** - Long-lived tokens associated with an account. They can optionally have an expiry date.

API tokens are the right choice for:

- CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Automation scripts
- Monitoring integrations
- Custom tooling that interacts with ArgoCD's API

## Step 1: Create a Service Account

First, create an account with the `apiKey` capability in `argocd-cm`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Service accounts with apiKey capability only
  accounts.ci-pipeline: apiKey
  accounts.monitoring-agent: apiKey
  accounts.deploy-bot: apiKey

  # Account that can also log in interactively (useful for testing)
  accounts.automation-admin: login, apiKey
```

Apply the ConfigMap:

```bash
kubectl apply -f argocd-cm.yaml
```

## Step 2: Configure RBAC for Service Accounts

Give each service account the minimum permissions it needs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # CI pipeline: can sync and view applications
    p, role:ci-sync, applications, get, */*, allow
    p, role:ci-sync, applications, sync, */*, allow
    p, role:ci-sync, applications, action/*, */*, allow
    g, ci-pipeline, role:ci-sync

    # Monitoring agent: read-only access
    p, role:monitor, applications, get, */*, allow
    p, role:monitor, clusters, get, *, allow
    p, role:monitor, projects, get, *, allow
    g, monitoring-agent, role:monitor

    # Deploy bot: full application management
    p, role:deployer, applications, *, */*, allow
    p, role:deployer, repositories, get, *, allow
    p, role:deployer, projects, get, *, allow
    p, role:deployer, logs, get, */*, allow
    g, deploy-bot, role:deployer
```

## Step 3: Generate API Tokens

Log in as admin and generate tokens for each service account:

```bash
# Login as admin
argocd login argocd.example.com --username admin --password '<admin-password>'

# Generate a token with 30-day expiry
argocd account generate-token --account ci-pipeline --expires-in 720h

# Generate a token with 90-day expiry
argocd account generate-token --account monitoring-agent --expires-in 2160h

# Generate a token without expiry (use with caution)
argocd account generate-token --account deploy-bot
```

The command outputs a JWT token. Store it securely immediately as it cannot be retrieved later.

### Token with Custom ID

You can assign a custom ID to tokens for easier management:

```bash
argocd account generate-token --account ci-pipeline --id github-actions-main --expires-in 720h
argocd account generate-token --account ci-pipeline --id gitlab-ci-staging --expires-in 720h
```

## Step 4: Using API Tokens

### With the ArgoCD CLI

```bash
# Use a token to sync an application
argocd app sync my-app --server argocd.example.com --auth-token <token> --grpc-web

# Use a token to get application status
argocd app get my-app --server argocd.example.com --auth-token <token> --grpc-web

# Set as environment variable to avoid passing it every time
export ARGOCD_AUTH_TOKEN=<token>
argocd app list --server argocd.example.com --grpc-web
```

### With the REST API

```bash
# Get all applications
curl -s -H "Authorization: Bearer <token>" \
  https://argocd.example.com/api/v1/applications | jq '.items[].metadata.name'

# Get a specific application
curl -s -H "Authorization: Bearer <token>" \
  https://argocd.example.com/api/v1/applications/my-app

# Sync an application
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  https://argocd.example.com/api/v1/applications/my-app/sync \
  -d '{}'

# Sync with specific revision
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  https://argocd.example.com/api/v1/applications/my-app/sync \
  -d '{"revision": "v1.2.3"}'
```

### In GitHub Actions

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd
          sudo mv argocd /usr/local/bin/

      - name: Sync ArgoCD Application
        env:
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
          ARGOCD_SERVER: argocd.example.com
        run: |
          argocd app sync my-app --grpc-web --force
          argocd app wait my-app --grpc-web --timeout 300
```

### In GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: argoproj/argocd:latest
  script:
    - argocd app sync my-app
      --server $ARGOCD_SERVER
      --auth-token $ARGOCD_TOKEN
      --grpc-web
    - argocd app wait my-app
      --server $ARGOCD_SERVER
      --auth-token $ARGOCD_TOKEN
      --grpc-web
      --timeout 300
  variables:
    ARGOCD_SERVER: argocd.example.com
```

### In Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    environment {
        ARGOCD_TOKEN = credentials('argocd-api-token')
        ARGOCD_SERVER = 'argocd.example.com'
    }
    stages {
        stage('Deploy') {
            steps {
                sh '''
                    argocd app sync my-app \
                        --server $ARGOCD_SERVER \
                        --auth-token $ARGOCD_TOKEN \
                        --grpc-web
                '''
            }
        }
    }
}
```

## Managing API Tokens

### List Tokens for an Account

```bash
argocd account get --account ci-pipeline
```

This shows all tokens issued for the account, including their IDs and creation dates.

### Revoke a Specific Token

```bash
# Delete a token by ID
argocd account delete-token --account ci-pipeline --id github-actions-main
```

### Revoke All Tokens

To revoke all tokens for an account, delete them one by one or recreate the account:

```bash
# List all token IDs
argocd account get --account ci-pipeline

# Delete each one
argocd account delete-token --account ci-pipeline --id <token-id-1>
argocd account delete-token --account ci-pipeline --id <token-id-2>
```

## Project-Scoped Tokens

For more granular access, use project-level tokens instead of account tokens:

```bash
# Create a project role
argocd proj role create my-project ci-deployer

# Add policies to the role
argocd proj role add-policy my-project ci-deployer \
  --action sync --permission allow --object '*'
argocd proj role add-policy my-project ci-deployer \
  --action get --permission allow --object '*'

# Generate a token for the project role
argocd proj role create-token my-project ci-deployer --expires-in 720h
```

Project-scoped tokens can only access applications within that project, providing better isolation than account-level tokens.

## Token Rotation Strategy

API tokens should be rotated regularly. Here is a rotation strategy:

### Automated Rotation Script

```bash
#!/bin/bash
# rotate-token.sh - Run on a schedule (e.g., monthly cron job)

ARGOCD_SERVER="argocd.example.com"
ACCOUNT="ci-pipeline"
TOKEN_ID="ci-token-$(date +%Y%m%d)"
EXPIRY="720h"

# Login as admin
argocd login $ARGOCD_SERVER --username admin --password "$ARGOCD_ADMIN_PASSWORD" --grpc-web

# Generate new token
NEW_TOKEN=$(argocd account generate-token --account $ACCOUNT --id $TOKEN_ID --expires-in $EXPIRY)

# Store new token in secrets manager (example: AWS Secrets Manager)
aws secretsmanager put-secret-value \
  --secret-id argocd/ci-pipeline-token \
  --secret-string "$NEW_TOKEN"

# Store in Kubernetes secret for CI/CD
kubectl -n ci create secret generic argocd-token \
  --from-literal=token="$NEW_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

# Clean up old tokens (keep last 2)
OLD_TOKENS=$(argocd account get --account $ACCOUNT -o json | jq -r '.tokens[:-2][].id')
for TOKEN in $OLD_TOKENS; do
  argocd account delete-token --account $ACCOUNT --id $TOKEN
  echo "Deleted old token: $TOKEN"
done

echo "Token rotated. New token ID: $TOKEN_ID"
```

### Rotation Schedule

| Token Type | Rotation Frequency | Expiry |
|---|---|---|
| CI/CD pipeline | Monthly | 60 days |
| Monitoring | Quarterly | 120 days |
| Emergency/break-glass | On use | 24 hours |
| Development | Weekly | 7 days |

## Security Best Practices

1. **Always set expiry** - Use `--expires-in` to prevent indefinitely valid tokens
2. **Use least privilege** - Create specific RBAC roles for each service account
3. **Store securely** - Use a secrets manager (Vault, AWS Secrets Manager, etc.)
4. **Audit token usage** - Monitor ArgoCD logs for token-based API calls
5. **Use project tokens when possible** - They provide better isolation than account tokens
6. **Never commit tokens** - Keep tokens out of Git repositories
7. **Rotate on compromise** - If a token might be leaked, revoke and regenerate immediately

## Monitoring Token Usage

Check ArgoCD server logs for API calls made with tokens:

```bash
kubectl -n argocd logs deploy/argocd-server | grep -i "auth\|token\|ci-pipeline"
```

## Summary

API tokens are essential for integrating ArgoCD with CI/CD pipelines and automation tools. The process involves creating service accounts with the `apiKey` capability, assigning RBAC roles with least-privilege permissions, generating tokens with appropriate expiry, and storing them securely. Regular rotation and monitoring complete the security picture. For most teams, a combination of SSO for human users and API tokens for service accounts provides the right balance of convenience and security.

For related topics, see [How to Manage Local Users in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-manage-local-users/view) and [How to Create ArgoCD Project Roles](https://oneuptime.com/blog/post/2026-01-30-argocd-project-roles/view).
