# How to Store User Permissions in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Authorization, RBAC, Permissions, Access Control, Security

Description: A comprehensive guide to storing and managing user permissions in Redis for role-based access control (RBAC), permission caching, and fast authorization lookups.

---

Authorization is a critical part of any application security model. While permissions are typically stored in a database, caching them in Redis dramatically improves performance for authorization checks that happen on every request. This guide covers implementing role-based access control (RBAC), permission caching, and efficient permission lookups with Redis.

## Understanding Permission Models

Common authorization patterns include:

- **Role-Based Access Control (RBAC)**: Users have roles, roles have permissions
- **Attribute-Based Access Control (ABAC)**: Permissions based on attributes
- **Permission-Based**: Direct user-to-permission assignments
- **Hierarchical Roles**: Roles inherit from parent roles

## Basic Permission Cache

### Python Implementation

```python
import redis
import json
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class PermissionCache:
    def __init__(self, prefix='permissions', ttl=3600):
        self.prefix = prefix
        self.ttl = ttl

    def cache_user_permissions(self, user_id, permissions):
        """Cache a user's permissions."""
        key = f"{self.prefix}:user:{user_id}"
        pipe = r.pipeline()
        pipe.delete(key)
        if permissions:
            pipe.sadd(key, *permissions)
        pipe.expire(key, self.ttl)
        pipe.execute()

    def get_user_permissions(self, user_id):
        """Get cached permissions for a user."""
        key = f"{self.prefix}:user:{user_id}"
        return r.smembers(key)

    def has_permission(self, user_id, permission):
        """Check if user has a specific permission."""
        key = f"{self.prefix}:user:{user_id}"
        return r.sismember(key, permission)

    def has_any_permission(self, user_id, permissions):
        """Check if user has any of the given permissions."""
        key = f"{self.prefix}:user:{user_id}"
        for perm in permissions:
            if r.sismember(key, perm):
                return True
        return False

    def has_all_permissions(self, user_id, permissions):
        """Check if user has all of the given permissions."""
        key = f"{self.prefix}:user:{user_id}"
        # Use pipeline for efficiency
        pipe = r.pipeline()
        for perm in permissions:
            pipe.sismember(key, perm)
        results = pipe.execute()
        return all(results)

    def invalidate_user_permissions(self, user_id):
        """Invalidate cached permissions for a user."""
        key = f"{self.prefix}:user:{user_id}"
        r.delete(key)

    def invalidate_all(self):
        """Invalidate all cached permissions."""
        keys = r.keys(f"{self.prefix}:*")
        if keys:
            r.delete(*keys)

# Usage
cache = PermissionCache()

# Cache permissions for a user
permissions = ['read:posts', 'write:posts', 'read:comments', 'write:comments']
cache.cache_user_permissions('user123', permissions)

# Check permissions
print(f"Has read:posts: {cache.has_permission('user123', 'read:posts')}")
print(f"Has delete:posts: {cache.has_permission('user123', 'delete:posts')}")

# Check multiple permissions
required = ['read:posts', 'write:posts']
print(f"Has all required: {cache.has_all_permissions('user123', required)}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class PermissionCache {
  constructor(prefix = 'permissions', ttl = 3600) {
    this.prefix = prefix;
    this.ttl = ttl;
  }

  async cacheUserPermissions(userId, permissions) {
    const key = `${this.prefix}:user:${userId}`;

    const pipeline = redis.pipeline();
    pipeline.del(key);
    if (permissions.length > 0) {
      pipeline.sadd(key, ...permissions);
    }
    pipeline.expire(key, this.ttl);
    await pipeline.exec();
  }

  async getUserPermissions(userId) {
    const key = `${this.prefix}:user:${userId}`;
    return await redis.smembers(key);
  }

  async hasPermission(userId, permission) {
    const key = `${this.prefix}:user:${userId}`;
    return (await redis.sismember(key, permission)) === 1;
  }

  async hasAnyPermission(userId, permissions) {
    const key = `${this.prefix}:user:${userId}`;

    for (const perm of permissions) {
      if ((await redis.sismember(key, perm)) === 1) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(userId, permissions) {
    const key = `${this.prefix}:user:${userId}`;

    const pipeline = redis.pipeline();
    for (const perm of permissions) {
      pipeline.sismember(key, perm);
    }

    const results = await pipeline.exec();
    return results.every(([err, result]) => result === 1);
  }

  async invalidateUserPermissions(userId) {
    const key = `${this.prefix}:user:${userId}`;
    await redis.del(key);
  }
}

// Usage
async function example() {
  const cache = new PermissionCache();

  await cache.cacheUserPermissions('user123', [
    'read:posts',
    'write:posts',
    'read:comments'
  ]);

  console.log('Has read:posts:', await cache.hasPermission('user123', 'read:posts'));
  console.log('Has delete:posts:', await cache.hasPermission('user123', 'delete:posts'));
}

example().catch(console.error);
```

