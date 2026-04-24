# How to Configure Per-Environment Access Control in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Access Control, Environment, RBAC, Team

Description: Set up granular access control for individual Portainer environments, controlling which users and teams can access each environment and with what role.

## Introduction

Per-environment access control is how you implement least-privilege access in Portainer. Instead of giving users broad access to all environments, you assign specific roles for each environment individually. This guide covers configuring environment-level access for users and teams, and how policy-driven access affects direct assignments. Role-based per-environment roles such as Environment administrator, Helpdesk, and Standard User require Portainer Business Edition; Portainer CE supports basic user and group assignments.

## Understanding Environment Access Architecture

Each Portainer environment has its own access policies:
- **User access policies**: Direct user-to-environment assignments
- **Team access policies**: Team-to-environment assignments

A user's effective access in an environment can come from:
1. A direct user or team access policy on the environment
2. Access inherited from the environment's group
3. A policy applied to the environment or environment group

If direct environment access is added for a user who already inherits access from a group, Portainer treats the direct assignment as an override for that environment. If access is controlled by a policy, the policy takes precedence. Standard User is not environment-wide administration: it controls resources owned by the user or their team, while Environment administrator is the per-environment role with full access inside an environment. Global admin always has access to everything.

## Configuring Environment Access via UI

1. Go to **Environments** in the left menu
2. Locate the environment in the list
3. Click **Manage access** at the end of the row
4. Add users or teams and select their role

If access is controlled by a policy, update the policy instead because policy access takes precedence.

## Configuring Environment Access via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

ROLES=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/roles)

role_id() {
  local role_name="$1"
  printf '%s' "$ROLES" | python3 -c "
import json, sys
target = sys.argv[1].lower().replace(' ', '')
for role in json.load(sys.stdin):
    name = role['Name'].lower().replace(' ', '')
    if name == target:
        print(role['Id'])
        break
else:
    raise SystemExit(f'Role not found: {sys.argv[1]}')
" "$role_name"
}

STANDARD_USER_ROLE_ID=$(role_id "Standard User")
HELPDESK_ROLE_ID=$(role_id "Helpdesk")

# Set team and user access policies for environment 1
# Team 2 = DevOps (Standard User), Team 3 = QA (Standard User), Team 4 = Support (Helpdesk)
# User 5 = alice (Standard User), User 6 = bob (Helpdesk)
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d "{
    \"TeamAccessPolicies\": {
      \"2\": {\"RoleId\": ${STANDARD_USER_ROLE_ID}},
      \"3\": {\"RoleId\": ${STANDARD_USER_ROLE_ID}},
      \"4\": {\"RoleId\": ${HELPDESK_ROLE_ID}}
    },
    \"UserAccessPolicies\": {
      \"5\": {\"RoleId\": ${STANDARD_USER_ROLE_ID}},
      \"6\": {\"RoleId\": ${HELPDESK_ROLE_ID}}
    }
  }"
```

## Access Control Design Patterns

### Pattern 1: Environment-Per-Project

```text
Production Environment:
  - Platform team: Environment administrator
  - DevOps team: Standard User (team-owned resources)
  - Support team: Helpdesk

Staging Environment:
  - Platform team: Environment administrator
  - DevOps team: Standard User (team-owned resources)
  - QA team: Standard User (team-owned resources)
  - Support team: Standard User (team-owned resources)

Development Environment:
  - All developers: Standard User (team-owned resources)
  - Everyone else: Helpdesk
```

### Pattern 2: Environment-Per-Team

```text
Backend Environment:
  - Backend team: Standard User (team-owned resources)
  - Everyone else: No access

Frontend Environment:
  - Frontend team: Standard User (team-owned resources)
  - Backend team: Helpdesk (view only)
  - Everyone else: No access
```

## Reviewing Current Access Policies

```bash
# Get all environment access policies
ENDPOINT_ID=1

