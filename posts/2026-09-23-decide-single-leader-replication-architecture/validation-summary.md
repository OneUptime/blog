# Validation Summary: How to Decide When Single-Leader Replication Is the Right Architecture

## Status
validated

## Post Type
Technical architecture decision guide. Although it contains no executable code or configuration, it includes technical implementation details about replication, consistency, failover, fencing, and recovery and therefore qualifies for technical validation.

## Technologies Covered
- Single-leader replication and partitioned write ownership
- PostgreSQL primary servers, hot standbys, and WAL streaming replication
- Synchronous and asynchronous replication
- Read consistency, replay-position fences, and transaction snapshots
- High availability, failover, fencing, connection routing, and disaster recovery
- Recovery point objectives (RPO) and recovery time objectives (RTO)

## Sources Consulted
- PostgreSQL high-availability overview: https://www.postgresql.org/docs/current/high-availability.html
- PostgreSQL streaming replication, synchronous replication, WAL retention, and availability planning: https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL hot standby and query conflicts: https://www.postgresql.org/docs/current/hot-standby.html#HOT-STANDBY-CONFLICT
- PostgreSQL failover, fencing, and standby recreation: https://www.postgresql.org/docs/current/warm-standby-failover.html
- PostgreSQL synchronous commit modes: https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT
- PostgreSQL row-level locking: https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS
- PostgreSQL WAL position and recovery information functions: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO
- PostgreSQL transaction isolation and snapshot visibility: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL connection control and multiple-host connections: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-MULTIPLE-HOSTS
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed the repository README against the supplied content. No edits to the post were necessary.
- The two fenced text blocks describe architecture scope and a proposed failure contract; they are not executable commands or PostgreSQL configuration. There are no code examples, CLI flags, or APIs to execute or syntax-test.
- Confirmed the primary/standby distinction and read-only hot standby behavior. Additional read replicas do not eliminate conflicting writes to the same row. Per-shard leadership describes partitioned ownership, not multiple writable physical standbys for the same PostgreSQL cluster.
- The workload figures are explicitly illustrative. The primary total of 800 mutations plus 1,200 confirmation reads is correctly calculated as 2,000 requests per second. Capacity, promotion performance, and fallback overload require deployment-specific benchmarks; this review did not run a load or failover test.
- Read routing guidance is sound. A concrete replay fence must cover the relevant commit record, verify replay on the chosen standby, and use a snapshot obtained after replay. Primary reads also remain subject to transaction isolation. The post appropriately recommends a documented mechanism without presenting an incomplete implementation.
- Verified that conflicting standby queries can delay WAL replay or be canceled, and that PostgreSQL documents different delay choices for availability and reporting workloads.
- The failure block is a proposed contract, not a promise from default PostgreSQL settings. Synchronous durability requires suitable synchronous standby selection, commit settings, and promotion of a copy containing acknowledged commits. Commits can remain blocked while the required synchronous acknowledgments are unavailable; a replacement eligible standby can restore progress. An asynchronous remote replica has its own loss window.
- The post correctly treats acceptable data loss and interruption as separate objectives. Its regional example concerns the remote recovery point, not a numerical recovery-time guarantee. Independent writes in disconnected regions cannot both use one reachable global writer; ownership partitioning is correctly presented as a change to that architecture.
- Verified the need for external failure detection, exclusion of the old primary, and a supported standby rejoin or rebuild procedure. Connection routing must handle reconnection; changing DNS does not transfer an existing transaction to a different server. Operation-ID reconciliation is useful for uncertain commit outcomes and recovery testing, but is not itself an exactly-once guarantee.
- All three PostgreSQL links resolve to the intended documentation, including the hot-standby conflict section. The author URL redirects to the matching GitHub profile. The current documentation served PostgreSQL 18 during review; the post makes no version-specific API or configuration claims and contains no deprecated usage.
