# Validation Summary: How to Prevent Stale Reads After a User Switches Between Followers

## Status
validated

## Post Type
Technical guide with SQL examples and application-protocol pseudocode.

## Technologies Covered
- PostgreSQL physical replication and hot standby
- Write-ahead logging (WAL), replay positions, and the `pg_lsn` data type
- Read Committed and Repeatable Read transaction isolation
- Monotonic reads, session progress tokens, connection pinning, and caches
- Replication timelines, promotion, and asynchronous failover
- JSON application metadata

## Sources Consulted
- PostgreSQL BEGIN reference: https://www.postgresql.org/docs/current/sql-begin.html
- PostgreSQL recovery information and control functions: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE
- PostgreSQL hot standby behavior and query conflicts: https://www.postgresql.org/docs/current/hot-standby.html
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL `pg_lsn` type: https://www.postgresql.org/docs/current/datatype-pg-lsn.html
- PostgreSQL recovery timelines: https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-TIMELINES
- PostgreSQL streaming replication and asynchronous data-loss behavior: https://www.postgresql.org/docs/current/warm-standby.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed against the official current documentation, which resolved to PostgreSQL 18. The examples use documented, non-deprecated features. No README changes were necessary.
- The transaction syntax is valid: PostgreSQL permits omission of commas between transaction modes. The business query assumes an existing `orders` table with the illustrated columns and appropriate SELECT privileges.
- The recovery functions and LSN cast/comparison are valid. Received WAL alone does not establish query visibility. Applications must require an affirmative role/progress check; a NULL replay position cannot satisfy the fence, and a promoted server's last replay position does not track subsequent primary writes.
- Hot standby documentation supports the replay/visibility reasoning: replayed commits become available to new snapshots. Read Committed supplies a new statement snapshot, whereas an existing Repeatable Read snapshot cannot be refreshed by polling replay progress.
- The JSON is valid application metadata, not PostgreSQL configuration. The post correctly makes trustworthy history certification an external prerequisite. A numeric LSN or recovery-role check alone cannot certify timeline ancestry or safe failover.
- Connection pinning, token merging, dependent-request ordering, cache fencing, and bounded waits were reviewed as application protocol requirements. A production deadline should cover database calls as well as backoff; recovery conflicts and connection failures need explicit retry/error handling.
- A primary fallback must also preserve progress observed in its own response before a later request returns to a follower. The standby replay function is not a general-purpose primary progress token; the article appropriately limits its SQL example to standbys.
- For the proposed replay-pause test, wait until `pg_get_wal_replay_pause_state()` reports `paused`: requesting a pause does not establish that replay has stopped. Pause/resume operations require appropriate privileges.
- All article links resolve to the intended resources. The current-documentation URLs can track later PostgreSQL releases.
- This was a documentation and static protocol review. No live replication cluster, failover exercise, or application implementation was executed. There are no terminal commands or server configuration snippets in the post; the wait loop is explicitly pseudocode.
