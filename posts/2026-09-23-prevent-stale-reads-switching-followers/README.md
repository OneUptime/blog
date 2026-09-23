# How to Prevent Stale Reads After a User Switches Between Followers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Consistency, Database

Description: Preserve monotonic reads across PostgreSQL followers with session progress tokens, pinned connections, bounded replay waits, and explicit failover handling.

A user opens an order page on follower A and sees a confirmed order. Their next request lands on follower B, whose replay is behind, and the order disappears. No write was issued by that user, so a policy that only tracks their own mutations cannot prevent the regression.

The required property is monotonic reads: later dependent reads must not use an earlier database history than the session has already observed. That does not mean field values always increase. A legitimate cancellation can change an order's status; the problem is returning an obsolete snapshot merely because routing changed.

## Choose the session boundary

Decide which requests must share progress: one browser workflow, one authenticated session, or a chain of service calls. Tracking every read globally can force unrelated users to wait for each other's progress. Tracking only one HTTP request does not protect the next page load.

Sticky routing helps while one healthy follower keeps advancing, but a reconnect, pool change, or failover can break that assumption. Treat stickiness as an optimization. For a correctness guarantee, carry evidence of the history already observed.

The PostgreSQL design below is an application protocol derived from WAL replay and snapshot semantics. PostgreSQL does not automatically associate a browser session with a minimum replica position.

## Capture progress after serving the read

For a physical standby, execute the business query on a pinned database connection, then capture its replay position before releasing that connection:

```sql
-- Run on the selected standby, with no pre-existing transaction.
BEGIN READ ONLY ISOLATION LEVEL READ COMMITTED;

SELECT id, status, updated_at
FROM orders
WHERE id = 8421;

SELECT pg_is_in_recovery() AS is_standby,
       pg_last_wal_replay_lsn() AS observed_lsn;

COMMIT;
```

Buffer the business result until the position and topology checks succeed. The replay position captured after the query covers the WAL that made its visible commits available. Replay may have advanced further while the query ran, producing a conservative token that makes the next follower wait for additional WAL.

The distinction between received and replayed WAL matters. The [administration-function reference](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE) documents the replay function. A receive position is not evidence that queries can see a transaction.

Associate the position with a trusted cluster identity and history generation supplied by your topology integration:

```json
{
  "cluster": "orders-eu",
  "history_generation": "writer-17",
  "minimum_replay_lsn": "0/4000200"
}
```

`history_generation` is an application field, not a PostgreSQL setting. The integration must reject role or history changes during the operation. `pg_is_in_recovery()` helps detect promotion but does not prove that two servers belong to the same history.

## Check the destination before reading

On follower B, compare its replay position with the session requirement:

```sql
SELECT pg_is_in_recovery() AS is_standby,
       pg_last_wal_replay_lsn() >= '0/4000200'::pg_lsn
         AS satisfies_session;
```

Use a parameter for the token in application code. PostgreSQL's [`pg_lsn` type](https://www.postgresql.org/docs/current/datatype-pg-lsn.html) provides numeric comparison; comparing text strings lexicographically is incorrect.

Implement a bounded loop:

```text
validate token and expected database history
pin one candidate connection
until the request's monotonic-clock deadline:
    check role, history, and replay position
    if the replay position satisfies the token:
        run the business read with a fresh snapshot
        capture progress after the read
        return result and merged token
    wait with a small bounded backoff
route to a certified current writer, or return a retryable error
```

The check and business read must use the same server. Checking B and then returning its connection to a load-balanced pool can route the actual query to C and invalidate the proof.

Use a new `READ COMMITTED` statement or transaction after the fence succeeds. An old `REPEATABLE READ` transaction retains its earlier snapshot. PostgreSQL explains these snapshot boundaries in its [transaction-isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html).

## Preserve progress across application layers

Within the same certified history, merge tokens by keeping the greatest LSN. Do not overwrite a newer session token with an older response that arrived late. Serialize causally dependent requests when their ordering matters; two concurrently launched requests cannot know which response the user will observe first.

Protect tokens against arbitrary future positions, cross-cluster reuse, and unlimited wait amplification. Validate the format, bind the cluster and session scope, cap the wait, and authenticate or store the metadata server-side.

Caches need the same treatment. A database fence followed by an older cached response still violates the intended behavior. Bypass that cache for the protected request, or associate cached entries with sufficient progress evidence and enforce it before serving them.

## Handle a changed replication history

Promotion creates a new PostgreSQL timeline, and divergent timelines can contain different changes at numerically comparable positions. The [recovery documentation](https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-TIMELINES) describes this branching history.

Do not simply discard an old token and claim the guarantee survived. An asynchronous failover may have lost a transaction the user already saw. The topology layer must certify that the new authoritative history contains the required progress, or the application must enter an explicit recovery path. A primary fallback is safe only with that same history requirement.

Test by pausing replay on B in a disposable cluster, reading a new row on A, then forcing the next request to B. Verify the request waits, falls back safely, or fails explicitly. Repeat with out-of-order responses, a pre-existing snapshot, cached data, and a promotion. The protocol is complete when each of those paths preserves the session's evidence instead of silently returning an older view.
