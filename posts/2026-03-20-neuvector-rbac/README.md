# How to Configure NeuVector RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, RBAC, Access Control, Kubernetes, Security

Description: Configure NeuVector's role-based access control to assign fine-grained permissions to users and teams for managing container security policies.

## Introduction

NeuVector's Role-Based Access Control (RBAC) system provides fine-grained access management for security operations. You can assign global roles, namespace-specific roles, and custom roles to users and groups, ensuring that each team member has exactly the access they need - no more, no less.

## NeuVector Built-in Roles

| Role | Description |
|---|---|
| admin | Full access to all features on the local cluster |
| reader | Read-only access to all features on the local cluster |
| ciops | CI integration role limited to image scanning and CI/CD scanning APIs |
| fedAdmin | Multi-cluster admin on the primary (master) cluster in a federation |
| fedReader | Multi-cluster read-only role in a federation |

In addition to these preconfigured roles, you can define custom roles by combining individual read/write permissions (for example, runtime policy, compliance, admission control, or registry scan) under **Settings > Users, API Keys & Roles > Roles**.

## Prerequisites

- NeuVector installed and running
- Admin access to NeuVector Manager
- Understanding of your team's access requirements

## Step 1: Create a User

The NeuVector REST API runs on the controller (`neuvector-svc-controller-api` service in Kubernetes) on port `10443`. The user identifier in the API is the `fullname` field.

```bash
# Create a new user with the reader role

curl -sk -X POST \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "user": {
      "fullname": "security-engineer",
      "password": "SecurePass123!",
      "email": "jane.smith@company.com",
      "role": "reader",
      "timeout": 900,
      "locale": "en",
      "role_domains": {}
    }
  }'
```

In the UI:
1. Go to **Settings** > **Users, API Keys & Roles**
2. Click **Add User**
3. Fill in username (the user's `fullname`), password, email
4. Select the global role

## Step 2: Assign Global Roles

`PATCH /v1/user/{fullname}` updates a user. The body is wrapped in `config` and must include the user's `fullname`.

```bash
# Assign admin role to a user
curl -sk -X PATCH \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user/security-engineer" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "fullname": "security-engineer",
      "role": "admin"
    }
  }'

# Assign reader role
curl -sk -X PATCH \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user/dev-team-lead" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "fullname": "dev-team-lead",
      "role": "reader"
    }
  }'
```

## Step 3: Configure Namespace-Scoped Roles

Assign users different roles for specific namespaces. `role_domains` is a map from a role name to the list of namespaces ("domains") in which the user holds that role.

```bash
# Give user admin access only in the "staging" namespace
curl -sk -X PATCH \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user/staging-admin" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "fullname": "staging-admin",
      "role": "",
      "role_domains": {
        "admin": ["staging"],
        "reader": ["production", "default"]
      }
    }
  }'
```

This grants:
- Admin access in the `staging` namespace
- Reader access in `production` and `default`
- No access to other namespaces

## Step 4: Configure CI/CD Service Account

Create a dedicated account for CI/CD pipeline integration. The `ciops` role is limited to image scanning and CI/CD scanning APIs; it cannot perform any other action in the console.

```bash
# Create CI/CD service account with the ciops role
curl -sk -X POST \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "user": {
      "fullname": "ci-scanner",
      "password": "CIScannerSecurePass456!",
      "email": "security-automation@company.com",
      "role": "ciops",
      "timeout": 300
    }
  }'
```

## Step 5: List and Manage Users

```bash
# List all users
curl -sk \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.users[] | {
    fullname: .fullname,
    username: .username,
    role: .role,
    email: .email,
    blocked: .blocked_for_failed_login
  }'

# Clear a user's failed-login block (re-enable login after lockout)
curl -sk -X POST \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user/old-employee/password" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "fullname": "old-employee",
      "clear_failed_login": true
    }
  }'

# Delete a user
curl -sk -X DELETE \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/user/old-employee" \
  -H "X-Auth-Token: ${TOKEN}"
```

`blocked_for_failed_login` is a status field set by the controller after too many failed login attempts; it is not directly settable through the user config endpoint. To prevent a user from logging in without removing them, rotate the password to an unknown value or delete the account.

## Step 6: Configure Password Policy

Password requirements live in a password profile, not in `/v1/system/config`. NeuVector currently supports a single profile named `default`. Update it via `PATCH /v1/password_profile/default`.

```bash
# Configure the default password profile
curl -sk -X PATCH \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/password_profile/default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "default",
      "min_len": 16,
      "min_uppercase_count": 1,
      "min_lowercase_count": 1,
      "min_digit_count": 1,
      "min_special_count": 1,
      "enable_password_expiration": true,
      "password_expire_after_days": 90,
      "enable_password_history": true,
      "password_keep_history_count": 5
    }
  }'
```

## Step 7: Configure Session Timeout and Login Lockout

The default password profile also holds the session timeout and the failed-login lockout settings.

```bash
# Set idle session timeout and lockout after repeated failed logins
curl -sk -X PATCH \
  "https://neuvector-svc-controller-api.neuvector:10443/v1/password_profile/default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "default",
      "session_timeout": 1800,
      "enable_block_after_failed_login": true,
      "block_after_failed_login_count": 5,
      "block_minutes": 30
    }
  }'
```

## Step 8: Use Kubernetes RBAC with NeuVector

Integrate NeuVector RBAC with Kubernetes service accounts:

```yaml
# neuvector-rbac-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: neuvector-reader-role
rules:
  - apiGroups: ["neuvector.com"]
    resources: ["nvsecurityrules", "nvclustersecurityrules"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dev-team-neuvector-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: neuvector-reader-role
subjects:
  - kind: Group
    name: dev-team
    apiGroup: rbac.authorization.k8s.io
```

## Conclusion

NeuVector's RBAC system provides the flexibility to implement least-privilege access across your security operations team. By assigning namespace-scoped roles, you give development teams visibility into their own namespaces without exposing sensitive production security policies. Combined with LDAP/AD integration and strong password policies, NeuVector RBAC supports enterprise identity management requirements.
