# How to Enable MongoDB Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Audit Logging, Security, Compliance, Administration

Description: Learn how to enable and configure MongoDB audit logging to record authentication events, DDL operations, and data access for security and compliance purposes.

---

## What Is Audit Logging

MongoDB audit logging records specific database events to a log destination. This is required for compliance frameworks like SOC 2, PCI-DSS, and HIPAA, which mandate that privileged access and data modifications be logged and retained.

Audit logging is available in MongoDB Enterprise and MongoDB Atlas.

## Enabling Audit Logging via mongod.conf

Add the `auditLog` section to your `mongod.conf`:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/auditLog.json
  filter: '{ atype: { $in: ["authenticate", "createCollection", "dropCollection", "createIndex", "dropIndex", "createUser", "dropUser", "updateUser", "logout", "authCheck"] } }'
```

Restart mongod after making changes:

```bash
sudo systemctl restart mongod
```

## Audit Destinations

| Destination | Description |
|---|---|
| `file` | Write to a JSON or BSON file |
| `console` | Write to stdout |
| `syslog` | Send to the system syslog (Unix only) |

For BSON output (smaller, faster):

```yaml
auditLog:
  destination: file
  format: BSON
  path: /var/log/mongodb/auditLog.bson
```

## Configuring Audit Filters

The `filter` option limits which events are logged. Without a filter, all auditable events are captured.

Log only authentication failures:

```yaml
filter: '{ atype: "authenticate", result: { $ne: 0 } }'
```

Log DDL and user management events:

```yaml
filter: >-
  { atype: { $in: [
    "createCollection", "dropCollection", "renameCollection",
    "createIndex", "dropIndex",
    "createUser", "dropUser", "updateUser", "grantRolesToUser",
    "createRole", "dropRole"
  ] } }
```

Log all operations by a specific user:

```yaml
filter: '{ "users.user": "admin" }'
```

## Starting mongod with Audit Options on Command Line

```bash
mongod \
  --auditDestination file \
  --auditFormat JSON \
  --auditPath /var/log/mongodb/auditLog.json \
  --auditFilter '{ atype: { $in: ["authenticate", "createCollection"] } }'
```

## Sample Audit Log Entries

A successful authentication:

```json
{
  "atype": "authenticate",
  "ts": { "$date": "2025-06-01T10:30:00.000Z" },
  "local": { "ip": "127.0.0.1", "port": 27017 },
  "remote": { "ip": "192.168.1.10", "port": 54321 },
  "users": [{ "user": "appUser", "db": "mydb" }],
  "roles": [{ "role": "readWrite", "db": "mydb" }],
  "param": { "user": "appUser", "db": "mydb", "mechanism": "SCRAM-SHA-256" },
  "result": 0
}
```

A collection drop:

```json
{
  "atype": "dropCollection",
  "ts": { "$date": "2025-06-01T11:00:00.000Z" },
  "users": [{ "user": "admin", "db": "admin" }],
  "param": { "ns": "mydb.sessions" },
  "result": 0
}
```

`"result": 0` means success. Non-zero values indicate errors.

## Enabling Audit Logging in MongoDB Atlas

In Atlas, audit logging is configured in the cluster's Security settings:

1. Navigate to your Atlas project
2. Select **Security** - **Advanced**
3. Enable **Database Auditing**
4. Choose auditable actions and optionally add a filter

Atlas writes audit logs to your configured log destination (download via Atlas UI or API).

## Rotating Audit Log Files

For file-based audit logs, send SIGUSR1 to mongod to rotate the log:

```bash
kill -SIGUSR1 $(pidof mongod)
```

Or use `logRotate` command:

```javascript
db.adminCommand({ logRotate: 1 });
```

Set up logrotate on Linux:

```text
/var/log/mongodb/auditLog.json {
    daily
    rotate 30
    compress
    missingok
    sharedscripts
    postrotate
        /bin/kill -SIGUSR1 $(cat /var/run/mongodb/mongod.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

## Summary

MongoDB audit logging is enabled through the `auditLog` configuration block in `mongod.conf`, specifying the destination, format, path, and an optional filter expression. Use filters to limit log volume to the events most relevant to your compliance requirements - authentication, DDL, and user management events are the most commonly required. Rotate audit logs regularly and ship them to a centralized SIEM for long-term retention.