## Role-Based Access Control (RBAC)

### Complete RBAC Implementation

```python
class RBACCache:
    def __init__(self, prefix='rbac', ttl=3600):
        self.prefix = prefix
        self.ttl = ttl

    # Role Management
    def define_role(self, role_name, permissions, parent_roles=None):
        """Define a role with permissions and optional inheritance."""
        role_key = f"{self.prefix}:role:{role_name}"
        parent_key = f"{self.prefix}:role:{role_name}:parents"

        pipe = r.pipeline()

        # Store role permissions
        pipe.delete(role_key)
        if permissions:
            pipe.sadd(role_key, *permissions)

        # Store parent roles for inheritance
        if parent_roles:
            pipe.delete(parent_key)
            pipe.sadd(parent_key, *parent_roles)

        pipe.execute()

    def get_role_permissions(self, role_name, include_inherited=True):
        """Get all permissions for a role, optionally including inherited."""
        role_key = f"{self.prefix}:role:{role_name}"
        permissions = r.smembers(role_key)

        if include_inherited:
            parent_key = f"{self.prefix}:role:{role_name}:parents"
            parents = r.smembers(parent_key)

            for parent in parents:
                parent_perms = self.get_role_permissions(parent, include_inherited=True)
                permissions = permissions.union(parent_perms)

        return permissions

    # User-Role Management
    def assign_role_to_user(self, user_id, role_name):
        """Assign a role to a user."""
        user_roles_key = f"{self.prefix}:user:{user_id}:roles"
        r.sadd(user_roles_key, role_name)

        # Invalidate cached permissions
        self._invalidate_user_permissions_cache(user_id)

    def remove_role_from_user(self, user_id, role_name):
        """Remove a role from a user."""
        user_roles_key = f"{self.prefix}:user:{user_id}:roles"
        r.srem(user_roles_key, role_name)

        # Invalidate cached permissions
        self._invalidate_user_permissions_cache(user_id)

    def get_user_roles(self, user_id):
        """Get all roles assigned to a user."""
        user_roles_key = f"{self.prefix}:user:{user_id}:roles"
        return r.smembers(user_roles_key)

    # Permission Checks
    def get_user_permissions(self, user_id):
        """Get all permissions for a user (from all roles)."""
        cache_key = f"{self.prefix}:user:{user_id}:permissions:cache"

        # Check cache first
        cached = r.smembers(cache_key)
        if cached:
            return cached

        # Calculate permissions from roles
        roles = self.get_user_roles(user_id)
        all_permissions = set()

        for role in roles:
            role_perms = self.get_role_permissions(role, include_inherited=True)
            all_permissions = all_permissions.union(role_perms)

        # Cache the result
        if all_permissions:
            pipe = r.pipeline()
            pipe.sadd(cache_key, *all_permissions)
            pipe.expire(cache_key, self.ttl)
            pipe.execute()

        return all_permissions

    def has_permission(self, user_id, permission):
        """Check if user has a specific permission."""
        permissions = self.get_user_permissions(user_id)
        return permission in permissions

    def has_role(self, user_id, role_name):
        """Check if user has a specific role."""
        roles = self.get_user_roles(user_id)
        return role_name in roles

    def _invalidate_user_permissions_cache(self, user_id):
        """Invalidate cached permissions for a user."""
        cache_key = f"{self.prefix}:user:{user_id}:permissions:cache"
        r.delete(cache_key)

    # Bulk Operations
    def invalidate_role_permissions(self, role_name):
        """Invalidate permissions cache for all users with a role."""
        # This is expensive - consider using pub/sub for large systems
        pattern = f"{self.prefix}:user:*:roles"
        for key in r.scan_iter(match=pattern):
            user_id = key.split(':')[2]
            roles = r.smembers(key)
            if role_name in roles:
                self._invalidate_user_permissions_cache(user_id)

# Usage
rbac = RBACCache()

# Define roles with hierarchy
rbac.define_role('viewer', ['read:posts', 'read:comments'])
rbac.define_role('editor', ['write:posts', 'write:comments'], parent_roles=['viewer'])
rbac.define_role('admin', ['delete:posts', 'delete:comments', 'manage:users'], parent_roles=['editor'])

# Assign roles to users
rbac.assign_role_to_user('user123', 'editor')
rbac.assign_role_to_user('admin_user', 'admin')

# Check permissions
print(f"Editor permissions: {rbac.get_user_permissions('user123')}")
print(f"Admin permissions: {rbac.get_user_permissions('admin_user')}")

print(f"Can editor read posts: {rbac.has_permission('user123', 'read:posts')}")
print(f"Can editor delete posts: {rbac.has_permission('user123', 'delete:posts')}")
```

