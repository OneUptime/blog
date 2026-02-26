# How to Use argocd account Commands for User Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, User Management

Description: Learn how to use argocd account commands to manage local user accounts, generate API tokens, update passwords, and configure service accounts for automation.

---

ArgoCD supports both SSO-based authentication and local user accounts. The `argocd account` command family manages local accounts - creating them, setting passwords, generating API tokens, and checking their status. This is especially important for service accounts used in CI/CD pipelines and automation scripts.

## Understanding ArgoCD Accounts

ArgoCD has two types of accounts:

1. **SSO accounts** - Users authenticated through an external identity provider (Okta, Azure AD, GitHub, etc.). Managed outside ArgoCD.

2. **Local accounts** - Users defined directly in ArgoCD's ConfigMap. Managed with `argocd account` commands.

The built-in `admin` account is a local account that exists by default.

## Listing Accounts

```bash
# List all configured accounts
argocd account list

# Output:
# NAME     ENABLED  CAPABILITIES
# admin    true     login
# ci-bot   true     apiKey
# alice    true     login, apiKey
```

The capabilities column shows what each account can do:
- **login** - Can authenticate via the UI and CLI with a password
- **apiKey** - Can generate API tokens for programmatic access

## Getting Account Details

```bash
# Get details for a specific account
argocd account get admin

# Get details for a service account
argocd account get ci-bot
```

## Creating Local Accounts

Local accounts are defined in the `argocd-cm` ConfigMap, not via the CLI. Here is how to create them:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Define accounts
  # Format: accounts.<name>
  # Capabilities: login, apiKey

  # User account (can login and create API keys)
  accounts.alice: login, apiKey

  # Service account (API key only, no UI/CLI login)
  accounts.ci-bot: apiKey

  # Another user with login only
  accounts.bob: login

  # Enabled/disabled flag (optional, default true)
  accounts.alice.enabled: "true"
  accounts.ci-bot.enabled: "true"
```

After creating the account in the ConfigMap, set the password:

```bash
# Set initial password for a new account
argocd account update-password --account alice --new-password <password>

# You will be prompted for the current admin password for verification
```

## Updating Passwords

### Change Your Own Password

```bash
# Change the password for the currently logged-in account
argocd account update-password

# You will be prompted for:
# - Current password
# - New password
```

### Change Another Account's Password (Admin)

```bash
# Change password for another account (requires admin privileges)
argocd account update-password \
  --account alice \
  --current-password <admin-password> \
  --new-password <new-password>
```

### Change the Admin Password

```bash
# Change the admin password
argocd account update-password \
  --account admin \
  --current-password <current-admin-password> \
  --new-password <new-admin-password>
```

## Generating API Tokens

API tokens are used for programmatic access to the ArgoCD API. They are essential for CI/CD integrations.

### Generate a Token

```bash
# Generate a token for a service account
argocd account generate-token --account ci-bot

# Generate a token with a specific expiration
argocd account generate-token --account ci-bot --expires-in 24h

# Generate a token with a longer expiration
argocd account generate-token --account ci-bot --expires-in 720h

# Generate a non-expiring token (not recommended for production)
argocd account generate-token --account ci-bot --expires-in 0
```

The token is output to stdout. Store it securely - it cannot be retrieved later.

### Using API Tokens

```bash
# Option 1: Pass as CLI flag
argocd app list --auth-token <token>

# Option 2: Set as environment variable
export ARGOCD_AUTH_TOKEN=<token>
argocd app list

# Option 3: Use in API calls
curl -H "Authorization: Bearer <token>" \
  https://argocd.example.com/api/v1/applications
```

## Service Account Setup for CI/CD

Here is the complete process for setting up a CI/CD service account:

### Step 1: Create the Account

```yaml
# Add to argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  accounts.github-actions: apiKey
  accounts.gitlab-ci: apiKey
  accounts.jenkins: apiKey
