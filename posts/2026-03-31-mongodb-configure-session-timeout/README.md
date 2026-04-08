# How to Configure Session Timeout in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Session, Timeout, Configuration, Administration

Description: Learn how to configure MongoDB's logical session timeout, understand the localLogicalSessionTimeoutMinutes parameter, and manage session expiration in your deployment.

---

## Overview

MongoDB logical sessions have a server-side idle timeout controlled by the `localLogicalSessionTimeoutMinutes` parameter. Sessions that are not refreshed within this window are considered expired and eventually cleaned up. Understanding and tuning this setting is important for high-connection applications and long-running batch operations.

## Default Session Timeout

By default, MongoDB expires sessions that have not been used for 30 minutes. The server runs a background job (the `LogicalSessionCacheRefresh`) every 5 minutes to refresh active sessions and clean up expired ones.

## Checking the Current Timeout

```javascript
db.adminCommand({ getParameter: 1, localLogicalSessionTimeoutMinutes: 1 })
```

Example output:

```json
{
  "localLogicalSessionTimeoutMinutes": 30,
  "ok": 1
}
```

## Changing the Session Timeout

Modify `mongod.conf` to set a custom timeout:

```yaml
setParameter:
  localLogicalSessionTimeoutMinutes: 60
```

Note that `localLogicalSessionTimeoutMinutes` is a startup-only parameter and cannot be changed at runtime via `setParameter`. You must restart `mongod` after modifying `mongod.conf` for the change to take effect.

Setting a longer timeout allows long-running operations (like large batch exports) to keep their session alive without needing explicit refreshes.

## How Sessions Stay Alive

The MongoDB driver automatically refreshes open sessions in the background every `localLogicalSessionTimeoutMinutes / 2` minutes. As long as your application has an active connection, sessions are refreshed automatically.

For very long-running operations without driver-managed sessions, you can manually refresh:

```javascript
// Manually refresh a session to prevent expiration
db.adminCommand({ refreshSessions: [session.getSessionId()] })
```

## Monitoring Active Sessions

```javascript
// View all active sessions on the server (requires admin privileges)
db.adminCommand({ listSessions: 1, allUsers: true })

// View sessions for the current user only
db.adminCommand({ listSessions: 1 })
```

To view sessions from `system.sessions` in the `config` database:

```javascript
use config
db.system.sessions.find().pretty()
```

Each document contains the session's `_id` (the LSID), `lastUse` timestamp, and `user`.

## Killing Expired Sessions Manually

The server automatically cleans up expired sessions, but you can trigger cleanup manually if needed:

```javascript
db.adminCommand({ killAllSessions: [] })
```

This kills all sessions on the server and should only be used during maintenance.

To kill a specific session by ID:

```javascript
db.adminCommand({
  killSessions: [{ id: UUID('your-session-uuid') }]
})
```

## Impact on Transactions

Transactions inherit the session timeout. If a transaction's session expires before the transaction commits, MongoDB aborts the transaction. The transaction timeout is also bounded by `transactionLifetimeLimitSeconds` (default 60 seconds), which is separate from the session timeout.

```javascript
db.adminCommand({ getParameter: 1, transactionLifetimeLimitSeconds: 1 })
```

To allow longer transactions:

```javascript
db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 300 })
```

## Recommendations

- For OLTP workloads: keep the default 30-minute timeout.
- For batch ETL pipelines: increase to 60-120 minutes and ensure the driver keeps the connection active.
- For serverless/short-lived connections: keep the timeout low (10-15 minutes) to clean up abandoned sessions quickly.
- Always monitor `system.sessions` collection size; a large number of sessions can indicate connection leaks.

## Summary

MongoDB's session timeout is controlled by `localLogicalSessionTimeoutMinutes` (default 30 minutes). The driver refreshes active sessions automatically, so in most cases you do not need to adjust this. For long-running batch operations, increase the timeout or use `refreshSessions` manually. Monitor `config.system.sessions` for abandoned sessions and use `transactionLifetimeLimitSeconds` to bound transaction duration independently.