## Resource-Level Permissions

```python
class ResourcePermissionCache:
    """Handle permissions for specific resources."""

    def __init__(self, prefix='resource_perm', ttl=3600):
        self.prefix = prefix
        self.ttl = ttl

    def grant_permission(self, user_id, resource_type, resource_id, permission):
        """Grant permission on a specific resource."""
        key = f"{self.prefix}:{user_id}:{resource_type}:{resource_id}"
        r.sadd(key, permission)
        r.expire(key, self.ttl)

        # Also track which resources user has access to
        user_resources_key = f"{self.prefix}:{user_id}:{resource_type}:list"
        r.sadd(user_resources_key, resource_id)

    def revoke_permission(self, user_id, resource_type, resource_id, permission):
        """Revoke permission on a specific resource."""
        key = f"{self.prefix}:{user_id}:{resource_type}:{resource_id}"
        r.srem(key, permission)

        # If no permissions left, remove from user's resource list
        if r.scard(key) == 0:
            r.delete(key)
            user_resources_key = f"{self.prefix}:{user_id}:{resource_type}:list"
            r.srem(user_resources_key, resource_id)

    def has_permission(self, user_id, resource_type, resource_id, permission):
        """Check if user has permission on a specific resource."""
        key = f"{self.prefix}:{user_id}:{resource_type}:{resource_id}"
        return r.sismember(key, permission)

    def get_resource_permissions(self, user_id, resource_type, resource_id):
        """Get all permissions user has on a resource."""
        key = f"{self.prefix}:{user_id}:{resource_type}:{resource_id}"
        return r.smembers(key)

    def get_accessible_resources(self, user_id, resource_type, permission=None):
        """Get all resources of a type that user can access."""
        user_resources_key = f"{self.prefix}:{user_id}:{resource_type}:list"
        resource_ids = r.smembers(user_resources_key)

        if permission is None:
            return resource_ids

        # Filter by specific permission
        accessible = []
        for resource_id in resource_ids:
            if self.has_permission(user_id, resource_type, resource_id, permission):
                accessible.append(resource_id)

        return accessible

    def share_resource(self, owner_id, target_user_id, resource_type, resource_id, permissions):
        """Share a resource with another user."""
        for perm in permissions:
            self.grant_permission(target_user_id, resource_type, resource_id, perm)

        # Track sharing
        sharing_key = f"{self.prefix}:sharing:{resource_type}:{resource_id}"
        r.sadd(sharing_key, target_user_id)

    def get_resource_collaborators(self, resource_type, resource_id):
        """Get all users with access to a resource."""
        sharing_key = f"{self.prefix}:sharing:{resource_type}:{resource_id}"
        return r.smembers(sharing_key)

# Usage
resource_perms = ResourcePermissionCache()

# Grant permissions on specific resources
resource_perms.grant_permission('user123', 'document', 'doc_001', 'read')
resource_perms.grant_permission('user123', 'document', 'doc_001', 'write')
resource_perms.grant_permission('user123', 'document', 'doc_002', 'read')

# Check resource permission
print(f"Can read doc_001: {resource_perms.has_permission('user123', 'document', 'doc_001', 'read')}")
print(f"Can delete doc_001: {resource_perms.has_permission('user123', 'document', 'doc_001', 'delete')}")

# Get accessible resources
docs = resource_perms.get_accessible_resources('user123', 'document', 'write')
print(f"Documents user can write: {docs}")

# Share with another user
resource_perms.share_resource('user123', 'user456', 'document', 'doc_001', ['read'])
```

