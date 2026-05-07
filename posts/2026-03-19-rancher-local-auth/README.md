# How to Set Up Local Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, RBAC

Description: A guide to configuring and managing local authentication in Rancher for user management without an external identity provider.

Local authentication is Rancher's built-in user management system. It allows you to create and manage user accounts directly within Rancher without relying on an external identity provider. This guide covers setting up local authentication, managing users, configuring password policies, and securing local accounts.

## Prerequisites

- Rancher v2.6 or later
- Admin access to Rancher
- For the programmatic examples, `kubectl` configured against Rancher's Kubernetes API (Rancher v2.8+)
- Understanding of Rancher's role-based access control

## Understanding Local Authentication

Local authentication is enabled by default when you first install Rancher. The initial admin user created during setup uses local authentication. Even when an external auth provider is configured, Rancher recommends keeping a few local users available as a fallback in case the external provider is unavailable.

## Step 1: Access User Management

Navigate to the user management area:

1. Log in to Rancher as an administrator.
2. Click the hamburger menu.
3. Select **Users & Authentication**.
4. Click **Users** to see the user list.

## Step 2: Create Local Users

Add new local users:

1. Click **Create**.
2. Fill in the user details:

```plaintext
Username: jdoe
Display Name: John Doe
Description: Backend developer

Password: <strong-password>
Confirm Password: <strong-password>
```

3. Assign a global role:

```plaintext
☑ Standard User
☐ Administrator
☐ User-Base
☐ Custom
```

4. Click **Create**.

Create local users programmatically with the Rancher Kubernetes API (Rancher v2.8+):

```bash
# Create the user resource
kubectl create -f -<<EOF
apiVersion: management.cattle.io/v3
kind: User
metadata:
  name: jdoe
displayName: "John Doe"
username: "jdoe"
description: "Backend developer"
mustChangePassword: true
EOF

# Set the user's password
kubectl create -f -<<EOF
apiVersion: v1
kind: Secret
metadata:
  name: jdoe
  namespace: cattle-local-user-passwords
type: Opaque
stringData:
  password: SecureP@ssw0rd!
EOF
```

## Step 3: Configure Password Requirements

Set the minimum password length:

1. Navigate to **Global Settings**.
2. Find the `password-min-length` setting.

```bash
# Set minimum password length
curl -s -k \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "12"}' \
  "https://rancher.example.com/v3/settings/password-min-length"
```

## Step 4: Force Password Changes

Require users to change their password on first login:

When creating users programmatically, set `mustChangePassword` to `true` on the `User` resource:

```bash
kubectl create -f -<<EOF
apiVersion: management.cattle.io/v3
kind: User
metadata:
  name: newuser
displayName: "New User"
username: "newuser"
mustChangePassword: true
EOF

kubectl create -f -<<EOF
apiVersion: v1
kind: Secret
metadata:
  name: newuser
  namespace: cattle-local-user-passwords
type: Opaque
stringData:
  password: TemporaryP@ss1
EOF
```

To force an existing user to change their password:

```bash
# Update the user to require a password change
kubectl patch users.management.cattle.io newuser \
  --type merge \
  -p '{"mustChangePassword": true}'
```

## Step 5: Assign Cluster and Project Roles

Grant local users access to specific clusters and projects:

### Cluster Access

1. Navigate to the target cluster.
2. Go to **Cluster Members**.
3. Click **Add**.
4. Search for the local user.
5. Select the cluster role.

```plaintext
User: jdoe
Cluster Role: Cluster Member

User: sysadmin
Cluster Role: Cluster Owner
```

### Project Access

1. Navigate to the cluster and then the target project.
2. Go to **Members**.
3. Click **Add**.
4. Search for the local user.
5. Select the project role.

```plaintext
User: jdoe
Project: backend-services
Project Role: Project Member

User: jdoe
Project: frontend-services
Project Role: Read Only
```

## Step 6: Manage API Keys

Create API keys for local users:

1. Click the user avatar in the top-right corner.
2. Select **Account & API Keys**.
3. Click **Create API Key**.

