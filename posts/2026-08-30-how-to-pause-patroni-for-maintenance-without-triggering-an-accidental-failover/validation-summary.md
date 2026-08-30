# Validation Summary: How to Pause Patroni for Maintenance Without Triggering an Accidental Failover

## Status

validated

## Post Type

Operational Guide / Maintenance Tutorial

## Technologies Covered

- Patroni 4.1.5 high-availability cluster management
- `patronictl` pause, resume, list, show-config, restart, reload, and switchover operations
- Patroni REST API and DCS-backed dynamic configuration
- PostgreSQL 18 recovery state, transaction read-only state, streaming replication, timelines, failover, fencing, and `pg_rewind`
- HAProxy or equivalent PostgreSQL traffic routing

## Sources Consulted

- [Patroni pause/resume mode](https://patroni.readthedocs.io/en/latest/pause.html) - documented paused-mode behavior, leader-lock handling, parallel-primary handling, allowed manual actions, prohibited scheduled actions, and PostgreSQL process behavior.
- [Patroni `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html) - current syntax and options for `pause`, `resume`, `list --extended`, `show-config`, `restart`, `reload`, and `switchover`, plus the cluster-level maintenance-mode footer.
- [Patroni 4.1.5 `patroni/ctl.py` implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ctl.py) - exact `--wait` polling, timeout, member-selection, output, and exit-status behavior.
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html) - per-member `/patroni` pause status, configuration changes, monitoring endpoints, and paused-cluster failover/switchover restrictions.
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html) and [Patroni configuration overview](https://patroni.readthedocs.io/en/latest/patroni_configuration.html) - DCS storage and asynchronous application of cluster-wide dynamic settings.
- [Patroni installation and upgrade guidance](https://patroni.readthedocs.io/en/latest/installation.html) - supported pause/resume workflow around Patroni upgrades.
- [PostgreSQL system administration functions](https://www.postgresql.org/docs/current/functions-admin.html) - current behavior of `pg_is_in_recovery()` and recovery information functions.
- [PostgreSQL client connection defaults](https://www.postgresql.org/docs/current/runtime-config-client.html) - scope and meaning of `transaction_read_only`.
- [PostgreSQL system information functions](https://www.postgresql.org/docs/current/functions-info.html) - behavior of `inet_server_addr()`, including Unix-domain socket connections.
- [PostgreSQL warm standby failover](https://www.postgresql.org/docs/current/warm-standby-failover.html) and [statistics views](https://www.postgresql.org/docs/current/monitoring-stats.html) - fencing/STONITH guidance, replication state, WAL receiver/sender information, and LSN progress checks.

## Issues Found

1. **`pause --wait` was described as an absolute acknowledgement barrier.** The post claimed that the command could not complete successfully until every known member had observed pause and that an unreachable member necessarily blocked completion. Patroni 4.1.5 polls for only `loop_wait + 1` seconds, ignores a member that disappears from the fresh DCS view, and can print `Success` for a stopped member whose DCS key did not advance. A still-updating member that fails to acknowledge produces a message but no nonzero exit status. Replaced the guarantee with the actual bounded DCS polling behavior and required an expected-member inventory, independent per-member verification, and fencing for any member that cannot be verified.
2. **The displayed verification commands were treated as per-member acknowledgement evidence.** `show-config` shows the cluster's DCS configuration, while `patronictl list --extended` shows a cluster-level `Maintenance mode: on` footer and adds restart/tag fields, not a per-member pause field. Corrected the text to require `"pause": true` from every expected running member's `/patroni` response. Added the corresponding per-member check after resume.
3. **The unreachable-member handling inherited the incorrect `--wait` assumption.** Reworked the section so that a `Success` message does not excuse an absent, stale, or unreachable member. Clarified that missing REST access alone does not prevent a running Patroni process with DCS access from observing the flag, and required verification through current DCS member data or another trusted channel; otherwise the node must remain fenced.
4. **`transaction_read_only` was used without stating its scope.** It reports the current transaction's mode rather than cluster-wide write fencing. Clarified that exactly one reachable member should report `pg_is_in_recovery() = false`, that the administrative transaction on the intended primary should be read/write, and that every unqueryable member must already be fenced.

## Review Notes

- Every shown `patronictl` command and option is current and correctly ordered for Patroni 4.1.5; no command changes were required.
- The remaining pause-mode behavior claims match the official documentation, including continued member/leader-key updates, no automatic replica promotion while paused, warning-only handling of parallel primaries, allowed manual unscheduled operations, and suppression of scheduled actions.
- The SQL statement is syntactically valid and uses current, non-deprecated PostgreSQL functions. `inet_server_addr()` returns `NULL` for a Unix-domain socket, so operators should identify the target from their connection context or use TCP when the returned address is needed as evidence.
- The post does not target a specific PostgreSQL version. The SQL functions and HA concepts checked here are valid in the current PostgreSQL 18 documentation and have existed across the supported PostgreSQL versions commonly used with Patroni.
- All six links in the post's Official Documentation section resolve to the intended current official pages.
- Command behavior was verified from the official manual and Patroni 4.1.5 source; no live Patroni cluster was available for an end-to-end maintenance exercise.
