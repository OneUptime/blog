# How to Add and Remove Admin Capabilities in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Administration, Capability, Security, Object Storage, IAM

Description: Add and remove admin capabilities in Ceph RGW to grant users access to the admin API for managing users, buckets, usage, and system operations.

---

Ceph RGW provides an admin REST API for managing users, buckets, quotas, and usage data. Access to this admin API is controlled through capabilities (`caps`) assigned to RGW users. Each capability can be granted at `read`, `write`, or `*` (read+write) level.

## Available Admin Capabilities

| Capability | Scope |
|------------|-------|
| `users` | Manage user accounts |
| `buckets` | Manage bucket metadata and policies |
| `metadata` | Manage zone metadata |
| `usage` | View and trim usage logs |
| `zone` | Manage zone configuration |
| `info` | View cluster info |
| `bilog` | Access bucket index log |
| `datalog` | Access data replication log |
| `mdlog` | Access metadata log |
| `opstate` | Access replication operation state |

## Adding Capabilities to a User

Grant a user read+write access to the user and bucket admin API:

```bash
radosgw-admin caps add \
  --uid alice \
  --caps "users=*;buckets=*"
```

Grant read-only access to usage data:

```bash
radosgw-admin caps add \
  --uid monitoring-user \
  --caps "usage=read"
```

Grant all admin capabilities (full admin user):

```bash
radosgw-admin caps add \
  --uid admin-user \
  --caps "users=*;buckets=*;metadata=*;usage=*;zone=*"
```

## Viewing Current Capabilities

```bash
radosgw-admin user info --uid alice | jq '.caps'
```

Output:

```json
[
  {"type": "users", "perm": "*"},
  {"type": "buckets", "perm": "*"}
]
```

## Removing Capabilities

Remove a specific capability:

```bash
radosgw-admin caps rm \
  --uid alice \
  --caps "buckets=*"
```

Remove multiple capabilities at once:

```bash
radosgw-admin caps rm \
  --uid alice \
  --caps "users=*;buckets=*"
```

## Using the Admin API

Once a user has admin capabilities, they can use the RGW admin REST API:

```bash
# List all users (requires users=read or users=*)
curl -s http://your-rgw-host:7480/admin/user?list \
  --user admin-access-key:admin-secret-key \
  --aws-sigv4 "aws:amz:us-east-1:s3"
```

Get bucket usage information (requires `buckets=read` or `buckets=*`):

```bash
curl -s http://your-rgw-host:7480/admin/bucket \
  --user admin-access-key:admin-secret-key \
  --aws-sigv4 "aws:amz:us-east-1:s3"
```

## Security Considerations

- Grant only the minimum necessary capabilities
- Admin API users should use separate credentials from regular S3 access
- Consider using a dedicated admin user with no bucket access but full management caps
- Audit capability assignments regularly

```bash
# List all users with any capabilities
radosgw-admin user list 2>/dev/null | \
  jq -r '.[]' | \
  xargs -I{} radosgw-admin user info --uid {} | \
  jq -r 'select(.caps | length > 0) | "\(.user_id): \(.caps)"'
```

## Summary

Ceph RGW admin capabilities gate access to the admin REST API and are managed with `radosgw-admin caps add` and `caps rm`. Follow least-privilege principles by granting only the capability types and levels needed for each administrative role. Regularly audit user capabilities to ensure no unnecessary access is granted.
