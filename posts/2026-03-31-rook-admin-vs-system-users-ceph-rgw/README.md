# How to Understand Admin vs System Users in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, User Management, Security, Administration, Object Storage

Description: Understand the differences between regular, admin-capable, and system users in Ceph RGW and when to use each type for secure cluster management.

---

Ceph RGW has three distinct types of user accounts: regular users, admin-capable users, and system users. Understanding the differences is essential for designing a secure and well-organized access control model.

## Regular Users

Regular users can only access S3 or Swift APIs to manage their own buckets and objects. They have no visibility into other users' data and cannot call the admin API.

```bash
radosgw-admin user create \
  --uid regular-user \
  --display-name "Regular User"
# No caps, no system flag
```

## Admin-Capable Users

Admin users are regular users with specific `caps` (capabilities) granted. They can call the RGW admin REST API for the resource types they have caps on.

```bash
radosgw-admin user create \
  --uid ops-admin \
  --display-name "Operations Admin"

# Grant admin capabilities
radosgw-admin caps add \
  --uid ops-admin \
  --caps "users=*;buckets=*;usage=read"
```

Admin users still see and manage other users' data only through the admin API. Their S3 API access is still limited to their own buckets unless they use the admin API to act on behalf of others.

## System Users

System users are a special class that can impersonate any user in the RGW system. They bypass normal authorization checks and are used internally by RGW services.

Create a system user:

```bash
radosgw-admin user create \
  --uid system-user \
  --display-name "System User" \
  --system
```

The `--system` flag sets the user's `system` property to `true`. Verify:

```bash
radosgw-admin user info --uid system-user | jq '.system'
# Output: true
```

## When System Users Are Used

System users are needed for:
- Multisite sync agents (replication between zones)
- Internal RGW-to-RGW communication
- Administrative tools that need to act on behalf of all users

In Rook, RGW creates an internal system user automatically for zone synchronization:

```bash
radosgw-admin user list | grep "sync"
```

## Comparison Table

| Feature | Regular User | Admin-Capable User | System User |
|---------|-------------|-------------------|-------------|
| S3/Swift access | Own buckets | Own buckets | Any bucket |
| Admin API access | None | Based on caps | Requires caps |
| Cross-user access | No | Via admin API only | Yes (S3 too) |
| Use case | Applications | Operators | Internal/automation |
| Risk level | Low | Medium | High |

## Converting a User to System

Enable the system flag on an existing user:

```bash
radosgw-admin user modify \
  --uid existing-user \
  --system
```

## Security Best Practices

- Never share system user credentials with applications
- Audit system users regularly
- Use admin-capable users for operators who need admin API access
- Create purpose-specific users rather than sharing credentials

```bash
# Find all system users
radosgw-admin user list | jq -r '.[]' | xargs -I{} sh -c \
  'radosgw-admin user info --uid {} | jq -r "select(.system) | .user_id"'
```

## Summary

Ceph RGW has three user types: regular users with scoped S3/Swift access, admin-capable users with admin API access based on caps, and system users that can impersonate any user. Follow least-privilege principles by using regular users for applications, admin-capable users for operators, and system users only for internal automation.
