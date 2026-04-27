# How to Override Team Roles for Individual Users in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Team, User Override, Access Control

Description: Learn how to grant individual users different permissions than their team assignment in Portainer for exceptions to group-based access policies.

---

While team-based access control scales well, sometimes a specific user needs a different permission level than their team. Portainer allows per-user policy overrides that take precedence over team assignments.

## How User Policy Overrides Work

Portainer resolves a user's effective authorizations on an environment by checking these sources **in order**, and the first one that matches wins:

1. User policy on the environment
2. User policy on the environment's group
3. Team policy on the environment (highest-priority role across the user's teams)
4. Team policy on the environment's group

That means an individual user policy on the environment always overrides the team policy on the same environment - regardless of which role is more permissive. For example:

- Team `HelpDesk` + User `Standard User` on the same environment → User gets Standard User access.
- Team `Endpoint Administrator` + User `Read-Only User` on the same environment → User gets Read-Only access.

The built-in roles in Portainer CE are Endpoint Administrator (RoleId `1`), HelpDesk (`2`), Standard User (`3`), and Read-Only User (`4`). To restrict a user below their team level, simply assign an individual policy with the lower role - the user policy will replace the team's effective role on that environment.

## Assign Individual User Policy

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# View current access policies for environment 1

curl -s https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
e = json.load(sys.stdin)
print('Team Policies:', e.get('TeamAccessPolicies', {}))
print('User Policies:', e.get('UserAccessPolicies', {}))
"

# Grant user ID 7 Endpoint Administrator access (overriding their team's HelpDesk role)
# Note: UserAccessPolicies in the body REPLACES the existing user policies for this environment,
# so include every user that should retain access.
curl -X PUT \
  https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"UserAccessPolicies": {"7": {"RoleId": 1}}}' \
  --insecure

echo "User override policy applied"
```

## Remove an Individual Override

```bash
# Remove the user-specific override (user falls back to team role)
# Send an empty UserAccessPolicies map to clear all user policies for this environment.
curl -X PUT \
  https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"UserAccessPolicies": {}}' \
  --insecure
# Note: This removes ALL user policies on this environment. Use cautiously.
```

## Practical Use Cases

**Temporary elevated access**: Grant an on-call engineer Endpoint Administrator access to a production environment for a limited period:

```bash
# Grant temporary Endpoint Administrator access to on-call user
curl -X PUT https://localhost:9443/api/endpoints/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"UserAccessPolicies": {"12": {"RoleId": 1}}}' --insecure
echo "Temporary admin access granted to user 12"

# After incident resolves, remove the override
curl -X PUT https://localhost:9443/api/endpoints/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"UserAccessPolicies": {}}' --insecure
echo "Temporary access removed"
```

---

*Track all access control changes with [OneUptime](https://oneuptime.com) audit logging and monitoring.*
