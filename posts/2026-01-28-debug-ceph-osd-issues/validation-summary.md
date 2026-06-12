# Validation Summary: How to Debug Ceph OSD Issues

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ceph (distributed storage)
- Ceph OSD (Object Storage Daemon)
- BlueStore backend
- RocksDB / BlueFS
- systemd / journalctl
- smartctl (SMART disk diagnostics)
- iostat / sar (sysstat tools)
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- Ceph official documentation — Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph official documentation — BlueStore: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph official documentation — Monitoring OSDs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph official documentation — `ceph osd` CLI: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph official documentation — Admin socket / asok commands: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph configuration reference (osd_memory_target, osd_recovery_*, osd_heartbeat_*): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- smartmontools manual: https://www.smartmontools.org/

## Issues Found

1. **Invalid `ceph osd up <osd-id>` command** — There is no `ceph osd up` subcommand in the Ceph CLI. Valid OSD state commands include `down`, `in`, `out`, but an OSD can only become `up` by reporting itself up after the daemon starts. Replaced with `ceph osd unset noup`, which is the actual remediation when the `noup` flag is blocking OSDs from being marked up.

2. **Incorrect column index in `ceph osd df` parsing** — The awk script used `$7` to test the `%USE` column, but in modern Ceph (Luminous+) `ceph osd df` includes a `CLASS` column and prints values with space-separated units (e.g. "10 GiB"), so `$7` is not `%USE`. Worse, awk's string-to-number coercion of values like "99GB" would produce false positives. Replaced the fragile column-based awk with a robust `ceph osd df -f json | jq` pipeline using the documented `.nodes[].utilization` field.

3. **`bluestore allocator dump` missing required argument** — The asok command requires an allocator name (`block`, `bluefs-db`, or `bluefs-wal`); calling it without one fails. Added `block` and a comment explaining the valid options.

4. **Invalid `osd.*` wildcard in `ceph config get`** — `ceph config get` accepts `global`, a service name (`osd`), or a specific daemon (`osd.0`), but not the `osd.*` glob form. Replaced `osd.*` with `osd` so the command applies the OSD service-level default.

## Review Notes

- The `ceph daemon osd.<id> dump_osd_network` command is available from Octopus onward — fine for current Ceph but would not work on older releases.
- `iostat -xz 1 5` is correct (`-z` suppresses zero-activity devices, `-x` enables extended stats). The grep filter `^sd|^nvme` is appropriate for typical device naming.
- The `osd_memory_target` default in recent Ceph releases is already 4 GiB; the example setting `4294967296` matches the default and is shown primarily for explicit configuration.
- BlueStore deferred-write sequence diagram is a reasonable conceptual representation, though in practice small writes go to deferred (WAL via RocksDB) while large writes are written directly to the block device and committed via metadata — the post's framing is acceptable as a high-level overview.
- All other Ceph admin/daemon commands (`dump_historic_slow_ops`, `dump_blocked_ops`, `dump_mempools`, `perf dump`, `bluefs stats`, `ceph-objectstore-tool --op fsck`, `ceph pg ls-by-osd`, etc.) and configuration parameters (`osd_recovery_max_active`, `osd_recovery_sleep`, `osd_max_backfills`, `osd_heartbeat_grace`, `osd_heartbeat_interval`, `osd_min_pg_log_entries`, `osd_max_pg_log_entries`, `bluestore_cache_size`) are valid and match official documentation.