# Team policies
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  | python3 -c "
import sys, json
e = json.load(sys.stdin)
team_policies = e.get('TeamAccessPolicies', {})
user_policies = e.get('UserAccessPolicies', {})
print('Team Access Policies:')
for team_id, policy in team_policies.items():
    print(f'  Team {team_id}: RoleId={policy.get(\"RoleId\")}')
print('User Access Policies:')
for user_id, policy in user_policies.items():
    print(f'  User {user_id}: RoleId={policy.get(\"RoleId\")}')
"
```

## Removing Access

```bash
# Remove a team from an environment while keeping existing user access policies

# Build an updated payload without team ID 3
PAYLOAD=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1" \
  | python3 -c "
import sys, json
endpoint = json.load(sys.stdin)
team_policies = endpoint.get('TeamAccessPolicies', {})
user_policies = endpoint.get('UserAccessPolicies', {})
team_policies.pop('3', None)
print(json.dumps({
    'TeamAccessPolicies': team_policies,
    'UserAccessPolicies': user_policies,
}))
")

echo "Updated payload: $PAYLOAD"

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d "$PAYLOAD"
```

## Bulk Access Configuration Script

```bash
#!/bin/bash
# configure-environment-access.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com"

ROLES=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/roles")

role_id() {
  local role_name="$1"
  printf '%s' "$ROLES" | python3 -c "
import json, sys
target = sys.argv[1].lower().replace(' ', '')
for role in json.load(sys.stdin):
    name = role['Name'].lower().replace(' ', '')
    if name == target:
        print(role['Id'])
        break
else:
    raise SystemExit(f'Role not found: {sys.argv[1]}')
" "$role_name"
}

# Environment access mapping: "endpoint_id:team_id:role_name"
ACCESS_CONFIG=(
  "1:2:Standard User"   # Env 1, DevOps (team 2), Standard User
  "1:3:Standard User"   # Env 1, QA (team 3), Standard User
  "1:4:Helpdesk"        # Env 1, Support (team 4), Helpdesk
  "2:2:Standard User"   # Env 2, DevOps, Standard User
  "2:4:Helpdesk"        # Env 2, Support, Helpdesk
)

# Build access policies per environment
declare -A ENV_POLICIES
declare -A ROLE_IDS

for config in "${ACCESS_CONFIG[@]}"; do
  IFS=':' read -r endpoint_id team_id role_name <<< "$config"

  if [[ -z "${ROLE_IDS[$role_name]}" ]]; then
    ROLE_IDS[$role_name]=$(role_id "$role_name")
  fi

  resolved_role_id="${ROLE_IDS[$role_name]}"

  if [[ -n "${ENV_POLICIES[$endpoint_id]}" ]]; then
    ENV_POLICIES[$endpoint_id]+=","
  fi

  ENV_POLICIES[$endpoint_id]+="\"${team_id}\":{\"RoleId\":${resolved_role_id}}"
done

# Apply policies
for endpoint_id in "${!ENV_POLICIES[@]}"; do
  TEAM_POLICY_JSON="{${ENV_POLICIES[$endpoint_id]}}"
  USER_POLICIES=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "${PORTAINER_URL}/api/endpoints/${endpoint_id}" \
    | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('UserAccessPolicies', {})))")

  PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({
    'TeamAccessPolicies': json.loads(sys.argv[1]),
    'UserAccessPolicies': json.loads(sys.argv[2]),
}))
" "$TEAM_POLICY_JSON" "$USER_POLICIES")

  echo "Setting access for endpoint $endpoint_id: $PAYLOAD"
  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/${endpoint_id}" \
    -d "$PAYLOAD"
done
```

## Conclusion

Per-environment access control is the foundation of Portainer's least-privilege model. By assigning specific roles to specific teams for each environment, you create a fine-grained permission structure that reflects your organization's actual needs. Audit these policies regularly to remove access that's no longer needed and to ensure new environments are properly secured from day one.
