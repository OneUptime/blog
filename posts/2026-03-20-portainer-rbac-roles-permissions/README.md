# How to Understand Portainer RBAC Roles and Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Role, Permission, Business Edition

Description: A comprehensive guide to Portainer's role-based access control system including all available roles, their permissions, and how to apply them.

---

Portainer Business Edition implements a robust RBAC system that controls what users can see and do within each environment. Understanding the role hierarchy is essential for secure multi-user deployments.

## Role Hierarchy

Portainer has system-level roles, environment-level roles, and a namespace-scoped Kubernetes role:
1. **System-level roles**: Apply globally across Portainer, or across all Edge environments in the case of Edge Administrator
2. **Environment-level roles**: Apply to a specific environment or group
3. **Namespace Operator**: Applies to specified namespaces in a Kubernetes environment

## System-Level Roles

| Role | Description |
|------|-------------|
| **Administrator** | Full control over all environments, users, and settings |
| **Standard User** | Base user role; effective access is determined by environment-level role assignments |
| **Edge Administrator** | Full control over all resources in all Edge environments, plus access to Edge Compute features |

## Environment-Level Roles (BE)

| Role | Description |
|------|-------------|
| **Environment Administrator** | Full access within the environment, but not host management, Portainer internal settings, or resource ownership changes |
| **Operator** | Operate on existing resources, view logs, and use the container console, but cannot create or delete resources |
| **Helpdesk** | Read-only access to deployed resources, but cannot make changes or open a container console |
| **Standard User** | Complete control over the resources that the user, or members of their team, deploy |
| **Read-Only User** | Read-only access to resources the user is entitled to see |

For Kubernetes, Portainer also provides **Namespace Operator**, which scopes Operator-like access to specified namespaces instead of the entire environment.

## Permission Matrix (Docker/Swarm)

| Action | Env Admin | Operator | Standard User | Helpdesk | Read-Only User |
|--------|-----------|----------|---------------|----------|----------------|
| View containers | ✓ | ✓ | ✓* | ✓ | ✓* |
| Start/stop containers | ✓ | ✗ | ✓* | ✗ | ✗ |
| Create containers | ✓ | ✗ | ✓ | ✗ | ✗ |
| Delete containers | ✓ | ✗ | ✓* | ✗ | ✗ |
| Create networks | ✓ | ✗ | ✓ | ✗ | ✗ |
| Create volumes | ✓ | ✗ | ✓ | ✗ | ✗ |
| Deploy stacks | ✓ | ✗ | ✓ | ✗ | ✗ |
| View logs | ✓ | ✓ | ✓* | ✓ | ✓* |
| Container console | ✓ | ✓ | ✓* | ✗ | ✗ |

\* Standard User and Read-Only User permissions apply only to resources they are entitled to access. On Docker and Swarm, that access can be inherited from a stack. Kubernetes environments use Kubernetes RBAC plus Portainer's role mappings, so the exact permissions differ.

## Assign Environment Roles via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Fetch the current team access policies, add Team ID 3 with the Operator role,
# then update Environment ID 1
PAYLOAD=$(curl -s \
  https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c 'import sys,json; endpoint=json.load(sys.stdin); policies=endpoint.get("TeamAccessPolicies") or {}; policies["3"]={"RoleId":5}; print(json.dumps({"TeamAccessPolicies": policies}))')

curl -X PUT \
  https://localhost:9443/api/endpoints/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  --insecure
```

## Role IDs Reference

For environment access policies, the built-in role IDs in current releases are shown below. You can confirm them in your instance with `GET /api/roles`.

| Role Name | Role ID |
|-----------|---------|
| Environment Administrator | 1 |
| Helpdesk | 2 |
| Standard User | 3 |
| Read-Only User | 4 |
| Operator | 5 |

---

*Complement your RBAC strategy with infrastructure monitoring from [OneUptime](https://oneuptime.com).*
