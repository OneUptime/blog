# Validation Summary: How to Split Read and Write Traffic in a Patroni Cluster Without Sending Writes to a Replica

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL hot standby and streaming replication
- PostgreSQL roles, transaction defaults, WAL/LSN functions, `psql`, and libpq
- Patroni REST API, node tags, and `patronictl`
- HAProxy 3.4 TCP routing and HTTP health checks
- Shell scripting

## Sources Consulted
- [Patroni REST API health-check endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html#health-check-endpoints)
- [Patroni YAML tags](https://patroni.readthedocs.io/en/latest/yaml_configuration.html#tags)
- [Patroni local configuration and reload behavior](https://patroni.readthedocs.io/en/latest/patroni_configuration.html)
- [Patroni `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [HAProxy 3.4 configuration manual: HTTP health checks](https://docs.haproxy.org/3.4/configuration.html#4.2-option%20httpchk)
- [HAProxy 3.4 configuration manual: `on-marked-down`](https://docs.haproxy.org/3.4/configuration.html#5.2-on-marked-down)
- [HAProxy 3.4 configuration manual: health-check intervals and thresholds](https://docs.haproxy.org/3.4/configuration.html#5.2-inter)
- [PostgreSQL 18 hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL 18 streaming replication](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION)
- [PostgreSQL 18 libpq connection parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [PostgreSQL 18 `ALTER ROLE`](https://www.postgresql.org/docs/current/sql-alterrole.html)
- [PostgreSQL 18 transaction defaults](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL 18 `SET TRANSACTION`](https://www.postgresql.org/docs/current/sql-set-transaction.html)
- [PostgreSQL 18 recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE)
- [PostgreSQL 18 `psql`](https://www.postgresql.org/docs/current/app-psql.html)
- [PostgreSQL 18 monitoring statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)

## Issues Found
- The endpoint contracts and role-change paragraph treated HAProxy's view of Patroni roles as instantaneous. HAProxy samples health periodically, applies `fall 3` and `rise 2` independently in the two backends, and runs `shutdown-sessions` only after a backend server is marked down. The post now describes routing in terms of passed checks, documents the short convergence window and possible transient overlap or gap, and limits the multiple-primary alert to states that persist beyond that window.
- The post implied that overriding `default_transaction_read_only` required superuser or special privileges. It is a session default that an ordinary role can override on a primary. The text now states this directly and retains least-privilege object grants as the actual authorization boundary.
- The LSN-based read-after-write policy did not state when to capture the LSN or when to take the replica snapshot. The text now requires capturing a primary WAL LSN after commit and waiting for the replica to replay it before taking the read snapshot.

## Review Notes
- The HAProxy configuration syntax is valid for HAProxy 3.4. The HTTP checks connect to Patroni on port `8008`, while accepted PostgreSQL traffic uses port `5432` from each `server` line.
- Patroni accepts `64MB` as a human-readable byte lag limit. The post correctly notes that this does not establish a time-based staleness or application-consistency guarantee.
- The SQL, shell commands, `target_session_attrs` modes, Patroni tag behavior, reload guidance, and `patronictl switchover` recommendation are current and correct.
- PostgreSQL 18 exposes `pg_last_wal_replay_lsn()` for implementing the LSN policy but has no general built-in blocking wait command, so applications normally poll with a timeout.
