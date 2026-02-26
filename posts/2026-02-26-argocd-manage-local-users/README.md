# How to Manage Local Users in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, User Management, Security

Description: Learn how to create and manage local user accounts in ArgoCD, including password management, account capabilities, and when to use local accounts vs SSO.

---

While SSO is the recommended authentication method for ArgoCD in production, there are valid reasons to use local user accounts. Service accounts for CI/CD pipelines, emergency break-glass access, and small team setups where SSO infrastructure is overkill all benefit from local accounts. ArgoCD supports creating and managing local users directly through its configuration.

This guide covers how to create local users, manage their passwords and capabilities, and use them alongside or instead of SSO.

## When to Use Local Users

Local accounts make sense in these scenarios:

- **CI/CD service accounts** - Automated pipelines that sync applications via the CLI or API
- **Break-glass access** - An emergency admin account when SSO is down
- **Small teams** - Teams of 2 to 5 people where SSO setup is not justified
- **Development environments** - Local or dev clusters where full SSO is unnecessary

For teams larger than 5 people or any production environment, SSO with an identity provider is strongly recommended.

## Understanding ArgoCD Account Types

ArgoCD has two types of accounts:

1. **Admin account** - Built-in, cannot be deleted, has full access
2. **Local accounts** - User-defined accounts with configurable capabilities

Local accounts have two capability types:

- **login** - Can log into the ArgoCD UI and CLI with a password
- **apiKey** - Can generate API tokens for programmatic access

## Creating Local Users

Local users are defined in the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Define local accounts
  # Format: accounts.<username>: <capabilities>
  accounts.alice: login, apiKey
  accounts.bob: login, apiKey
  accounts.ci-bot: apiKey
  accounts.deploy-service: apiKey

  # Optional: enable or disable accounts
  accounts.alice.enabled: "true"
  accounts.bob.enabled: "true"
  accounts.ci-bot.enabled: "true"
```

The capabilities determine what each account can do:

- `login` - Can authenticate via password (UI and CLI)
- `apiKey` - Can generate API tokens
- `login, apiKey` - Can do both

## Setting Passwords for Local Users

After creating accounts, set their passwords using the ArgoCD CLI:

```bash
# Login as admin first
argocd login argocd.example.com --username admin --password <admin-password>

# Set password for a new user
argocd account update-password --account alice --new-password '<alices-password>'

# Set password for another user
argocd account update-password --account bob --new-password '<bobs-password>'
```

Users can also change their own passwords:

```bash
# Login as the user
argocd login argocd.example.com --username alice --password '<current-password>'

# Change own password
argocd account update-password --current-password '<current-password>' --new-password '<new-password>'
```

## Configuring RBAC for Local Users

Local users follow the same RBAC system as SSO users. Map them to roles in `argocd-rbac-cm`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Alice is an admin
    g, alice, role:admin

    # Bob can deploy to staging and dev
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, applications, create, dev/*, allow
    p, role:developer, logs, get, */*, allow
    g, bob, role:developer

    # CI bot can only sync applications
    p, role:ci-sync, applications, get, */*, allow
    p, role:ci-sync, applications, sync, */*, allow
    g, ci-bot, role:ci-sync

    # Deploy service can sync and view
    p, role:deploy-svc, applications, get, */*, allow
    p, role:deploy-svc, applications, sync, */*, allow
    p, role:deploy-svc, applications, action/*, */*, allow
    g, deploy-service, role:deploy-svc
```

## Generating API Tokens

For accounts with the `apiKey` capability, generate API tokens for programmatic access:

```bash
# Login as admin
argocd login argocd.example.com --username admin --password <admin-password>

# Generate a token for the ci-bot account
argocd account generate-token --account ci-bot

# Generate a token with an expiry
argocd account generate-token --account ci-bot --expires-in 720h
```

The token can be used for API calls:

```bash
# Use the token to sync an application
argocd app sync my-app --auth-token <generated-token>

# Or use it with the API directly
curl -H "Authorization: Bearer <generated-token>" \
  https://argocd.example.com/api/v1/applications
```

## Managing Accounts

