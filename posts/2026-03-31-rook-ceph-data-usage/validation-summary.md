# Validation Summary: How to Calculate and Interpret Data Usage in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Python 3 (for scripting and JSON parsing)

## Sources Consulted
- Ceph official documentation on `ceph df` command and JSON output format
- Ceph configuration reference for OSD full ratio settings (`mon_osd_nearfull_ratio`, `mon_osd_backfillfull_ratio`, `mon_osd_full_ratio`)
- Rook documentation on CephCluster CRD status fields
- Ceph source code for required ordering constraints on full ratio thresholds

## Issues Found
1. **Incorrect ordering of OSD full ratio thresholds**: The capacity alerts section had `mon_osd_full_ratio` set to 0.85 and `mon_osd_backfillfull_ratio` set to 0.90. Ceph requires the ordering `nearfull <= backfillfull <= full`. Having `full_ratio` (0.85) lower than `backfillfull_ratio` (0.90) violates this constraint and Ceph will reject the configuration. Fixed by swapping the values: `backfillfull_ratio` is now 0.85 and `full_ratio` is now 0.90, with comments updated accordingly.

## Review Notes
- The `MAX AVAIL` formula is presented as a simple `total_raw_available / replication_factor`. In practice, Ceph's calculation is more nuanced and considers CRUSH rules, the fullest OSD, and failure domain balancing. The simplification is acceptable for an introductory guide but readers should be aware actual values may differ slightly.
- The space efficiency script uses `d['stats']['total_used_bytes']` and labels the output "Raw used". In newer Ceph versions (Nautilus+), `total_used_raw_bytes` is a more precise field for raw usage as `total_used_bytes` corresponds to the "USED" column rather than the "RAW USED" column. For this tutorial's purpose of demonstrating the ratio calculation, the difference is negligible.
- The sample `ceph df` output numbers are internally consistent (100 GiB stored x 3 replicas = 300 GiB used) and serve as a good illustrative example.
