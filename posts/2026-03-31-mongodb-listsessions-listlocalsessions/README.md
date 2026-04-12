# How to Use $listSessions and $listLocalSessions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Session, Security, $listSessions

Description: Learn how to use $listSessions and $listLocalSessions in MongoDB to inspect active client sessions, audit connections, and detect long-running or stale sessions.

---

MongoDB tracks client sessions used for causally consistent reads, transactions, and retryable writes. The `$listSessions` and `$listLocalSessions` aggregation stages let you inspect these sessions from within the `config.system.sessions` collection or directly from the aggregation pipeline.

## $listSessions vs $listLocalSessions

| Feature | $listSessions | $listLocalSessions |
|---------|--------------|-------------------|
| Source | config.system.sessions (cluster-wide) | Current mongod/mongos memory only |
| Requires | config database | Any context |
| Use case | Audit all sessions | Quick in-memory snapshot |

## Listing All Sessions

Run against the `config` database:

```js
use config;
db.system.sessions.aggregate([
  { $listSessions: {} }
]);
```

Each document contains:

- `_id.id` - session UUID
- `_id.uid` - user hash
- `lastUse` - when the session was last used
- `user.name` - the authenticated user

## Listing Sessions for a Specific User

```js
use config;
db.system.sessions.aggregate([
  {
    $listSessions: {
      users: [{ user: "appUser", db: "myApp" }]
    }
  }
]);
```

## $listLocalSessions

`$listLocalSessions` reads from the in-memory session cache of the connected node. It is faster but only reflects sessions active on that specific mongod:

```js
use admin;
db.aggregate([
  { $listLocalSessions: {} }
]);
```

List sessions for all users on the local node:

```js
use admin;
db.aggregate([
  { $listLocalSessions: { allUsers: true } }
]);
```

## Finding Stale Sessions

Sessions that have not been used recently may indicate abandoned connections:

```js
use config;
const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

db.system.sessions.aggregate([
  { $listSessions: {} },
  { $match: { lastUse: { $lt: cutoff } } },
  { $project: { "_id.id": 1, lastUse: 1, "user.name": 1 } },
  { $sort: { lastUse: 1 } }
]);
```

## Counting Active Sessions Per User

```js
use config;
db.system.sessions.aggregate([
  { $listSessions: {} },
  {
    $group: {
      _id: "$user.name",
      sessionCount: { $sum: 1 },
      lastActivity: { $max: "$lastUse" }
    }
  },
  { $sort: { sessionCount: -1 } }
]);
```

## Killing a Specific Session

Once you identify a problematic session ID, kill it with `killSessions`:

```js
use admin;
db.runCommand({
  killSessions: [{ id: UUID("some-session-uuid-here") }]
});
```

## Security Considerations

- `$listSessions` requires the `listSessions` privilege or the `root` role.
- In sharded clusters, run `$listSessions` against `mongos` to get cluster-wide results.
- Session data is stored in `config.system.sessions` and periodically refreshed.

## Summary

`$listSessions` and `$listLocalSessions` give you a programmatic way to audit MongoDB sessions, identify idle or abandoned connections, and count session activity per user. They are especially useful in multi-tenant environments or when debugging connection pool exhaustion and transaction timeouts.