```

### Step 2: Configure RBAC

```yaml
# argocd-rbac-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # GitHub Actions can sync and view staging apps
    p, github-actions, applications, get, staging/*, allow
    p, github-actions, applications, sync, staging/*, allow

    # GitLab CI can sync and view all apps
    p, gitlab-ci, applications, get, */*, allow
    p, gitlab-ci, applications, sync, */*, allow
    p, gitlab-ci, applications, override, */*, allow

    # Jenkins has full access
    p, jenkins, applications, *, */*, allow
```

### Step 3: Generate Token

```bash
# Generate token with appropriate expiration
TOKEN=$(argocd account generate-token --account github-actions --expires-in 8760h)
echo "Store this token as a secret in GitHub Actions: $TOKEN"
```

### Step 4: Use in CI/CD

```yaml
# GitHub Actions
- name: Sync ArgoCD Application
  env:
    ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
  run: |
    argocd login argocd.example.com --grpc-web
    argocd app sync my-app
```

## Disabling Accounts

### Disable a User Account

Edit the ConfigMap:

```yaml
data:
  accounts.alice.enabled: "false"
```

### Disable the Admin Account

For security hardening, disable the built-in admin account after setting up SSO:

```yaml
# argocd-cm ConfigMap
data:
  admin.enabled: "false"
```

**Warning**: Only disable admin after verifying that SSO or other local accounts with admin RBAC are working. Otherwise you will lock yourself out.

## Account Audit Script

```bash
#!/bin/bash
# audit-accounts.sh - Audit ArgoCD accounts

echo "=== ArgoCD Account Audit ==="
echo ""

echo "--- Active Accounts ---"
argocd account list

echo ""
echo "--- Account Details ---"

for account in $(argocd account list -o json | jq -r '.[].name'); do
  echo ""
  echo "Account: $account"

  DATA=$(argocd account get "$account" -o json 2>/dev/null)

  ENABLED=$(echo "$DATA" | jq -r '.enabled')
  CAPS=$(echo "$DATA" | jq -r '.capabilities | join(", ")')
  TOKENS=$(echo "$DATA" | jq '.tokens | length')

  echo "  Enabled:      $ENABLED"
  echo "  Capabilities: $CAPS"
  echo "  Active Tokens: $TOKENS"

  # Show token details
  if [ "$TOKENS" -gt 0 ]; then
    echo "  Token Details:"
    echo "$DATA" | jq -r '.tokens[] | "    ID: \(.id) | Issued: \(.issuedAt) | Expires: \(.expiresAt // "never")"'
  fi
done
```

## Token Rotation Script

```bash
#!/bin/bash
# rotate-token.sh - Rotate an account's API token

ACCOUNT="${1:?Usage: rotate-token.sh <account-name>}"

echo "Rotating token for account: $ACCOUNT"

# Generate new token
NEW_TOKEN=$(argocd account generate-token --account "$ACCOUNT" --expires-in 8760h)

echo "New token generated."
echo "Token: $NEW_TOKEN"
echo ""
echo "IMPORTANT: Update this token in all systems that use it."
echo "Old tokens remain valid until they expire."
```

## Can-I Check

Test what an account is allowed to do:

```bash
# Check if the current account can sync a specific application
argocd account can-i sync applications my-app

# Check various permissions
argocd account can-i get applications '*'
argocd account can-i create applications '*'
argocd account can-i delete applications '*'
argocd account can-i sync applications 'production/*'
```

This is extremely useful for debugging permission issues:

```bash
#!/bin/bash
# check-permissions.sh - Check what an account can do

echo "=== Permission Check ==="

ACTIONS=("get" "create" "update" "delete" "sync" "override")
RESOURCES=("applications" "projects" "repositories" "clusters")

for resource in "${RESOURCES[@]}"; do
  echo ""
  echo "--- $resource ---"
  for action in "${ACTIONS[@]}"; do
    RESULT=$(argocd account can-i "$action" "$resource" '*' 2>&1)
    if [ "$RESULT" = "yes" ]; then
      echo "  $action: ALLOWED"
    else
      echo "  $action: DENIED"
    fi
  done
done
```

## Best Practices

1. **Disable admin after SSO setup**: The admin account is a security risk if left enabled in production.

2. **Use apiKey-only for service accounts**: CI/CD bots should never have login capability.

3. **Set token expiration**: Always set an expiration on API tokens. Implement rotation before they expire.

4. **Least privilege RBAC**: Service accounts should only have the permissions they need.

5. **Audit regularly**: Check for unused accounts and expired tokens.

6. **Separate accounts per pipeline**: Use different service accounts for different CI/CD pipelines so you can revoke access individually.

## Summary

The `argocd account` command family manages local user accounts and service accounts in ArgoCD. Use local accounts for service-to-service authentication in CI/CD pipelines, and configure them with appropriate RBAC policies and token expiration. For human users, SSO is recommended over local accounts. Always implement token rotation procedures and regular account audits to maintain security. The `argocd account can-i` command is your best friend for debugging permission issues.
