# Validation Summary: How to Understand the undersized PG State in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Placement Groups, OSD management, CRUSH maps)
- Rook (Ceph operator for Kubernetes)
- jq (JSON processing)
- systemd (OSD service management)

## Sources Consulted
- Ceph official documentation on Placement Group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on monitoring PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph `pg query` command output structure: https://docs.ceph.com/en/latest/rados/operations/pg-concepts/
- Ceph pool configuration documentation: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found
1. **Incorrect jq field in PG query command (line 54)**: The original command used `.info.stats.acting_primary` labeled as `size` in the jq output. The `acting_primary` field is an OSD ID (integer identifying the primary OSD), not the pool replication size. This would produce misleading output. Removed the incorrect field, keeping only `state`, `acting`, and `up` which are the relevant fields from `ceph pg query` output.

## Review Notes
- The post states that undersized means the PG "has NOT fallen below the min_size threshold." This is a reasonable simplification — the `undersized` flag itself only means acting set < pool size. If the acting set also drops below `min_size`, the PG would lose its `active` state and stop serving I/O. The post correctly notes that I/O continues, which implies the PG is still above `min_size`.
- The `systemctl start ceph-osd@<id>.service` command is correct for bare-metal/VM Ceph deployments but would not apply directly in Rook-managed Kubernetes environments where OSD pods are managed by the operator. Since the post is tagged with Rook, readers in a Rook context would need to use `kubectl` commands instead. This is not incorrect but worth noting.
- All other Ceph CLI commands (`ceph osd pool get`, `ceph osd stat`, `ceph status`, `ceph pg stat`, `ceph pg dump`, `ceph osd tree`, `ceph osd set/unset noout`) are syntactically correct and use current flags.
