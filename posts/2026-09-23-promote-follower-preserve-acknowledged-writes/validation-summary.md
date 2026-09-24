# Validation Summary: How to Promote the Most Up-to-Date Follower Without Losing Acknowledged Writes

## Status

validated

## Post Type

Technical guide with Patroni YAML configuration, PostgreSQL SQL inspection queries, and a conceptual failover runbook.

## Technologies Covered

- PostgreSQL physical streaming replication and write-ahead logging (WAL)
- PostgreSQL synchronous commits, replication statistics, recovery functions, and timelines
- Patroni dynamic configuration, synchronous replication, and promotion eligibility
- Distributed configuration stores (DCS), leader election, fencing, and high availability
- Application acknowledgment tracking and failure testing

## Sources Consulted

- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html): configuration names, values, nesting, and cluster-wide scope.
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html): synchronous eligibility, strict mode, timeline checking, asynchronous loss exposure, and cancellation caveats.
- [Patroni YAML configuration](https://patroni.readthedocs.io/en/latest/yaml_configuration.html): initialization-only behavior of `bootstrap.dcs`.
- [patronictl edit-config](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-edit-config): supported command and dynamic configuration updates.
- [Patroni REST API failover](https://patroni.readthedocs.io/en/latest/rest_api.html#failover): manual failover eligibility exceptions.
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html): split-brain prevention and stopping commits after leader-lock expiry.
- [PostgreSQL synchronous_commit](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT): local and remote durability semantics and weaker commit modes.
- [PostgreSQL replication statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW): all selected columns and distinctions between write, flush, and replay positions.
- [PostgreSQL recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO): signatures, meanings, and NULL behavior of the standby inspection functions.
- [PostgreSQL log-shipping standby servers](https://www.postgresql.org/docs/current/warm-standby.html): physical replication, synchronous standby selection, and availability planning.
- [PostgreSQL timelines](https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-TIMELINES): divergent recovery histories and timeline history files.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the post's author link resolves to the intended profile.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- The documentation served during review identified PostgreSQL 18 and Patroni 4.1.5. The post specifies no exact software version; its examples match these documented interfaces, with no deprecated API usage found.
- The YAML is syntactically valid by inspection. The quoted `on` values, boolean settings, synchronous replica count, and `postgresql.parameters` nesting match Patroni's configuration model. The snippet is appropriately presented as a policy fragment for an existing replication cluster.
- Patroni's maintained synchronization state governs automatic promotion. Strict mode retains the replication wait when no suitable synchronous standby exists. The post correctly distinguishes this from per-transaction durability overrides and from manual promotion.
- The asynchronous lag warning is accurate: primary-position sampling leaves an uncertainty interval even with a zero lag threshold. The documented leaderless manual-failover behavior also permits bypassing the listed lag, timeline, and synchronous-membership restrictions.
- Both SQL queries use documented columns and zero-argument functions with valid syntax. `pg_stat_replication` describes directly connected standbys; complete monitoring output requires suitable privileges, such as a superuser or a role with `pg_read_all_stats` privileges.
- Despite its name, `pg_last_wal_receive_lsn()` already reports WAL received and synced to disk through streaming replication. It is not merely a network-receipt position. It may return NULL before streaming starts; replay position measures a different stage. The post makes no contrary claim.
- With synchronous standbys configured, `synchronous_commit: "on"` waits for remote durable flush without requiring remote replay. Storage durability and surviving copies remain prerequisites, as the post states.
- The separation of election authority, data durability, and fencing is sound. The timeline discussion correctly rejects numerical LSN ranking across divergent histories. The text runbook is a review model, not an executable controller implementation.
- The cancellation caveat matches Patroni's documented behavior. Tracking successful acknowledgments separately from uncertain outcomes is appropriate, and the suggested failure cases are reasonable validation scenarios rather than claims of completed tests.
- All external links in the post resolved to the intended documentation or author profile. Documentation links use moving `current` or `latest` versions and should be checked again when deployments change versions.
- This was a documentation-based technical review. No live PostgreSQL/Patroni cluster was configured, and no SQL execution, promotion, or fault-injection tests were performed.
