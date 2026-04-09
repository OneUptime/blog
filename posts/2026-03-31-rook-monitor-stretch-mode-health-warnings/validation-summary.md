# Validation Summary: How to Monitor Stretch Mode Health Warnings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (stretch mode, CRUSH map, OSD management, PG distribution)
- Rook (Ceph operator for Kubernetes)
- Prometheus (alerting rules for Ceph health metrics)
- Bash scripting / Python

## Sources Consulted
- Ceph official documentation: stretch mode operations (https://docs.ceph.com/en/latest/rados/operations/stretch-mode/)
- Ceph official documentation: health checks (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph source code: `src/mon/OSDMonitor.cc` for stretch mode health check codes
- Ceph Prometheus module source: `src/pybind/mgr/prometheus/module.py` for metric values

## Issues Found

1. **Wrong health check code: `STRETCH_MODE_DEGRADED`** — The real Ceph health check code is `DEGRADED_STRETCH_MODE` (words reversed). Fixed the section header and example output.

2. **Fabricated health check code: `MON_STRETCH_MODE_NOT_DEFINED`** — This health check does not exist in Ceph. The real code for monitors missing CRUSH location labels in stretch mode is `NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE`. Fixed the section header.

3. **Fabricated health check code: `SITE_IMBALANCE`** — This health check does not exist in Ceph. The real code for bucket weight imbalance in stretch mode is `STRETCH_MODE_BUCKET_WEIGHT_IMBALANCE`. Fixed the section header.

4. **Wrong command syntax: `ceph mon set-location`** — The correct command uses an underscore: `ceph mon set_location`. Fixed both occurrences.

5. **Broken grep on `ceph osd map` output** — The command `ceph osd map <pool> <object> | grep primary` would match nothing because the output uses `pN` notation (e.g., `p2`) to indicate the primary OSD, not the word "primary". Removed the `| grep primary` pipe.

6. **Fundamentally broken PG distribution script** — The original script checked if a site name string (e.g., "dc1") appeared in the string representation of the `up` array, which contains integer OSD IDs (e.g., `[0, 1, 2]`). This would never match. Replaced with a corrected script that builds an OSD-to-site mapping from the CRUSH tree and then counts PG primaries per site.

## Review Notes
- The Prometheus alert rules use `ceph_health_status` values (0=OK, 1=WARN, 2=ERR) correctly, but they are generic health alerts and not specific to stretch mode. A more targeted approach could use `ceph_health_detail` metrics with stretch-mode-specific check names if available from the exporter.
- The `ceph osd df | grep down` command is technically functional but `ceph osd tree` is the more standard and reliable tool for identifying down OSDs along with their CRUSH hierarchy context.
- The `ceph osd reweight-by-utilization` command is valid but operates per-OSD based on utilization. For site-level weight imbalance in stretch mode, adjusting CRUSH bucket weights directly (e.g., via `ceph osd crush reweight`) may be more appropriate.
