# How to Manage Teams and Roles via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Team, RBAC, Access Control

Description: Learn how to create teams, manage memberships, and assign environment access using the Portainer REST API.

## Teams API Overview

Teams in Portainer group users together for environment access control. Instead of assigning access user-by-user, you assign it to teams.

| Endpoint | Method | Action |
|----------|--------|--------|
| `/api/teams` | GET | List teams visible to the current user |
| `/api/teams` | POST | Create a team |
| `/api/teams/{id}` | PUT | Update a team |
| `/api/teams/{id}` | DELETE | Delete a team |
| `/api/team_memberships` | GET | List team memberships |
| `/api/team_memberships` | POST | Add member to team |
| `/api/team_memberships/{id}` | DELETE | Remove member from team |

## Creating a Team

```bash
# Create a new team

curl -X POST "${PORTAINER_URL}/api/teams" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"Name": "frontend-team"}'

# Response
# {"Id": 3, "Name": "frontend-team"}
```

## Listing Teams

```bash
# List teams visible to the current user
curl -s "${PORTAINER_URL}/api/teams" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | {id: .Id, name: .Name}]'
```

## Adding Users to a Team

```bash
# Add a user to a team
# Role 1 = Team Leader, Role 2 = Team Member
curl -X POST "${PORTAINER_URL}/api/team_memberships" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "TeamID": 3,
    "UserID": 7,
    "Role": 2
  }'

# Add multiple users to a team
for USER_ID in 7 8 9 10; do
  curl -X POST "${PORTAINER_URL}/api/team_memberships" \
    -H "X-API-Key: ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"TeamID\": 3, \"UserID\": ${USER_ID}, \"Role\": 2}"
done
```

## Listing Team Memberships

```bash
# Get all memberships for a team
curl -s "${PORTAINER_URL}/api/teams/3/memberships" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | {userId: .UserID, role: (if .Role == 1 then "leader" else "member" end)}]'
```

## Removing a User from a Team

```bash
# First, find the membership ID
MEMBERSHIP_ID=$(curl -s "${PORTAINER_URL}/api/team_memberships" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq --argjson teamId 3 --argjson userId 7 \
  '.[] | select(.TeamID == $teamId and .UserID == $userId) | .Id')

# Delete the membership
curl -X DELETE "${PORTAINER_URL}/api/team_memberships/${MEMBERSHIP_ID}" \
  -H "X-API-Key: ${API_TOKEN}"
```

## Granting Team Access to an Environment

```bash
# Role IDs here are environment roles, not team membership roles.
curl -s "${PORTAINER_URL}/api/roles" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | {id: .Id, name: .Name}]'

# Read the current environment team policies
CURRENT_TEAM_POLICIES=$(curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '.TeamAccessPolicies // {}')

# Grant team 3 the Standard user role (RoleId 3) without overwriting other team policies
curl -X PUT "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc \
    --argjson policies "${CURRENT_TEAM_POLICIES}" \
    --arg teamId "3" \
    --argjson roleId 3 \
    '{TeamAccessPolicies: ($policies + {($teamId): {RoleId: $roleId}})}')"
```

## Full Onboarding Automation

```bash
#!/bin/bash
# Onboard a new developer: create user, add to team, grant environment access

API_TOKEN="${PORTAINER_API_TOKEN}"
PORTAINER_URL="https://portainer.mycompany.com"

USERNAME="$1"
TEAM_NAME="$2"
ENDPOINT_ID="$3"
ROLE_ID="${4:-3}" # 3 = Standard user

# Assumes Portainer internal authentication is enabled for local user creation.
# Create user
USER_ID=$(curl -s -X POST "${PORTAINER_URL}/api/users" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${USERNAME}\",\"Password\":\"$(openssl rand -base64 12)\",\"Role\":2}" \
  | jq '.Id')

# Find team ID
TEAM_ID=$(curl -s "${PORTAINER_URL}/api/teams" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq --arg name "$TEAM_NAME" '.[] | select(.Name == $name) | .Id')

# Add to team
curl -s -X POST "${PORTAINER_URL}/api/team_memberships" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"TeamID\":${TEAM_ID},\"UserID\":${USER_ID},\"Role\":2}"

# Read the current environment team policies
CURRENT_TEAM_POLICIES=$(curl -s "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '.TeamAccessPolicies // {}')

# Grant the team access to the environment without overwriting other team policies
curl -s -X PUT "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc \
    --argjson policies "${CURRENT_TEAM_POLICIES}" \
    --arg teamId "${TEAM_ID}" \
    --argjson roleId "${ROLE_ID}" \
    '{TeamAccessPolicies: ($policies + {($teamId): {RoleId: $roleId}})}')"

echo "Onboarded ${USERNAME} (ID: ${USER_ID}) to team ${TEAM_NAME} and granted environment access on ${ENDPOINT_ID}"
```

## Conclusion

The Portainer teams and roles API enables automated user provisioning that scales with your team. Connect it to your HR system or identity provider to automatically grant and revoke access as people join and leave the organization.
