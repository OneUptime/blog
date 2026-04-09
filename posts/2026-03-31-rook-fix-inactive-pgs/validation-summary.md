# Validation Summary: How to Fix Inactive PGs in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph Placement Groups (PGs)
- Ceph OSDs (Object Storage Daemons)
- Ceph CRUSH rules
- kubectl (Kubernetes CLI)

## Sources Consulted
- [Ceph Documentation - Placement Group States](https://docs.ceph.com/en/latest/rados/operations/pg-states/)
- [Ceph Documentation - Troubleshooting PGs](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/)
- [Ceph Documentation - OSD Management](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- [Ceph Documentation - CRUSH Map](https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- [Ceph CLI Reference - pg repeer](https://docs.ceph.com/en/latest/man/8/ceph/#pg)
- [Rook Documentation - Ceph Toolbox](https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

1. **Incorrect definition of inactive PGs**: The original text stated an inactive PG is one that "has not had an active primary OSD for more than a configurable time threshold." This conflates the PG state with the health warning. A PG is in the inactive state immediately when no OSD can serve as primary — the configurable threshold (`mon_pg_stuck_threshold`) only controls when Ceph raises a health warning about stuck inactive PGs, not when the PG enters the inactive state. Fixed to: "does not currently have an active set of OSDs that can serve as primary."

2. **Wrong command for forcing PG re-peering**: Step 3 used `ceph pg <pgid> query` and described it as forcing the PG to re-peer. The `query` subcommand is a diagnostic command that displays PG state information — it does not trigger any recovery action. Fixed to `ceph pg repeer <pgid>`, which is the correct command to force a PG to re-peer (available since Ceph Nautilus 14.x).

## Review Notes
- All `kubectl` commands correctly target the `rook-ceph` namespace and use the `deploy/rook-ceph-tools` toolbox deployment, which is the standard Rook pattern.
- The `ceph pg dump_stuck inactive` command is correct for listing stuck inactive PGs.
- The `ceph osd crush rule list` and `ceph osd crush rule dump` commands are valid.
- The `ceph osd out osd.<id>` command is correct for marking an OSD out.
- The `watch` command inside the toolbox container is valid since the Rook toolbox image includes common Linux utilities.
- The common causes listed are accurate and cover the main scenarios for inactive PGs.
- The overall troubleshooting flow (check OSDs, check CRUSH rules, force recovery, mark out permanently failed OSDs) is a sound approach.
