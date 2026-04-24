# How to Create and Manage Users via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Users, Automation, RBAC

Description: Learn how to create, update, and delete Portainer users programmatically via the REST API, enabling automated user provisioning in large team environments.

## Introduction

Managing users manually in Portainer becomes impractical as team sizes grow. The Portainer API provides full CRUD operations for user management, enabling automated provisioning from HR systems, LDAP sync scripts, or infrastructure-as-code pipelines.

## Prerequisites

- Portainer CE or BE with admin access
- Valid admin JWT token or API access token
- `curl` and `jq` installed

## Step 1: List All Users

```bash
PORTAINER_URL="https://portainer.example.com"
TOKEN="your-admin-token"

# List all users

curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/users" | jq '.[] | {id: .Id, username: .Username, role: .Role}'

# Role values: 1 = Administrator, 2 = Standard user
```

## Step 2: Create a New User

```bash
# Create a standard user
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/users" \
  -d '{
    "Username": "john.doe",
    "Password": "SecureP@ss123!",
    "Role": 2
  }' | jq .

# Create an admin user
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/users" \
  -d '{
    "Username": "jane.admin",
    "Password": "SecureP@ss123!",
    "Role": 1
  }' | jq .
```

## Step 3: Get a Specific User

```bash
USER_ID=3

# Get user details
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/users/${USER_ID}" | jq .

# Find user by username
USERNAME="john.doe"
USER=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/users" | \
  jq --arg u "$USERNAME" '.[] | select(.Username == $u)')
echo "$USER" | jq .
```

## Step 4: Update a User

```bash
USER_ID=3

# Update user password
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/users/${USER_ID}" \
  -d '{
    "NewPassword": "NewSecureP@ss456!"
  }'

# Promote user to admin
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/users/${USER_ID}" \
  -d '{
    "Role": 1
  }'

# Demote admin to standard user
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/users/${USER_ID}" \
  -d '{
    "Role": 2
  }'
```

## Step 5: Delete a User

```bash
USER_ID=3

# Delete a user
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/users/${USER_ID}"

echo "User $USER_ID deleted."
```

## Step 6: Manage Team Memberships

```bash
# Create a team
TEAM_ID=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/teams" \
  -d '{"Name": "backend-team"}' | jq -r '.Id')

echo "Team created with ID: $TEAM_ID"

# Add a user to the team
USER_ID=3
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/team_memberships" \
  -d "{
    \"UserID\": $USER_ID,
    \"TeamID\": $TEAM_ID,
    \"Role\": 2
  }"
# role: 1 = Team Leader, 2 = Regular member

# List team members
curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/teams/${TEAM_ID}/memberships" | jq .

# Remove user from team
MEMBERSHIP_ID=1
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/team_memberships/${MEMBERSHIP_ID}"
```

## Step 7: Bulk User Provisioning Script

```bash
#!/bin/bash
# provision-users.sh - Create users from a CSV file

# users.csv format: username,password,role
# john.doe,TempPass123!,2
# jane.admin,TempPass123!,1

PORTAINER_URL="https://portainer.example.com"
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r '.jwt')

while IFS=',' read -r USERNAME PASSWORD ROLE; do
  # Skip header line
  [ "$USERNAME" = "username" ] && continue

  echo "Creating user: $USERNAME (role: $ROLE)..."

  RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/users" \
    -d "{\"Username\":\"$USERNAME\",\"Password\":\"$PASSWORD\",\"Role\":$ROLE}")

  USER_ID=$(echo "$RESPONSE" | jq -r '.Id // empty')

  if [ -n "$USER_ID" ]; then
    echo "  Created user '$USERNAME' with ID $USER_ID"
  else
    echo "  ERROR creating '$USERNAME': $RESPONSE"
  fi
done < users.csv

echo "User provisioning complete."
```

## Step 8: Sync Users with External Source

```python
#!/usr/bin/env python3
# sync-users.py - Sync Portainer users from an external list

import requests

PORTAINER_URL = "https://portainer.example.com"
API_KEY = "ptr_your_api_key"

headers = {"X-API-Key": API_KEY}

def get_existing_users():
    """Get all current Portainer users."""
    resp = requests.get(f"{PORTAINER_URL}/api/users", headers=headers)
    resp.raise_for_status()
    return {u["Username"]: u for u in resp.json()}

def create_user(username, password, role=2):
    """Create a new Portainer user."""
    resp = requests.post(f"{PORTAINER_URL}/api/users", headers=headers,
        json={"Username": username, "Password": password, "Role": role})
    resp.raise_for_status()
    return resp.json()

def update_user_role(user_id, role):
    """Update an existing user's role."""
    resp = requests.put(f"{PORTAINER_URL}/api/users/{user_id}", headers=headers,
        json={"Role": role})
    resp.raise_for_status()
    return resp.json()

def delete_user(user_id):
    """Delete a Portainer user."""
    resp = requests.delete(f"{PORTAINER_URL}/api/users/{user_id}", headers=headers)
    resp.raise_for_status()

# Desired user list (from LDAP, HR system, etc.)
desired_users = [
    {"username": "alice", "password": "TempPass123!", "role": 2},
    {"username": "bob", "password": "TempPass123!", "role": 2},
    {"username": "charlie", "password": "TempPass123!", "role": 1},
]

existing = get_existing_users()
desired_usernames = {u["username"] for u in desired_users}

# Create missing users
for user in desired_users:
    if user["username"] not in existing:
        created = create_user(user["username"], user["password"], user["role"])
        print(f"Created user: {user['username']} (ID: {created['Id']})")
    elif existing[user["username"]]["Role"] != user["role"]:
        updated = update_user_role(existing[user["username"]]["Id"], user["role"])
        print(f"Updated role for user: {user['username']} (role: {updated['Role']})")

# Delete users no longer present in the external source
for username, user in existing.items():
    if username not in desired_usernames and username != "admin":
        delete_user(user["Id"])
        print(f"Deleted user: {username} (ID: {user['Id']})")

print("Sync complete.")
```

## Conclusion

Managing Portainer users via the API enables scalable, automated user lifecycle management. Create users with appropriate roles during onboarding, manage team memberships as part of your access-control model, and script bulk provisioning to keep Portainer in sync with your organization's user directory. For enterprise setups, consider integrating with LDAP/SAML for automated authentication alongside API-based access management.
