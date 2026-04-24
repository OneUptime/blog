# How to Apply Access Policies to Environment Groups in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment Groups, Access Control, RBAC, Team, Business Edition

Description: Assign team access policies to Portainer environment groups to efficiently manage permissions across multiple environments with a single configuration.

## Introduction

Managing access control individually for each environment becomes impractical as your Portainer installation grows. Environment groups let you bundle related environments (by stage, region, or team) and then assign a single access policy that applies to all environments in the group simultaneously. This guide covers applying group-level access policies via the Portainer UI and API.

## Understanding Group Access Policies

When you assign a team to an environment group with a specific role, that assignment applies to every environment in the group. If you later add a new environment to the group, the team automatically gains access to it with the same role.

```mermaid
graph TD
    G[Environment Group: Production] --> E1[prod-us-east]
    G --> E2[prod-eu-west]
    G --> E3[prod-ap-southeast]
    T[Backend Team] -->|Operator role| G
    T2[Platform Team] -->|Environment Admin| G
```

## Step 1: Create an Environment Group

### Via Web UI

1. From the menu, expand **Environment-related**
2. Select **Groups**
3. Click **Add group**
4. Enter a name (e.g., "Production"), optional description
5. Select the environments to include
6. Click **Create**

### Via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a group with three environments

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoint_groups \
  -d '{
    "name": "Production",
    "description": "All production environments",
    "associatedEndpoints": [1, 2, 3]
  }'
```

## Step 2: Assign Team Access Policy to a Group

### Via Web UI

1. From the menu, expand **Environment-related** and select **Groups**
2. Locate the group you want to configure
3. Click **Manage access**
4. Select the team and the role to assign
5. Click **Create access**

### Via API

Built-in role IDs used in these examples:
- `1` = Environment Administrator
- `2` = Helpdesk
- `3` = Standard User
- `4` = Read-Only User
- `5` = Operator

```bash
# Get all teams to find team IDs
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams \
  | python3 -c "import sys,json; [print(f'ID:{t[\"Id\"]} Name:{t[\"Name\"]}') for t in json.load(sys.stdin)]"

GROUP_ID=1

# Assign Backend Team (ID: 2) as Operator to the Production group
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  -d '{"TeamAccessPolicies": {"2": {"RoleId": 5}}}'

# Assign Platform Team (ID: 1) as Environment Administrator
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  -d '{"TeamAccessPolicies": {"1": {"RoleId": 1}, "2": {"RoleId": 5}}}'
```

## Step 3: Verify Access Propagation

After assigning the policy to the group, verify that the group contains the expected team access policy and that the environment is associated with the group:

```bash
# Check the group's team access policies
GROUP_ID=1
ENDPOINT_ID=1
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  | python3 -c "
import sys, json
g = json.load(sys.stdin)
print('Group team policies:', g.get('TeamAccessPolicies', {}))
print('Group user policies:', g.get('UserAccessPolicies', {}))
"

# Check that the environment belongs to the group
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  | python3 -c "
import sys, json
e = json.load(sys.stdin)
print('Environment group:', e.get('GroupId'))
print('Environment team policies:', e.get('TeamAccessPolicies', {}))
"
```

Group-level access is inherited when Portainer evaluates authorization, so an environment's own `TeamAccessPolicies` can remain empty unless you also define an environment-level override.

## Bulk Access Policy Configuration Script

Apply consistent access policies across multiple groups:

```bash
#!/bin/bash
# configure-group-access.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com"

# Group access assignments: "group_id:team_id:role_id"
ASSIGNMENTS=(
  "1:1:1"   # Production group: Platform Team = Environment Admin
  "1:2:5"   # Production group: Backend Team = Operator
  "1:3:2"   # Production group: Support Team = Helpdesk
  "2:1:1"   # Staging group: Platform Team = Environment Admin
  "2:2:3"   # Staging group: Backend Team = Standard User
  "3:1:1"   # Development group: Platform Team = Environment Admin
  "3:2:3"   # Development group: Backend Team = Standard User
  "3:4:3"   # Development group: Frontend Team = Standard User
)

declare -A GROUP_POLICIES

# Build per-group policy objects
for assignment in "${ASSIGNMENTS[@]}"; do
  IFS=':' read -r group_id team_id role_id <<< "$assignment"
  if [[ -z "${GROUP_POLICIES[$group_id]}" ]]; then
    GROUP_POLICIES[$group_id]="{\"${team_id}\": {\"RoleId\": ${role_id}}"
  else
    GROUP_POLICIES[$group_id]="${GROUP_POLICIES[$group_id]}, \"${team_id}\": {\"RoleId\": ${role_id}}"
  fi
done

# Apply policies to each group
for group_id in "${!GROUP_POLICIES[@]}"; do
  POLICY_JSON="{\"TeamAccessPolicies\": ${GROUP_POLICIES[$group_id]}}"
  echo "Applying to group ${group_id}: ${POLICY_JSON}"
  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoint_groups/${group_id}" \
    -d "${POLICY_JSON}"
done

echo "Done"
```

## Adding a New Environment to a Group

When you add a new environment to an existing group, it inherits all team access policies:

```bash
# Add environment ID 5 to group ID 1 (inherits all team access policies)
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoint_groups/1/endpoints/5"
```

The teams that had access to the Production group now automatically have access to environment 5 with their existing roles.

## Revoking Access from a Group

```bash
# Remove all team policies from a group
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  -d '{"TeamAccessPolicies": {}}'

# Remove a specific team's access (keep others)
# To remove Backend Team (ID: 2), only include the teams you want to KEEP
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  -d '{"TeamAccessPolicies": {"1": {"RoleId": 1}}}'
```

## Best Practices

**Use groups as the primary access control unit**: Avoid assigning per-environment access when groups can handle it. Per-environment overrides are harder to audit.

**Name groups for their purpose**: Use names like "Production", "Staging EU", or "Team Alpha Environments" to make access policies self-documenting.

**Limit who can modify groups**: Only system administrators should manage group membership and access policies. Use team roles carefully.

**Audit regularly**: Review group access policies periodically to remove teams that no longer need access to production environments.

## Conclusion

Group-level access policies dramatically simplify permission management in large Portainer deployments. Instead of configuring access for every environment individually, you configure it once per group, and Portainer propagates the policy to all member environments. When teams change scope or new environments are added, updating the group policy updates access everywhere simultaneously - reducing administrative overhead and the risk of misconfigured permissions.
