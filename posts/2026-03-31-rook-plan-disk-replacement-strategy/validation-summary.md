# Validation Summary: How to Plan Disk Replacement Strategy for Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (OSD management, CRUSH map, health monitoring)
- Rook (Kubernetes-based Ceph orchestration)
- smartmontools (SMART disk health monitoring)
- Kubernetes (DaemonSet for node-level monitoring)
- Linux system administration (systemd, SCSI rescan, dd)

## Sources Consulted
- Ceph official documentation: OSD management commands (`ceph osd out`, `ceph osd down`, `ceph osd purge`)
- Ceph official documentation: `ceph osd df` and `ceph df` output format (Quincy 17.x / Reef 18.x)
- Rook documentation: OSD provisioning and prepare job behavior
- smartmontools documentation: `smartctl` flags and SMART attribute names

## Issues Found

1. **Invalid command `ceph osd stop osd.3`**: There is no `ceph osd stop` subcommand in the Ceph CLI. The OSD daemon is stopped via systemd on the host node (`systemctl stop ceph-osd@3`). The post had this as a comment but listed the invalid command as the primary instruction. Fixed by removing the invalid command and making `systemctl stop ceph-osd@3` the primary command.

2. **Redundant step `ceph osd crush remove osd.3` after `ceph osd purge`**: The `ceph osd purge` command already removes the OSD from the CRUSH map, deletes its auth keys, and removes the OSD entry. Running `ceph osd crush remove` afterward is redundant and would error since the OSD no longer exists in the CRUSH map. Removed the redundant step.

3. **Incorrect `ceph osd df` column reference (`$8`)**: In modern Ceph versions (Quincy/Reef), `ceph osd df` output includes additional columns (OMAP, META) that shift `%USE` to column `$11`. The original `$8` would return the OMAP column instead. Fixed to `$11` with a comment noting version-dependence, and added a filter to skip the header row.

4. **Incorrect `ceph df` awk pattern and formula**: Two sub-issues: (a) Modern Ceph outputs `TOTAL` without a trailing colon, so `/TOTAL:/` would not match. (b) The formula `($3/$2)*100` computes AVAIL/SIZE (availability percentage) but is labeled "Used", and awk arithmetic on values with unit suffixes (e.g., "3.64TiB") is unreliable. Fixed to read the pre-computed `%RAW USED` column directly from the output.

## Review Notes
- The `ceph osd df` and `ceph df` column numbers are inherently version-dependent. The fixes target Ceph Quincy (17.x) and Reef (18.x). Readers on older versions (Nautilus, Octopus) may need to adjust column numbers. Using `--format json` with `jq` would be more robust for scripting.
- The DaemonSet example installs `smartmontools` via `apk add` on every container restart. For production use, a custom image with smartmontools pre-installed would be more reliable.
- The DaemonSet specifies `hostPID: true` which is not required for SMART monitoring — only `privileged: true` and the `/dev` volume mount are needed. This is not incorrect but grants unnecessary access.
- The `ceph osd down` step (step 5) is optional when stopping the daemon — the monitors will detect the OSD as down via heartbeat failure. Manually marking it down is faster but not strictly required. Kept as-is since it's a valid optimization.
