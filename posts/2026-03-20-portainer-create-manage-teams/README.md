# How to Create and Manage Teams in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Team, User Management, RBAC, Administration

Description: Create and manage teams in Portainer to group users and control their access to environments and resources.

## Introduction

Teams in Portainer are groups of users that share the same access permissions to environments. Instead of assigning environment access user-by-user, you assign access to a team and add users to that team. This makes access management scalable and consistent across your organization.

## Understanding Teams

A team in Portainer:
- Can contain zero or more users
- Can be assigned access to one or more environments
- Supports team leader roles for internally managed teams (team leaders can manage team membership)
- Can integrate with LDAP and OAuth for automatic team population

## Creating Teams via the Web UI

### Step 1: Navigate to Teams

1. Log in as administrator
2. Go to **User-related** → **Teams**

### Step 2: Name and Create the Team

```text
Team name: DevOps
```

Click **Create team**.

## Creating Teams via the API

```bash
# Get admin token

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a team
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/teams \
  -d '{
    "Name": "DevOps"
  }'

# Response: {"Id":1,"Name":"DevOps"}
```

## Listing Teams

```bash
# Get all teams
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams \
  | python3 -m json.tool
```

## Renaming a Team

```bash
# Rename team ID 1 to "Platform Engineering"
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/teams/1 \
  -d '{
    "Name": "Platform Engineering"
  }'
```

## Deleting a Team

```bash
# Delete team ID 1
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams/1

# Note: Users in the team are not deleted, just removed from the team
```

## Getting Team Members

```bash
# List members of team ID 1
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams/1/memberships \
  | python3 -m json.tool
```

## Team Membership Roles

Within a team, members can have one of two roles:

| Role | Description |
|------|-------------|
| **Member** | Regular team member, inherits team permissions |
| **Team Leader** | Can add/remove team members, see team membership |

```bash
# Add user ID 3 to team ID 1 as a member (role: 2)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/team_memberships \
  -d '{
    "UserID": 3,
    "TeamID": 1,
    "Role": 2
  }'

# Role values:
# 1 = Team Leader
# 2 = Member
```

## Assigning Teams to Environments

After creating a team, grant it access to environments via the environment settings UI or by updating the environment's access policies with the API:

```bash
# Get environment (endpoint) list
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "import sys,json; [print(f'ID={e[\"Id\"]} Name={e[\"Name\"]}') for e in json.load(sys.stdin)]"

# Assign team access by updating TeamAccessPolicies with PUT /api/endpoints/{id}
# or use the environment access UI
```

Via the UI:
1. Go to **Environment-related** → **Environments**
2. Locate the environment and click **Manage access**
3. Add the team with the desired role

## Creating Teams at Scale with a Script

```bash
#!/bin/bash
# create-teams.sh - Create multiple teams from a list

PORTAINER_URL="https://portainer.example.com"
TOKEN="your-admin-token"

TEAMS=("DevOps" "QA" "Backend" "Frontend" "Security" "DataEngineering")

for team_name in "${TEAMS[@]}"; do
  RESULT=$(curl -s -X POST \
    "${PORTAINER_URL}/api/teams" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"Name\":\"${team_name}\"}")

  TEAM_ID=$(echo $RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Id','error'))")
  echo "Created team '${team_name}' with ID: ${TEAM_ID}"
done
```

## Best Practices

- Structure teams around organizational boundaries (departments, squads, projects)
- Use team leaders for team self-management in larger organizations
- Prefer team-based access over individual user access for maintainability
- Integrate with LDAP/OAuth groups to auto-populate teams

## Conclusion

Teams are the core organizational unit for access control in Portainer. By creating teams that mirror your organization structure and assigning environment access at the team level, you create a scalable and auditable permission model. When integrated with LDAP or OAuth, team membership can be fully automated.
