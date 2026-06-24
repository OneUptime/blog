# How to Set Up the Helpdesk (Read-Only) Role in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Helpdesk, Read-Only, Access Control

Description: Configure the Helpdesk role in Portainer to grant read-only access to containers and logs for support teams without allowing any modifications.

---

This guide covers how to configure the built-in Helpdesk role in Portainer Business Edition for secure multi-user environments.

## Overview

Proper access control in Portainer ensures that users only have the permissions they need to do their jobs, following the principle of least privilege. In Portainer Business Edition, the Helpdesk role provides read-only access to all resources in an environment, including container and service logs, but does not allow resource changes or container console access.

## Configuration Steps

### Via the Portainer UI

1. From the menu, expand **Environment-related** and select **Environments**
2. Locate the environment you want to grant access to and click **Manage access**
3. Select the user or team, then choose the **Helpdesk** role
4. Click **Create access**

### Via the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List available roles and confirm the Helpdesk role ID.
# In current Portainer releases, Helpdesk is RoleId 2.

curl -s https://localhost:9443/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
for role in json.load(sys.stdin):
    print(f\"{role['Id']}: {role['Name']}\")
"

# Assign the Helpdesk role to team ID 3 on environment ID 1
# while preserving any existing team access policies.

PAYLOAD=$(curl -s https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
endpoint = json.load(sys.stdin)
team_policies = endpoint.get('TeamAccessPolicies') or {}
team_policies['3'] = {'RoleId': 2}
print(json.dumps({'TeamAccessPolicies': team_policies}))
")

curl -s -X PUT https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  --insecure | python3 -c "
import sys, json
endpoint = json.load(sys.stdin)
print('Team Policies:', endpoint.get('TeamAccessPolicies', {}))
"
```

## Role Reference

| Role ID | Role Name | Typical Use |
|---------|-----------|-------------|
| 1 | Environment Administrator | Team leads, senior engineers |
| 2 | Helpdesk | Support staff, auditors |
| 3 | Standard User | Developers |
| 4 | Read-Only User | Viewers, stakeholders |
| 5 | Operator | Operations team |

## Best Practices

- Assign roles based on job function, not seniority
- Use teams rather than individual user assignments for scalability
- Review access quarterly
- Use more restrictive roles for production environments
- Keep development environments more permissive

---

*Monitor your controlled infrastructure with [OneUptime](https://oneuptime.com) for full visibility.*
