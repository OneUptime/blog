# How to Use the Rancher API for User Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, User Management

Description: Complete guide to managing users, roles, and permissions in Rancher programmatically using the REST API.

Managing users in Rancher through the API enables you to automate onboarding and enforce consistent role assignments. This guide uses Rancher's legacy `/v3` API endpoints for creating users and assigning roles at global, cluster, and project levels.

## Prerequisites

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"
```

These examples target the legacy `/v3` API endpoint. You need the Bearer Token shown under Account & API Keys for a user that can manage users and role bindings, typically an Administrator.

## Creating Local Users

### Create a Single User

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jdoe",
    "name": "Jane Doe",
    "password": "SecurePassword123!",
    "mustChangePassword": true,
    "enabled": true
  }' \
  "${RANCHER_URL}/v3/users" | jq '{id, username, name, enabled}'
```

The response includes the user's ID, which you need for role assignments:

```json
{
  "id": "user-xxxxx",
  "username": "jdoe",
  "name": "Jane Doe",
  "enabled": true
}
```

### Create Multiple Users from a List

```bash
#!/bin/bash

users='[
  {"username": "alice", "name": "Alice Smith"},
  {"username": "bob", "name": "Bob Jones"},
  {"username": "carol", "name": "Carol Williams"}
]'

echo "$users" | jq -c '.[]' | while read -r user; do
  username=$(echo "$user" | jq -r '.username')
  name=$(echo "$user" | jq -r '.name')

  echo "Creating user: ${username}"
  curl -s -k -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "'"${username}"'",
      "name": "'"${name}"'",
      "password": "TempPass123!",
      "mustChangePassword": true,
      "enabled": true
    }' \
    "${RANCHER_URL}/v3/users" | jq '{id, username}'
done
```

## Listing Users

### List All Users

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users" | jq '.data[] | {
    id,
    username,
    name,
    enabled,
    principalIds
  }'
```

### Find a Specific User

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users?username=jdoe" | jq '.data[0]'
```

### Get Current User Info

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users?me=true" | jq '.data[0] | {id, username, name}'
```

## Managing User Properties

### Update a User

```bash
USER_ID="user-xxxxx"

curl -s -k -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane M. Doe",
    "description": "Platform Engineer"
  }' \
  "${RANCHER_URL}/v3/users/${USER_ID}"
```

### Disable a User

```bash
curl -s -k -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}' \
  "${RANCHER_URL}/v3/users/${USER_ID}"
```

### Enable a Disabled User

```bash
curl -s -k -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' \
  "${RANCHER_URL}/v3/users/${USER_ID}"
```

### Change a User's Password

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewSecurePassword456!"
  }' \
  "${RANCHER_URL}/v3/users/${USER_ID}?action=setpassword"
```

### Delete a User

```bash
curl -s -k -X DELETE \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/users/${USER_ID}"
```

## Assigning Global Roles

Global roles determine what a user can do across the entire Rancher instance.

### List Available Global Roles

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/globalRoles" | jq '.data[] | {id, name, description}'
```

Common global roles include:
- `admin` - Full administrator access
- `user` - Standard user (can create clusters)
- `user-base` - Basic user (login only, no cluster creation)
- `restricted-admin` - Deprecated built-in role for downstream-cluster admin access without local cluster access

### Assign a Global Role

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "globalRoleId": "user",
    "userId": "user-xxxxx"
  }' \
  "${RANCHER_URL}/v3/globalRoleBindings"
```

### List Global Role Bindings for a User

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/globalRoleBindings?userId=user-xxxxx" | jq '.data[] | {id, globalRoleId}'
```

### Remove a Global Role Binding

```bash
BINDING_ID="grb-xxxxx"

curl -s -k -X DELETE \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/globalRoleBindings/${BINDING_ID}"
```

## Assigning Cluster Roles

Cluster roles control what a user can do within a specific cluster.

### List Available Cluster Role Templates

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/roleTemplates?context=cluster" | jq '.data[] | {id, name, description}'
```

Common cluster role templates include:
- `cluster-owner` - Full cluster access
- `cluster-member` - Standard cluster membership
- `projects-view` - View projects in the cluster

### Assign a Cluster Role

```bash
CLUSTER_ID="c-m-abc12345"

curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clusterId": "'"${CLUSTER_ID}"'",
    "roleTemplateId": "cluster-member",
    "userId": "user-xxxxx"
  }' \
  "${RANCHER_URL}/v3/clusterRoleTemplateBindings"
```

### List Cluster Role Bindings

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusterRoleTemplateBindings?clusterId=${CLUSTER_ID}" | jq '.data[] | {
    id,
    userId,
    userPrincipalId,
    roleTemplateId
  }'
```

## Assigning Project Roles

Project roles limit access to namespaces within a project.

### Assign a Project Role

```bash
PROJECT_ID="c-m-abc12345:p-xyz789"

curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'"${PROJECT_ID}"'",
    "roleTemplateId": "project-member",
    "userId": "user-xxxxx"
  }' \
  "${RANCHER_URL}/v3/projectRoleTemplateBindings"
```

### List Project Role Bindings

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/projectRoleTemplateBindings?projectId=${PROJECT_ID}" | jq '.data[] | {
    id,
    userId,
    userPrincipalId,
    roleTemplateId
  }'
```

## User Audit Script

Build a comprehensive user audit report:

```bash
#!/bin/bash

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

api() {
  curl -s -k -H "Authorization: Bearer ${RANCHER_TOKEN}" "${RANCHER_URL}${1}"
}

echo "=== Rancher User Audit Report ==="
echo "Generated: $(date)"
echo ""

api "/v3/users" | jq -r '.data[] | "\(.id)|\(.username)|\(.name)|\(.enabled)"' | while IFS='|' read -r id username name enabled; do
  echo "User: ${name} (${username}) - ID: ${id} - Enabled: ${enabled}"

  # Global roles
  global_roles=$(api "/v3/globalRoleBindings?userId=${id}" | jq -r '[.data[].globalRoleId] | join(", ")')
  echo "  Global Roles: ${global_roles:-none}"

  # Cluster roles
  cluster_roles=$(api "/v3/clusterRoleTemplateBindings?userId=${id}" | jq -r '.data[] | "    \(.clusterId): \(.roleTemplateId)"')
  if [ -n "$cluster_roles" ]; then
    echo "  Cluster Roles:"
    echo "$cluster_roles"
  fi

  # Project roles
  project_roles=$(api "/v3/projectRoleTemplateBindings?userId=${id}" | jq -r '.data[] | "    \(.projectId): \(.roleTemplateId)"')
  if [ -n "$project_roles" ]; then
    echo "  Project Roles:"
    echo "$project_roles"
  fi
  echo ""
done
```

## Summary

The legacy Rancher `/v3` API provides complete control over user management. You can create and modify users, assign roles at global, cluster, and project levels, and build automation scripts for onboarding and auditing. Use scoped roles to enforce the principle of least privilege, and regularly audit user access with automated scripts.
