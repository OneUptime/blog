# How to Assign Users to Teams in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Team, User Management, RBAC, Administration

Description: Add users to Portainer teams via the UI and API, and configure team leadership roles for delegated team management.

## Introduction

Once you've created users and teams in Portainer, the next step is assigning users to teams. Team membership determines which environments users can access and with what permissions. This guide covers the UI, API, and scripted approaches for managing team membership.

## Prerequisites

- Portainer running with at least one admin account
- Teams already created
- User accounts already created

## Method 1: Assign Users via Web UI

### Add User to a Team (from the Team View)

1. Navigate to **User-related** → **Teams**
2. Click on the team name (e.g., "DevOps")
3. In the **Users** list, click **Add** next to the user
4. To promote the user to **Team Leader**, use the **Leader** action in the **Members** list

### Add User to Teams (during User Creation)

1. Navigate to **User-related** → **Users**
2. Click **Add user**
3. Enter the user's details and, under **Add to team(s)**, select one or more teams
4. Click **Create user**

## Method 2: Assign Users via API

### Add a User to a Team

```bash
# Get admin token

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add user (ID: 3) to team (ID: 1) as a Member
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/team_memberships \
  -d '{
    "userID": 3,
    "teamID": 1,
    "role": 2
  }'

# Role values:
# 1 = Team Leader (can manage team membership)
# 2 = Member (regular access)
```

### List All Team Memberships

```bash
# Get memberships for team ID 1
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams/1/memberships \
  | python3 -m json.tool

# Example output:
# [
#   {"Id": 1, "UserID": 3, "TeamID": 1, "Role": 2},
#   {"Id": 2, "UserID": 5, "TeamID": 1, "Role": 1}
# ]
```

### Update a User's Team Role

```bash
# Get the membership ID first
MEMBERSHIP_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams/1/memberships \
  | python3 -c "import sys,json; members=json.load(sys.stdin); [print(m['Id']) for m in members if m['UserID']==3]")

# Update membership role to Team Leader (1)
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/team_memberships/${MEMBERSHIP_ID}" \
  -d '{
    "userID": 3,
    "teamID": 1,
    "role": 1
  }'
```

### Remove a User from a Team

```bash
# Delete membership by membership ID
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/team_memberships/${MEMBERSHIP_ID}"
```

## Bulk Assignment Script

Assign multiple users to a team at once:

```bash
#!/bin/bash
# assign-users-to-team.sh

PORTAINER_URL="https://portainer.example.com"
TEAM_ID=1  # DevOps team

# Get admin token
TOKEN=$(curl -s -X POST \
  "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get all users
USERS=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/users" \
  | python3 -c "import sys,json; [print(f\"{u['Id']}:{u['Username']}\") for u in json.load(sys.stdin)]")

# List of usernames to add to the team
TARGET_USERS=("alice" "bob" "charlie")

echo "$USERS" | while IFS=: read user_id username; do
  if [[ " ${TARGET_USERS[@]} " =~ " ${username} " ]]; then
    RESULT=$(curl -s -X POST \
      "${PORTAINER_URL}/api/team_memberships" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"userID\":${user_id},\"teamID\":${TEAM_ID},\"role\":2}")
    echo "Added $username (ID:$user_id) to team $TEAM_ID: $RESULT"
  fi
done
```

## Team Leader Capabilities

Team leaders can:
- View team membership
- Add users to the team
- Remove users from the team
- Assign/revoke team leader roles for other members

Team leaders **cannot**:
- Modify environment access permissions for the team
- Create or delete teams
- Access environments not assigned to the team

If external authentication is enabled and teams are synchronized from your identity provider, the team leader role is disabled.

## Verifying Team Memberships

```bash
# Check which teams a specific user belongs to
USER_ID=3
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/users/${USER_ID}/memberships" \
  | python3 -m json.tool
```

## Conclusion

Team membership is the primary mechanism for granting environment access to groups of users in Portainer. The API approach enables automation and integration with user provisioning systems. For LDAP and OAuth deployments, team membership can be synchronized automatically from LDAP group membership or OAuth claims, eliminating manual assignment.