## Permission Groups and Wildcards

```python
class WildcardPermissionCache:
    """Support wildcard permissions like 'posts:*' or '*:read'."""

    def __init__(self, prefix='wildcard_perm', ttl=3600):
        self.prefix = prefix
        self.ttl = ttl

    def cache_permissions(self, user_id, permissions):
        """Cache permissions including wildcards."""
        key = f"{self.prefix}:user:{user_id}"
        pipe = r.pipeline()
        pipe.delete(key)
        if permissions:
            pipe.sadd(key, *permissions)
        pipe.expire(key, self.ttl)
        pipe.execute()

    def has_permission(self, user_id, permission):
        """Check permission with wildcard support."""
        key = f"{self.prefix}:user:{user_id}"
        permissions = r.smembers(key)

        # Direct match
        if permission in permissions:
            return True

        # Check wildcards
        parts = permission.split(':')
        if len(parts) == 2:
            resource, action = parts

            # Check resource:* (all actions on resource)
            if f"{resource}:*" in permissions:
                return True

            # Check *:action (action on all resources)
            if f"*:{action}" in permissions:
                return True

            # Check * (superuser)
            if '*' in permissions:
                return True

        return False

    def expand_wildcard(self, wildcard_permission, all_permissions):
        """Expand a wildcard permission to specific permissions."""
        if wildcard_permission == '*':
            return set(all_permissions)

        parts = wildcard_permission.split(':')
        if len(parts) != 2:
            return {wildcard_permission}

        resource, action = parts
        expanded = set()

        for perm in all_permissions:
            perm_parts = perm.split(':')
            if len(perm_parts) != 2:
                continue

            perm_resource, perm_action = perm_parts

            if resource == '*' and action == perm_action:
                expanded.add(perm)
            elif resource == perm_resource and action == '*':
                expanded.add(perm)

        return expanded

# Usage
wildcard_cache = WildcardPermissionCache()

# User with wildcard permissions
permissions = ['posts:*', 'comments:read']  # All post actions, read comments only
wildcard_cache.cache_permissions('editor', permissions)

# Admin with super permission
wildcard_cache.cache_permissions('admin', ['*'])

# Check permissions
print(f"Editor can read posts: {wildcard_cache.has_permission('editor', 'posts:read')}")
print(f"Editor can delete posts: {wildcard_cache.has_permission('editor', 'posts:delete')}")
print(f"Editor can delete comments: {wildcard_cache.has_permission('editor', 'comments:delete')}")
print(f"Admin can do anything: {wildcard_cache.has_permission('admin', 'users:delete')}")
```

## Express Middleware for Authorization

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Permission cache instance
class PermissionService {
  constructor() {
    this.prefix = 'permissions';
    this.ttl = 3600;
  }

  async getUserPermissions(userId) {
    const key = `${this.prefix}:user:${userId}`;
    let permissions = await redis.smembers(key);

    if (permissions.length === 0) {
      // Load from database (placeholder)
      permissions = await this.loadPermissionsFromDB(userId);
      if (permissions.length > 0) {
        await redis.pipeline()
          .sadd(key, ...permissions)
          .expire(key, this.ttl)
          .exec();
      }
    }

    return new Set(permissions);
  }

