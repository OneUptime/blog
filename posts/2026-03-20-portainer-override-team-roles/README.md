# How to Override Team Roles for Individual Users in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Team, User Roles, Access Control, Override

Description: Override a team's default role for individual users to grant exceptions, such as giving one team member elevated access or restricting a specific user.

## Introduction

Sometimes you need to give one team member a different role than the rest of their team. For example, a tech lead might need Standard User access while their team has Helpdesk-only access. Or a contractor might need more restrictive access than their team. Portainer supports per-user access policies that override team-level policies.

This guide applies to **Portainer Business Edition**, where RBAC roles such as Helpdesk and Standard User are available.

## How Role Overrides Work

Portainer resolves a user's effective role using this priority order:
1. **Direct user access policy on the environment** (highest priority)
2. **User access policy inherited from the environment group**
3. **Team access policy on the environment**
4. **Team access policy inherited from the environment group**

When both a user policy and team policy exist for the same environment, the **direct user policy** takes effect. If a user inherits access from multiple teams at the same precedence level, Portainer resolves that using role priority.

**Important**: A direct user policy can grant either a higher or lower role than the user's team access because the user-level policy takes precedence for that environment.

## Granting Elevated Access to One User

Scenario: The `qa-team` has Helpdesk access to production, but the QA lead needs Standard User access.

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Built-in role IDs for these examples: Helpdesk=2, Standard user=3

# Team 3 (QA team) has Helpdesk access to environment 1

# Add direct Standard User access for user 7 (QA lead) in environment 1

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d '{
    "UserAccessPolicies": {
      "7": {"RoleId": 3}
    }
  }'
# User 7 now has Standard User access even though their team only has Helpdesk
```

## Getting Current User Access Policies

```bash
ENDPOINT_ID=1

# View all user and team access policies for an environment
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  | python3 -c "
import sys, json
e = json.load(sys.stdin)

print('=== Team Access Policies ===')
for team_id, policy in (e.get('TeamAccessPolicies') or {}).items():
    print(f'  Team {team_id}: RoleId={policy.get(\"RoleId\")}')

print('=== User Access Policies ===')
for user_id, policy in (e.get('UserAccessPolicies') or {}).items():
    print(f'  User {user_id}: RoleId={policy.get(\"RoleId\")}')
"
```

## Adding Multiple User Overrides

```bash
# Give multiple users direct access in one API call
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d '{
    "UserAccessPolicies": {
      "7": {"RoleId": 3},
      "9": {"RoleId": 3},
      "11": {"RoleId": 2}
    }
  }'
```

Note: This replaces ALL user access policies for the environment. Include all users you want to have direct policies.

## Removing a User Override

```bash
# To remove user 7's direct policy, submit the list without them
# Get current policies first, then submit without the user you want to remove

CURRENT=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1" \
  | python3 -c "
import sys, json
e = json.load(sys.stdin)
policies = e.get('UserAccessPolicies', {})
# Remove user 7
policies.pop('7', None)
print(json.dumps({'UserAccessPolicies': policies}))
")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d "$CURRENT"
```

## Verifying Effective Access

Portainer's Effective access viewer in the UI is the easiest way to confirm the resolved role for a user. Via the API, you can at least confirm which environments the user can access:

```bash
# Login as the user and confirm which environments they can access
USER_TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"qa-lead","password":"password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Check accessible environments
curl -s \
  -H "Authorization: Bearer $USER_TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for env in envs:
    print(f'Environment: {env[\"Name\"]} (ID={env[\"Id\"]})')
"
```

To confirm the exact resolved role, use **User-related → Roles → Effective access viewer** in the Portainer UI.

## Alternative: Team Subsets

For complex scenarios with many exceptions, consider creating sub-teams:

```text
qa-team → all QA engineers → Helpdesk access to Production
qa-leads → QA team leaders → Standard User access to Production

(Alice is in both qa-team and qa-leads - her effective role is Standard User)
```

This avoids per-user exceptions and keeps the access model team-based.

## Conclusion

User-level access overrides in Portainer provide flexibility for exception cases without restructuring your team setup. The key rule is that a direct user policy on an environment takes precedence over team or inherited group access for that environment, so it can grant either a higher or lower role than the team would otherwise provide. For many exceptions, consider whether creating more granular teams would be cleaner than maintaining individual overrides.
