# Validation Summary: Why Won't Patroni Reinitialize a Failed Replica? Debugging Bootstrap Methods, Slots, and Permissions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Patroni 4.1.5, `patronictl`, and the Patroni REST API
- PostgreSQL 18 and physical streaming replication
- `pg_basebackup` and custom replica-creation methods
- WAL-E and `patroni_wale_restore`
- PostgreSQL replication slots and WAL retention
- Patroni standby clusters and distributed configuration stores
- `pg_rewind`
- Linux storage, ownership, and mandatory-access-control checks

## Sources Consulted
- [Patroni 4.1.5 `patronictl reinit` documentation](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-reinit)
- [Patroni REST reinitialize endpoint](https://patroni.readthedocs.io/en/latest/rest_api.html#reinitialize-endpoint)
- [Patroni replica imaging and bootstrap documentation](https://patroni.readthedocs.io/en/latest/replica_bootstrap.html#building-replicas)
- [Patroni standby-cluster documentation](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [Patroni YAML configuration reference](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni 4.1.5 `patronictl` reinit implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ctl.py#L1198-L1251)
- [Patroni 4.1.5 reinitialize preconditions and force handling](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ha.py#L1989-L2023)
- [Patroni 4.1.5 replica-creation and cleanup implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/postgresql/bootstrap.py#L238-L332)
- [Patroni 4.1.5 `patroni_wale_restore` arguments](https://github.com/patroni/patroni/blob/v4.1.5/patroni/scripts/wale_restore.py#L334-L346)
- [PostgreSQL 18 `pg_basebackup`](https://www.postgresql.org/docs/18/app-pgbasebackup.html)
- [PostgreSQL 18 role attributes](https://www.postgresql.org/docs/18/role-attributes.html)
- [PostgreSQL 18 `pg_hba.conf`](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [PostgreSQL 18 warm standby and replication slots](https://www.postgresql.org/docs/18/warm-standby.html#STREAMING-REPLICATION-SLOTS)
- [PostgreSQL 18 `pg_replication_slots`](https://www.postgresql.org/docs/18/view-pg-replication-slots.html)
- [PostgreSQL 12 `pg_replication_slots`, used for the version comparison](https://www.postgresql.org/docs/12/view-pg-replication-slots.html)
- [PostgreSQL 18 replication monitoring views](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL 18 recovery information functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE)
- [PostgreSQL 18 `pg_rewind`](https://www.postgresql.org/docs/18/app-pgrewind.html)

## Issues Found
- The post described `--force` as only suppressing confirmation. For `patronictl reinit`, the flag is also sent to the REST endpoint and causes Patroni to cancel an already running asynchronous task before it tries to schedule reinitialization. Updated both explanations of the flag while retaining the correct warning that it cannot bypass replica/leader checks or repair the clone path.
- The post did not make clear that `--from-leader` replaces the configured creation-method list with the built-in `basebackup` method. Clarified that it bypasses custom `postgresql.create_replica_methods`, which is important when testing the method-order path discussed later in the guide.
- The `no_leader` explanation could imply that manual reinit works with no DCS leader. Patroni's source-less replica-creation path can use such a custom method, but the reinitialize endpoint rejects an unlocked cluster before selecting a method. Added the current-leader precondition and qualified the explanation.
- Several statements said reinit invariably removes `PGDATA`, consumes a full copy, and discards the old target data. Those statements are correct for built-in `basebackup` but not for a successful custom method with `keep_data: true`, such as a delta restore. Qualified the opening, storage, rewind, and conclusion text and corrected the advice about preserving failed state that Patroni may already have cleaned.
- The WAL-E example omitted `envdir`, although `patroni_wale_restore` requires `--envdir`. Added `envdir: /etc/wal-e.d/env`. Also changed the `no_params` wording to require `no_params: true`, because merely defining it with a false value does not suppress Patroni's default arguments.
- The source-connection section said only one WAL sender was needed. `pg_basebackup` requires one WAL sender for the backup and another for WAL streaming, and Patroni's built-in method uses `-X stream`. Corrected the capacity guidance.
- The WAL section implied that every freshly copied replica must fetch consistency WAL after the base backup. Patroni's built-in `pg_basebackup -X stream` already includes the WAL required for consistent startup. Rewrote the section to distinguish that WAL from archive needs of custom methods and from the subsequent WAL needed to catch up.

## Review Notes
The remaining CLI commands, YAML fields, SQL syntax, role/HBA requirements, slot-retention warnings, standby-cluster configuration edge case, tags, and documentation links are current and technically correct. The `wal_status` and `safe_wal_size` columns require PostgreSQL 13 or later; they are present in every PostgreSQL release supported on the validation date, and the post already warns readers to check their deployed major version. The recovery-function query confirms recovery and receive/replay positions but does not alone prove that the WAL receiver is currently streaming or identify its received timeline; the preceding `patronictl list --extended` check supplies state and timeline information. The sample `/var/lib/postgresql/18/main` path is a Debian/Ubuntu convention rather than an upstream default, but the post correctly tells readers to discover the configured path before using it. All links in the post and validation summary returned HTTP 200 during validation.
