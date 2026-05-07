# How to Automate User Management in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, User Management, Automation, RBAC, API, Terraform

Description: Automate user management in Rancher using the Rancher API, Terraform, and scripts to provision users, assign roles, and manage team access at scale without manual UI interactions.

## Introduction

Managing users manually in the Rancher UI does not scale for organizations with dozens of teams and hundreds of users. Automating user provisioning through the Rancher API or Terraform enables consistent, auditable access management that integrates with HR systems, SSO directories, and CI/CD pipelines.

## Step 1: Rancher API Authentication

```bash
# Generate an API key in Rancher UI:

# User Avatar > Account & API Keys > Create API Key

# Store credentials securely
export RANCHER_URL="https://rancher.company.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyy"

# Test authentication
curl -sku "$RANCHER_TOKEN" \
  "$RANCHER_URL/v3/users" | jq -r '.data[].username'
```

## Step 2: Create Users via API

```bash
# Create a new local user
USER_ID=$(curl -sku "$RANCHER_TOKEN" -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jsmith",
    "password": "SecurePassword123!",
    "name": "John Smith",
    "enabled": true,
    "mustChangePassword": true
  }' \
  "$RANCHER_URL/v3/users" | jq -r '.id')

# Grant the minimum global role required for the user to log in

curl -sku "$RANCHER_TOKEN" -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"jsmith-user-base\",
    \"globalRoleId\": \"user-base\",
    \"userId\": \"$USER_ID\"
  }" \
  "$RANCHER_URL/v3/globalrolebindings"

# Batch user creation from CSV: username,name,password
while IFS=',' read -r username name password; do
  user_id=$(curl -sku "$RANCHER_TOKEN" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$username\", \"password\": \"$password\", \"name\": \"$name\", \"enabled\": true, \"mustChangePassword\": true}" \
    "$RANCHER_URL/v3/users" | jq -r '.id')

  curl -sku "$RANCHER_TOKEN" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${username}-user-base\", \"globalRoleId\": \"user-base\", \"userId\": \"$user_id\"}" \
    "$RANCHER_URL/v3/globalrolebindings"

  echo "Created user: $username"
done < users.csv
```

## Step 3: Assign Cluster Roles

```bash
# Get cluster ID
CLUSTER_ID=$(curl -sku "$RANCHER_TOKEN" \
  "$RANCHER_URL/v3/clusters" | jq -r '.data[] | select(.name=="production") | .id')

# Get user ID
USER_ID=$(curl -sku "$RANCHER_TOKEN" \
  "$RANCHER_URL/v3/users?username=jsmith" | jq -r '.data[0].id')

# Assign cluster-member role
curl -sku "$RANCHER_TOKEN" -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"jsmith-cluster-member\",
    \"clusterId\": \"$CLUSTER_ID\",
    \"roleTemplateId\": \"cluster-member\",
    \"userId\": \"$USER_ID\"
  }" \
  "$RANCHER_URL/v3/clusterroletemplatebindings"
```

## Step 4: Automate with Terraform

```hcl
# user-management.tf
terraform {
  required_providers {
    rancher2 = {
      source  = "rancher/rancher2"
      version = "~> 14.0"
    }
  }
}

provider "rancher2" {
  api_url    = var.rancher_url
  token_key  = var.rancher_token
}

data "rancher2_cluster" "production" {
  name = "production"
}

# Define users in a structured way
variable "users" {
  type = list(object({
    username         = string
    name             = string
    password         = string
    role_template_id = string
  }))
  default = [
    { username = "jsmith",  name = "John Smith",  password = "ChangeMe123!", role_template_id = "cluster-member" },
    { username = "awilson", name = "Alice Wilson", password = "ChangeMe123!", role_template_id = "cluster-member" }
  ]
}

resource "rancher2_user" "users" {
  for_each             = { for u in var.users : u.username => u }
  username             = each.value.username
  password             = each.value.password
  name                 = each.value.name
  enabled              = true
  must_change_password = true
}

resource "rancher2_global_role_binding" "user_base" {
  for_each       = rancher2_user.users
  name           = "${each.key}-user-base"
  global_role_id = "user-base"
  user_id        = each.value.id
}

resource "rancher2_cluster_role_template_binding" "bindings" {
  for_each         = { for u in var.users : u.username => u }
  name             = "${each.key}-${each.value.role_template_id}"
  cluster_id       = data.rancher2_cluster.production.id
  role_template_id = each.value.role_template_id
  user_id          = rancher2_user.users[each.key].id
}
```

## Step 5: Sync with Active Directory Groups

```bash
# Bind an external directory group directly to a Rancher project role
# so membership stays managed in the identity provider.
bind_group_to_project() {
  local binding_name=$1
  local group_principal_id=$2
  local rancher_project=$3
  local role_template_id=$4

  curl -sku "$RANCHER_TOKEN" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$binding_name\", \"projectId\": \"$rancher_project\", \"roleTemplateId\": \"$role_template_id\", \"groupPrincipalId\": \"$group_principal_id\"}" \
    "$RANCHER_URL/v3/projectroletemplatebindings"
}

# Run sync
bind_group_to_project "prod-devs-project-member" "<group_principal_id_from_rancher>" "c-m-abcde:p-vwxyz" "project-member"
```

## Step 6: Off-boarding Automation

```bash
# Disable departed user
disable_user() {
  local username=$1
  local user_id=$(curl -sku "$RANCHER_TOKEN" \
    "$RANCHER_URL/v3/users?username=$username" | jq -r '.data[0].id')

  if [ -z "$user_id" ] || [ "$user_id" = "null" ]; then
    echo "User not found: $username"
    return 1
  fi

  curl -sku "$RANCHER_TOKEN" -X PUT \
    -H "Content-Type: application/json" \
    -d '{"enabled": false}' \
    "$RANCHER_URL/v3/users/$user_id"

  echo "Disabled user: $username"

  # Optionally remove global, cluster, and project role bindings
  for endpoint in globalrolebindings clusterroletemplatebindings projectroletemplatebindings; do
    bindings=$(curl -sku "$RANCHER_TOKEN" \
      "$RANCHER_URL/v3/$endpoint?userId=$user_id" | jq -r '.data[]?.id')

    for binding in $bindings; do
      curl -sku "$RANCHER_TOKEN" -X DELETE \
        "$RANCHER_URL/v3/$endpoint/$binding"
    done
  done
}
```

## Conclusion

Automating user management in Rancher via the API and Terraform eliminates manual provisioning errors, enables consistent RBAC enforcement, and integrates with existing HR and identity management workflows. The Rancher API supports full CRUD operations on users and role bindings, enabling pipelines that automatically onboard new employees, sync AD group changes, and off-board departures. Store user definitions in version control for audit trails.