```plaintext
Description: CI/CD Pipeline Access
Scope: No Scope (access all clusters)
Expires: In 90 days
```

Via the Rancher Kubernetes API (Rancher v2.13+):

```bash
# Create an API key
kubectl create -o jsonpath='{.status.value}' -f -<<EOF
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: CI/CD Pipeline Access
  ttl: 7776000000
EOF
```

The command prints the token value once:

```plaintext
token-xxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 7: Disable and Delete Users

Manage user lifecycle:

### Disable a User

1. Navigate to **Users & Authentication** then **Users**.
2. Find the user.
3. Click the three-dot menu and select **Deactivate**.

```bash
# Disable via Rancher Kubernetes API
kubectl patch users.management.cattle.io jdoe \
  --type merge \
  -p '{"enabled": false}'
```

### Delete a User

1. Find the user in the user list.
2. Click the three-dot menu and select **Delete**.
3. Confirm the deletion.

```bash
# Delete via Rancher Kubernetes API
kubectl delete user jdoe
```

## Step 8: Reset Admin Password

If you lose the admin password, reset it using kubectl:

```bash
# Reset the admin password
kubectl -n cattle-system exec $(kubectl -n cattle-system get pods \
  -l app=rancher --no-headers | head -1 | awk '{ print $1 }') \
  -c rancher -- reset-password

# The command outputs a new temporary password
# New password for default administrator (user-xxxxx): <new-password>
```

If the last administrator was deleted or deactivated, recreate a default administrator instead:

```bash
# Recreate a default administrator
kubectl -n cattle-system exec $(kubectl -n cattle-system get pods \
  -l app=rancher --no-headers | head -1 | awk '{ print $1 }') \
  -c rancher -- ensure-default-admin
```

## Step 9: Configure Session Settings

Manage session duration:

```bash
# Set user session length (in minutes)
curl -s -k \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "960"}' \
  "https://rancher.example.com/v3/settings/auth-user-session-ttl-minutes"
```

## Step 10: Audit Local User Activity

If Rancher API audit logging is enabled, inspect the audit log sidecar and review user and token resources:

```bash
# View recent audit events
kubectl -n cattle-system logs \
  $(kubectl -n cattle-system get pods -l app=rancher --no-headers | head -1 | awk '{ print $1 }') \
  -c rancher-audit-log --tail=200

# List all users and their status
kubectl get users.management.cattle.io -o json | \
  jq '.items[] | {
    username: .username,
    displayName: .displayName,
    enabled: .enabled,
    principalIds: .principalIds,
    created: .metadata.creationTimestamp
  }'

# Rancher v2.13+: list all API tokens
kubectl get tokens.ext.cattle.io -o json | \
  jq '.items[] | {
    name: .metadata.name,
    userID: .spec.userID,
    description: .spec.description,
    expired: .status.expired,
    expiresAt: .status.expiresAt
  }'
```

## Using Local Auth with External Providers

Local authentication can coexist with external providers:

- Keep the local admin account active as a fallback.
- Local and external users can coexist in the same Rancher installation.
- If the external auth provider goes down, local accounts still work.

To configure this:

1. Set up your external auth provider (LDAP, SAML, OIDC, etc.).
2. Keep the local admin account active.
3. Create a few emergency local accounts for break-glass scenarios.

## Best Practices

- **Use external auth for most users**: Local authentication is best used as a fallback, not the primary authentication method for large organizations.
- **Keep admin local accounts**: Always maintain at least one local admin account for emergency access.
- **Enforce strong passwords**: Set a strong minimum password length and require password changes when appropriate.
- **Rotate API keys**: Set expiration dates on API keys and rotate them regularly.
- **Audit regularly**: Review the user list and remove inactive accounts promptly.
- **Limit admin accounts**: Keep the number of local admin accounts to the minimum necessary.

## Conclusion

Local authentication in Rancher provides a straightforward way to manage user access without external dependencies. While it is ideal for small teams and development environments, larger organizations should consider integrating an external identity provider and using local auth as a fallback. By following the security practices outlined in this guide, you can maintain a secure and well-managed local authentication setup for your Rancher environment.
