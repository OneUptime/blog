# How to Create and Manage User Accounts in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, User Management, Administration, RBAC, Security

Description: Create, configure, and manage user accounts in Portainer including role assignment, password management, and access control.

## Introduction

Portainer supports multiple user accounts with different roles and permissions. Whether you're onboarding a new team member or managing access for a large organization, understanding user account management is fundamental to operating Portainer securely. This guide covers creating users via the UI and API.

## User Roles in Portainer

Before creating users, understand the available account roles:

| Role | Description |
|------|-------------|
| **Administrator** | Full access to all environments and settings |
| **Standard User** | Limited access based on team and environment permissions |

In Portainer Business Edition, environment-level RBAC roles such as Helpdesk, Operator, Read-Only User, and Environment administrator are assigned separately to users or teams.

## Creating Users via the Web UI

### Step 1: Access User Management

1. Log in as an administrator
2. Navigate to **User-related** → **Users**
3. Click **Add user**

### Step 2: Fill in User Details

```text
Username:     john.doe
Password:     [set a strong password]
Administrator: No (enable only if this user should be an admin)
Teams:        [optional]
```

### Step 3: Assign to Teams (Optional)

After creating the user, you can assign them to teams, and then grant those teams access to specific environments.

## Creating Users via the API

```bash
# Get admin token

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a standard user
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/users \
  -d '{
    "username": "john.doe",
    "password": "SecureP@ssword123",
    "role": 2
  }'

# Role values:
# 1 = Administrator
# 2 = Standard User
```

## Listing All Users

```bash
# List all users
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/users \
  | python3 -m json.tool
```

## Updating a User

```bash
# Promote user ID 3 to administrator
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/users/3 \
  -d '{
    "username": "john.doe",
    "role": 1
  }'
```

## Deleting a User

```bash
# Delete user by ID
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/users/3
```

## Bulk User Creation Script

For onboarding multiple users at once:

```bash
#!/bin/bash
# bulk-create-users.sh

PORTAINER_URL="https://portainer.example.com"
ADMIN_PASS="adminpassword"

# Get token
TOKEN=$(curl -s -X POST \
  "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PASS}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# User list: "username:password:role" (1=admin, 2=user)
USERS=(
  "alice:Alice@2024!:2"
  "bob:Bob@2024!:2"
  "charlie:Charlie@2024!:1"
)

for user_entry in "${USERS[@]}"; do
  IFS=':' read -r username password role <<< "$user_entry"

  RESULT=$(curl -s -X POST \
    "${PORTAINER_URL}/api/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"role\":${role}}")

  echo "Created user ${username}: $(echo $RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'ID={d.get(\"Id\",\"error\")}')")"
done
```

## Password Management

### Force Password Change on Next Login

Portainer doesn't have a built-in "force password change" feature, but you can:

1. Set a temporary password when creating the account
2. Communicate the temporary password to the user
3. Instruct them to change it immediately via their profile menu → **My account**

### Reset a User's Password (Admin)

```bash
# Reset password for user ID 3
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/users/3 \
  -d '{
    "newPassword": "TemporaryPass123!"
  }'
```

## Best Practices

- Use service accounts (dedicated non-human users) for API automation
- Assign users to teams rather than directly to environments for easier management
- Regularly audit user accounts and remove inactive ones
- Use descriptive usernames that identify the person (not generic names like `user1`)

## Conclusion

Portainer's user management system provides the building blocks for access control. Creating users via the API enables automation and integration with HR workflows. Combine user accounts with teams and environment permissions to build a least-privilege access model appropriate for your organization's size and structure.
