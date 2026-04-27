# How to Configure Per-Environment Access Control in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Access Control, Environment, Business Edition

Description: Learn how to configure different access levels for individual environments in Portainer so users see only what they need.

---

This guide covers how to configure How to Configure Per-Environment Access Control in Portainer in Portainer for secure multi-user environments.

## Overview

Proper access control in Portainer ensures that users only have the permissions they need to do their jobs, following the principle of least privilege.

## Configuration Steps

### Via the Portainer UI

1. Navigate to the relevant section in the Portainer admin interface
2. Select the environment, user, or team to configure
3. Assign the appropriate role
4. Save the configuration

### Via the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List current access policies for environment ID 1

curl -s https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
e = json.load(sys.stdin)
print('Team Policies:', e.get('TeamAccessPolicies', {}))
print('User Policies:', e.get('UserAccessPolicies', {}))
"
```

## Role Reference

| Role ID | Role Name | Typical Use |
|---------|-----------|-------------|
| 1 | Environment Admin | Team leads, senior engineers |
| 2 | Helpdesk | Support staff, auditors |
| 3 | Standard User | Developers |
| 4 | Read-Only | Viewers, stakeholders |
| 5 | Operator | Operations team |

## Best Practices

- Assign roles based on job function, not seniority
- Use teams rather than individual user assignments for scalability
- Review access quarterly
- Use more restrictive roles for production environments
- Keep development environments more permissive

---

*Monitor your controlled infrastructure with [OneUptime](https://oneuptime.com) for full visibility.*