### List All Accounts

```bash
argocd account list
```

Output:

```
NAME           ENABLED  CAPABILITIES
admin          true     login
alice          true     login, apiKey
bob            true     login, apiKey
ci-bot         true     apiKey
deploy-service true     apiKey
```

### Get Account Details

```bash
argocd account get --account alice
```

### Disable an Account

To disable an account without deleting it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  accounts.alice: login, apiKey
  accounts.alice.enabled: "false"
```

Disabled accounts cannot log in or use API tokens.

### Delete an Account

Remove the account entry from `argocd-cm`:

```bash
kubectl -n argocd patch configmap argocd-cm --type json -p '[
  {"op": "remove", "path": "/data/accounts.bob"},
  {"op": "remove", "path": "/data/accounts.bob.enabled"}
]'
```

### Revoke API Tokens

```bash
# List tokens for an account
argocd account get --account ci-bot

# Delete a specific token by ID
argocd account delete-token --account ci-bot --id <token-id>
```

## The Admin Account

The built-in admin account has special behavior:

### Getting the Initial Admin Password

After fresh installation:

```bash
# The initial password is stored in a secret
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

### Changing the Admin Password

```bash
argocd login argocd.example.com --username admin --password <initial-password>
argocd account update-password --current-password '<initial-password>' --new-password '<new-password>'
```

### Disabling the Admin Account

For security, disable the admin account once SSO or other local accounts are set up:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  admin.enabled: "false"
```

Keep a break-glass local account with admin RBAC before disabling the admin account.

## Using Local Users with SSO

Local users and SSO can coexist. This is common for having service accounts (local) alongside human users (SSO):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com

  # SSO configuration
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com
    clientID: your-client-id
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups

  # Local service accounts
  accounts.ci-bot: apiKey
  accounts.deploy-service: apiKey
  accounts.break-glass-admin: login, apiKey
```

RBAC for both:

```yaml
  policy.csv: |
    # SSO groups
    g, platform-team, role:admin
    g, developers, role:developer

    # Local service accounts
    g, ci-bot, role:ci-sync
    g, deploy-service, role:deploy-svc

    # Break-glass account
    g, break-glass-admin, role:admin
```

## Password Policies

ArgoCD does not enforce password complexity policies natively. If you need password policies:

1. **Use SSO** - Your identity provider handles password policies
2. **Use API tokens instead of passwords** - For service accounts, tokens are more secure than passwords
3. **Rotate passwords manually** - Set a process for regular password rotation

## Security Best Practices

1. **Minimize local accounts** - Use SSO for human users, local accounts only for services
2. **Use apiKey-only for service accounts** - Do not give service accounts the `login` capability
3. **Set token expiry** - Always use `--expires-in` when generating tokens
4. **Disable the admin account** - Once alternative admin access is configured
5. **Rotate tokens regularly** - Build token rotation into your CI/CD pipeline
6. **Monitor account activity** - Check ArgoCD audit logs for account usage
7. **Use RBAC least privilege** - Give each account only the permissions it needs

## Automating Token Rotation

For CI/CD service accounts, automate token rotation:

```bash
#!/bin/bash
# rotate-argocd-token.sh

ARGOCD_SERVER="argocd.example.com"
ACCOUNT="ci-bot"
EXPIRY="720h"  # 30 days

# Login as admin
argocd login $ARGOCD_SERVER --username admin --password "$ADMIN_PASSWORD" --grpc-web

# Generate new token
NEW_TOKEN=$(argocd account generate-token --account $ACCOUNT --expires-in $EXPIRY)

# Store the new token in your secrets manager
# For example, update a Kubernetes secret
kubectl -n ci create secret generic argocd-token \
  --from-literal=token="$NEW_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Token rotated for $ACCOUNT"
```

## Summary

Local users in ArgoCD serve important roles as service accounts, break-glass access, and authentication for small teams. They are defined in the `argocd-cm` ConfigMap with configurable capabilities (login and apiKey), and they use the same RBAC system as SSO users. For production environments, combine local service accounts with SSO for human users to get the best of both worlds.

For SSO setup, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
