# How to Configure Standard User Permissions in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Standard User, Permission, Access Control

Description: Configure Standard User permissions in Portainer to allow users to manage their own containers and stacks within assigned environments.

---

Standard Users in Portainer can create and manage their own resources within environments they have access to, but cannot manage other users' resources or environment settings.

## Standard User Capabilities

Standard Users can:
- Create containers, stacks, networks, and volumes
- Manage their own resources (start, stop, delete)
- Access container console and logs for their containers
- Use the app template library
- View their assigned environments

Standard Users cannot:
- Manage other users' resources
- Change environment settings
- Manage registries (unless granted)
- Add or remove environments

## Create a Standard User

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a standard user (Role: 2 = Standard User)

curl -X POST \
  https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "developer1",
    "Password": "DevPassword123!",
    "Role": 2
  }' \
  --insecure
```

## Grant Environment Access to Standard Users

Standard users only see environments they're explicitly granted access to:

```bash
# Grant user ID 5 access to environment ID 1 as Standard User (role 3)
curl -X PUT \
  https://localhost:9443/api/endpoints/1/useraccesspolicies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"5": {"RoleID": 3}}' \
  --insecure
```

## Configure Resource Ownership

By default, Standard Users own what they create. Enable resource ownership tracking:

1. Navigate to **Settings > Application settings**
2. Enable **Ownership management**
3. Users can only manage resources they created

## Restrict What Standard Users Can Do

For more restricted environments, use the Helpdesk role instead of Standard User, or apply environment-specific overrides:

```bash
# Assign Standard User role on dev environment
# and Helpdesk (read-only) on production
curl -X PUT \
  https://localhost:9443/api/endpoints/1/useraccesspolicies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"5": {"RoleID": 3}}' --insecure   # Standard User on dev

curl -X PUT \
  https://localhost:9443/api/endpoints/2/useraccesspolicies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"5": {"RoleID": 2}}' --insecure   # Helpdesk on production
```

---

*Implement principle of least privilege and monitor with [OneUptime](https://oneuptime.com).*
