# Validation Summary: How to Set Up Hidden Members in MongoDB Replica Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- Hidden replica set members
- `rs.initiate()`, `rs.conf()`, `rs.reconfig()`, `rs.status()`
- `mongodump` for backups
- `mongosh` with `--directConnection`
- WiredTiger filesystem snapshots (`db.fsyncLock()` / `db.fsyncUnlock()`)

## Sources Consulted
- MongoDB Replica Set Configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB `replSetGetStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB `rs.status()` method reference: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB `buildIndexes` configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.members-n-.buildIndexes
- MongoDB Hidden Replica Set Members documentation: https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/

## Issues Found

1. **`rs.status()` does not include a `hidden` field (line 75-78)**: The "Verifying a Member is Hidden" section accessed `m.hidden` from `rs.status().members`, but `rs.status()` does not include the `hidden` field in its output — `hidden` is only available in `rs.conf()`. The code would always print `false` for all members. Fixed by removing the `hidden` reference from the `rs.status()` loop and clarifying in the comment that `rs.conf()` should be used to check hidden status.

2. **Incorrect claim that `buildIndexes: false` requires `hidden: true` (line 182-183)**: The post stated `buildIndexes: false` requires both `hidden: true` and `priority: 0`. Per MongoDB docs, `buildIndexes: false` only requires `priority: 0`. `hidden: true` is a common recommendation but not a requirement enforced by MongoDB. Fixed the comment and the fix example to reflect this.

3. **Misleading comment "restore voting eligibility" (line 197)**: The `priority` field controls eligibility to become primary, not voting eligibility. Voting is controlled by the `votes` field. Fixed the comment to say "restore eligibility to become primary".

## Review Notes
- The `mongosh` command on line 97 is inside a JavaScript code block. While this works for illustration, strictly speaking shell commands and JavaScript are mixed in the same block. This is a stylistic choice and not a technical error.
- The `db.getMongo().setReadPref("primaryPreferred")` on line 100 works for direct connections to a hidden secondary, though `"secondary"` or `"secondaryPreferred"` would be more semantically appropriate when the intent is to read from a secondary for analytics. Not a technical error since `primaryPreferred` allows secondary reads.
- The `rs.printSecondaryReplicationInfo()` usage is correct and current.
