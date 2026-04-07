# Validation Summary: How to Test Stretch Mode Failover Scenarios

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (stretch mode, OSD management, CRUSH rules, placement groups)
- Rook (Ceph operator for Kubernetes)
- rados (Ceph object storage CLI)
- iptables (Linux firewall)
- cephadm orchestrator (`ceph orch`)

## Sources Consulted
- Ceph official documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/control/)
- Ceph official documentation: Stretch mode (https://docs.ceph.com/en/latest/rados/operations/stretch-mode/)
- Ceph official documentation: rados CLI (https://docs.ceph.com/en/latest/man/8/rados/)
- Ceph official documentation: Monitoring OSDs (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)

## Issues Found

1. **`ceph osd up osd.0` is not a valid Ceph command.** There is no `ceph osd up` subcommand. When an OSD is administratively marked down with `ceph osd down`, the running daemon will automatically re-report itself as up. Changed recovery step to use `sudo systemctl restart ceph-osd@0` which is the standard approach for restarting an OSD daemon.

2. **`rados -p testpool put testobj /dev/urandom` would hang indefinitely.** The `rados put` command reads the entire input file, and `/dev/urandom` is an infinite character device stream. Replaced with a two-step approach: first create a finite test file with `dd if=/dev/urandom of=/tmp/testfile bs=4K count=1`, then use that file with `rados put`. Also changed the `rados get` output to `/tmp/testfile-out` for clarity rather than discarding to `/dev/null`.

## Review Notes
- The Python script for extracting OSDs from the CRUSH tree assumes a `datacenter -> host -> osd` hierarchy, which is correct for a standard stretch mode deployment but may need adjustment for non-standard CRUSH maps.
- The claim that "Both sites retain quorum (4 monitors)" after arbiter failure assumes the standard 5-monitor stretch mode layout (2 per site + 1 arbiter). This is the typical configuration and is correct.
- The `ceph osd down` command only administratively marks an OSD as down in the OSD map — it does not stop the daemon process. For a more realistic failure simulation, users may want to actually stop the OSD daemon with `systemctl stop ceph-osd@<id>`.
