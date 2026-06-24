# How to Model Permission Systems in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Permission, RBAC, Authorization, Data Modeling, Access Control

Description: Design role-based and attribute-based permission systems in Redis using sets and hashes for fast authorization checks with sub-millisecond latency.

---

## Why Redis for Permissions

Authorization checks happen on nearly every API request. Storing permissions in Redis provides sub-millisecond lookups, dramatically reducing authorization overhead compared to hitting a relational database on each request.

## Role-Based Access Control (RBAC)

### Defining Roles and Permissions

```bash
# Define permissions per role
SADD role:admin read write delete manage_users
SADD role:editor read write
SADD role:viewer read

# Assign roles to users (and maintain reverse mapping)
SADD user:101:roles admin
SADD role:admin:users 101
SADD user:102:roles editor viewer
SADD role:editor:users 102
SADD role:viewer:users 102
SADD user:103:roles viewer
SADD role:viewer:users 103
```

### Checking Permissions

Check if a user has a specific permission:

```bash
# Get all roles for user 101
SMEMBERS user:101:roles
# Returns: admin

# Check if admin role has "delete" permission
SISMEMBER role:admin delete
```

For a combined permission set, compute the union of all role permissions:

```bash
# Union of permissions for user 102 (editor + viewer roles)
SUNIONSTORE user:102:effective_permissions role:editor role:viewer
SMEMBERS user:102:effective_permissions
```

## Resource-Level Permissions

Grant permissions on specific resources:

```bash
# User 102 can read and write document:500
SADD resource:doc:500:acl:102 read write

# User 103 can only read document:500
SADD resource:doc:500:acl:103 read

# Check if user 102 can delete document:500
SISMEMBER resource:doc:500:acl:102 delete
```

## Bit-Field Permissions

Use bitmasks for compact permission storage across many resources:

```bash
# Permission bit positions: 0=read, 1=write, 2=delete, 3=manage
# User 101 has all permissions: bits 0,1,2,3 = 0b1111 = 15
SETBIT perm:user:101 0 1
SETBIT perm:user:101 1 1
SETBIT perm:user:101 2 1
SETBIT perm:user:101 3 1

# User 103 has read only: bit 0 = 1
SETBIT perm:user:103 0 1

# Check if user 103 can write (bit 1)
GETBIT perm:user:103 1
```

## Python Example - Permission Checker

```python
import redis

class PermissionSystem:
    def __init__(self):
        self.r = redis.Redis(decode_responses=True)

    def define_role(self, role: str, permissions: list):
        self.r.sadd(f"role:{role}", *permissions)

    def assign_role(self, user_id: str, role: str):
        self.r.sadd(f"user:{user_id}:roles", role)
        self.r.sadd(f"role:{role}:users", user_id)

    def get_effective_permissions(self, user_id: str):
        roles = self.r.smembers(f"user:{user_id}:roles")
        if not roles:
            return set()
        role_keys = [f"role:{role}" for role in roles]
        dest_key = f"user:{user_id}:effective_perms"
        self.r.sunionstore(dest_key, *role_keys)
        self.r.expire(dest_key, 300)
        return self.r.smembers(dest_key)

    def has_permission(self, user_id: str, permission: str):
        roles = self.r.smembers(f"user:{user_id}:roles")
        for role in roles:
            if self.r.sismember(f"role:{role}", permission):
                return True
        return False

    def grant_resource_permission(self, user_id: str, resource_id: str, permissions: list):
        self.r.sadd(f"resource:{resource_id}:acl:{user_id}", *permissions)

    def check_resource_permission(self, user_id: str, resource_id: str, permission: str):
        return self.r.sismember(f"resource:{resource_id}:acl:{user_id}", permission)

ps = PermissionSystem()
ps.define_role("admin", ["read", "write", "delete", "manage_users"])
ps.define_role("editor", ["read", "write"])
ps.assign_role("101", "admin")
ps.assign_role("102", "editor")

print("User 101 can delete:", ps.has_permission("101", "delete"))
print("User 102 can delete:", ps.has_permission("102", "delete"))
print("User 102 effective permissions:", ps.get_effective_permissions("102"))
```

## Permission Caching with TTL

Cache computed effective permissions and invalidate on role changes:

```bash
# Cache for 5 minutes
SUNIONSTORE user:101:effective_perms role:admin
EXPIRE user:101:effective_perms 300
```

When a role changes, delete cached permission keys:

```python
def update_role(role, permissions):
    r.delete(f"role:{role}")
    r.sadd(f"role:{role}", *permissions)
    # Invalidate all user caches that have this role
    users = r.smembers(f"role:{role}:users")
    for user_id in users:
        r.delete(f"user:{user_id}:effective_perms")
```

## Hierarchical Permissions

For tree-based permission hierarchies, store parent-child role relationships:

```bash
SADD role:superadmin:inherits admin
SADD role:admin:inherits editor
```

Resolve the full permission set recursively in application code before caching.

## Summary

Redis enables fast RBAC permission systems using sets for role definitions and user-role mappings. The SUNIONSTORE command efficiently computes effective permissions across multiple roles with a single operation. Caching computed permission sets with a short TTL ensures authorization checks remain sub-millisecond while staying current with role changes.