  async loadPermissionsFromDB(userId) {
    // Placeholder - replace with actual database query
    const mockPermissions = {
      'user123': ['read:posts', 'write:posts'],
      'admin': ['read:posts', 'write:posts', 'delete:posts', 'manage:users']
    };
    return mockPermissions[userId] || [];
  }

  async hasPermission(userId, permission) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.has(permission) || permissions.has('*');
  }
}

const permissionService = new PermissionService();

// Authorization middleware factory
function requirePermission(...requiredPermissions) {
  return async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userPermissions = await permissionService.getUserPermissions(userId);

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(perm =>
        userPermissions.has(perm) || userPermissions.has('*')
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermissions
        });
      }

      // Attach permissions to request for later use
      req.permissions = userPermissions;
      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

// Require all permissions
function requireAllPermissions(...requiredPermissions) {
  return async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userPermissions = await permissionService.getUserPermissions(userId);

      if (userPermissions.has('*')) {
        req.permissions = userPermissions;
        return next();
      }

      const hasAll = requiredPermissions.every(perm => userPermissions.has(perm));

      if (!hasAll) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermissions
        });
      }

      req.permissions = userPermissions;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

// Usage in Express routes
const express = require('express');
const app = express();

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { id: req.headers['x-user-id'] || 'anonymous' };
  next();
});

// Public route
app.get('/posts', async (req, res) => {
  res.json({ posts: [] });
});

// Protected routes
app.post('/posts', requirePermission('write:posts'), (req, res) => {
  res.json({ message: 'Post created' });
});

app.delete('/posts/:id', requirePermission('delete:posts'), (req, res) => {
  res.json({ message: 'Post deleted' });
});

// Route requiring multiple permissions
app.post('/admin/users', requireAllPermissions('manage:users', 'write:users'), (req, res) => {
  res.json({ message: 'User created' });
});

app.listen(3000);
```

## Best Practices

### 1. Cache Invalidation Strategy

```python
def invalidate_on_permission_change(user_id=None, role=None):
    """Invalidate caches when permissions change."""
    if user_id:
        # Invalidate specific user
        r.delete(f"permissions:user:{user_id}")
        r.delete(f"rbac:user:{user_id}:permissions:cache")

    if role:
        # Find all users with this role and invalidate
        # This is expensive - consider async processing
        pattern = f"rbac:user:*:roles"
        for key in r.scan_iter(match=pattern):
            if r.sismember(key, role):
                user_id = key.split(':')[2]
                r.delete(f"rbac:user:{user_id}:permissions:cache")
```

### 2. Use Pub/Sub for Cache Invalidation

```python
import threading

def permission_invalidation_listener():
    """Listen for permission changes and invalidate caches."""
    pubsub = r.pubsub()
    pubsub.subscribe('permission:invalidate')

    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'])
            user_id = data.get('user_id')
            if user_id:
                r.delete(f"permissions:user:{user_id}")

# Start listener in background
listener_thread = threading.Thread(target=permission_invalidation_listener, daemon=True)
listener_thread.start()

# Publish invalidation
def invalidate_user_permissions_async(user_id):
    r.publish('permission:invalidate', json.dumps({'user_id': user_id}))
```

### 3. Batch Permission Checks

```python
def check_permissions_batch(user_id, permissions):
    """Check multiple permissions efficiently."""
    key = f"permissions:user:{user_id}"

    lua_script = """
    local key = KEYS[1]
    local results = {}
    for i, perm in ipairs(ARGV) do
        results[i] = redis.call('SISMEMBER', key, perm)
    end
    return results
    """

    results = r.eval(lua_script, 1, key, *permissions)
    return dict(zip(permissions, [bool(r) for r in results]))
```

## Conclusion

Storing user permissions in Redis provides the performance needed for authorization checks on every request. Key takeaways:

- Cache permissions with appropriate TTLs
- Implement role hierarchy for flexible RBAC
- Support resource-level permissions for fine-grained control
- Use wildcards for powerful permission patterns
- Design proper cache invalidation strategies
- Consider pub/sub for distributed cache invalidation

Redis's set operations are perfect for permission management, enabling fast membership checks and set operations that map naturally to authorization concepts.
