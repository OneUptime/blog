# How to Automate User Management in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Automation, User-management, RBAC, API, LDAP

Description: A guide to automating user provisioning, role assignments, and access control in Rancher using the API, Terraform, and LDAP/SAML integration.

## Overview

Managing users manually in Rancher becomes unsustainable as organizations grow. Automating user provisioning, role assignments, and project access through Rancher's previous v3 API and Terraform ensures consistency, reduces human error, and integrates with your existing identity management workflows. This guide covers the key approaches to automating user management in Rancher.

## User Management via Rancher v3 API

### List Users

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:your-secret-key"

# List all Rancher users

curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users" \
  | jq '.data[] | {id: .id, username: .username, principalIds: .principalIds}'
```

### Create a Local User

```bash
# Create a new local user
curl -s -k \
  -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/v3/users" \
  -d '{
    "username": "jane.doe",
    "password": "TemporaryPassword123!",
    "name": "Jane Doe",
    "mustChangePassword": true
  }'
```

### Assign Global Role

```bash
# Assign a global role to a user
# Get the user's ID first
USER_ID=$(curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users?username=jane.doe" \
  | jq -r '.data[0].id')

# Bind user to Standard User role
curl -s -k \
  -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/v3/globalrolebindings" \
  -d "{
    \"userId\": \"${USER_ID}\",
    \"globalRoleId\": \"user\"
  }"
```

### Grant Cluster Access

```bash
# Add user as cluster member
CLUSTER_ID="c-xxxxx"

curl -s -k \
  -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/v3/clusterroletemplatebindings" \
  -d "{
    \"clusterId\": \"${CLUSTER_ID}\",
    \"userId\": \"${USER_ID}\",
    \"roleTemplateId\": \"cluster-member\"
  }"
```

## Bulk User Provisioning Script

```bash
#!/bin/bash
# provision-users.sh - Bulk user provisioning from CSV
# CSV format: username,full_name,email,cluster_id,role_template_id

USERS_CSV="users.csv"
RANCHER_URL="${RANCHER_URL}"
RANCHER_TOKEN="${RANCHER_TOKEN}"

while IFS=',' read -r username full_name email cluster_id role_template_id; do
  # Skip header
  [ "$username" = "username" ] && continue

  echo "Provisioning user: ${username}"

  # Create user
  USER_RESPONSE=$(curl -s -k \
    -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    "${RANCHER_URL}/v3/users" \
    -d "{
      \"username\": \"${username}\",
      \"password\": \"TempPass123!\",
      \"name\": \"${full_name}\",
      \"mustChangePassword\": true
    }")

  USER_ID=$(echo "${USER_RESPONSE}" | jq -r '.id')

  if [ -z "${USER_ID}" ] || [ "${USER_ID}" = "null" ]; then
    echo "  Failed to create user ${username}"
    echo "${USER_RESPONSE}" | jq .
    continue
  fi

  # Assign standard user global role
  curl -s -k \
    -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    "${RANCHER_URL}/v3/globalrolebindings" \
    -d "{\"userId\": \"${USER_ID}\", \"globalRoleId\": \"user\"}" \
    > /dev/null

  # Assign cluster role
  curl -s -k \
    -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    "${RANCHER_URL}/v3/clusterroletemplatebindings" \
    -d "{
      \"clusterId\": \"${cluster_id}\",
      \"userId\": \"${USER_ID}\",
      \"roleTemplateId\": \"${role_template_id}\"
    }" \
    > /dev/null

  echo "  Created user ${username} with ID ${USER_ID}"
done < "${USERS_CSV}"
```

## User Management with Terraform

```hcl
# user.tf
# Create a user in Rancher
resource "rancher2_user" "jane_doe" {
  name     = "Jane Doe"
  username = "jane.doe"
  password = var.initial_password
  enabled  = true
}

# Assign global role
resource "rancher2_global_role_binding" "jane_standard" {
  name           = "jane-standard-user"
  global_role_id = "user"
  user_id        = rancher2_user.jane_doe.id
}

# Grant cluster access
resource "rancher2_cluster_role_template_binding" "jane_cluster" {
  name             = "jane-cluster-member"
  cluster_id       = var.cluster_id
  role_template_id = "cluster-member"
  user_id          = rancher2_user.jane_doe.id
}

# Grant project access
resource "rancher2_project_role_template_binding" "jane_project" {
  name             = "jane-project-member"
  project_id       = var.project_id
  role_template_id = "project-member"
  user_id          = rancher2_user.jane_doe.id
}
```

## LDAP/AD Group Sync Automation

Configure Rancher to use Active Directory groups for role assignments:

```text
Rancher UI → Users & Authentication → Auth Provider → Active Directory

Key settings:
- Server: ldaps://ad.example.com:636
- Service Account DN: CN=rancher-svc,OU=Service Accounts,DC=example,DC=com
- User Search Base: OU=Users,DC=example,DC=com
- Group Search Base: OU=Groups,DC=example,DC=com
- Group DN Attribute: distinguishedName
- User Member Attribute: memberOf
```

Bind AD groups to Rancher roles:

```bash
# Bind an AD group to a cluster role
# First, get the AD group's principal ID by searching in Rancher:
PRINCIPAL_ID="activedirectory_group://CN=kubernetes-admins,OU=Groups,DC=example,DC=com"
CLUSTER_ID="c-xxxxx"

curl -s -k \
  -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/v3/clusterroletemplatebindings" \
  -d "{
    \"clusterId\": \"${CLUSTER_ID}\",
    \"groupPrincipalId\": \"${PRINCIPAL_ID}\",
    \"roleTemplateId\": \"cluster-admin\"
  }"
```

## Automated Deprovisioning

```bash
#!/bin/bash
# deprovision-user.sh - Remove user access when they leave
USERNAME="$1"

# Find user ID
USER_ID=$(curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users?username=${USERNAME}" \
  | jq -r '.data[0].id')

if [ -z "${USER_ID}" ] || [ "${USER_ID}" = "null" ]; then
  echo "User not found: ${USERNAME}"
  exit 1
fi

# Disable the user (safer than deletion)
curl -s -k \
  -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/v3/users/${USER_ID}" \
  -d '{"enabled": false}'

echo "User ${USERNAME} (${USER_ID}) has been disabled"

# Optionally delete all role bindings
# Query and delete each binding individually
```

## Custom Role Creation

```bash
# Create a custom role with specific permissions
curl -s -k \
  -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  "${RANCHER_URL}/v3/roletemplates" \
  -d '{
    "name": "pod-reader",
    "context": "project",
    "rules": [
      {
        "apiGroups": [""],
        "resources": ["pods", "pods/log"],
        "verbs": ["get", "list", "watch"]
      }
    ]
  }'
```

## Conclusion

Automating user management in Rancher through the REST API or Terraform ensures consistent, auditable access provisioning. For organizations using Active Directory or LDAP, group-based role bindings eliminate the need to manage individual users, and Rancher applies group-based access when users sign in or after an administrator refreshes group memberships. Combine bulk provisioning scripts with your HR system's offboarding workflows to ensure access is revoked promptly when employees leave. Always store Rancher API tokens in a secrets manager (Vault, AWS Secrets Manager) and rotate them regularly.
