# Validation Summary: How to Use the ceph status Command Effectively

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster management CLI)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing examples)

## Sources Consulted
- Ceph official documentation: ceph status command reference (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph health checks documentation (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph PG states documentation (https://docs.ceph.com/en/latest/rados/operations/pg-states/)
- Rook Ceph toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- kubectl exec documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)

## Issues Found
1. **`-it` flags used with piped `kubectl exec` output (lines 94-95 and 101-102)**: The two commands under "Parsing Status Programmatically" used `kubectl -n rook-ceph exec -it` while piping output to `python3`. The `-t` flag allocates a pseudo-TTY, which injects carriage return (`\r`) characters into the output stream. This corrupts JSON output and causes parsing failures. Removed `-it` from both commands so they read `kubectl -n rook-ceph exec deploy/rook-ceph-tools --`. The interactive `kubectl exec -it` usage in other commands (running `ceph status` directly, `watch`, `ceph health detail`) is correct since those are interactive terminal commands.

## Review Notes
- The watch mode command correctly retains `-it` since `watch` requires a TTY.
- The JSON field paths (`health.status`, `osdmap.num_up_osds`, `pgmap.num_pgs`) are accurate for Ceph Quincy (17.x) and Reef (18.x). Older Ceph versions (pre-Nautilus) had a different nested structure (`osdmap.osdmap.num_up_osds`), but this is not a concern for current Rook deployments.
- The 80% usage threshold recommendation is conservative but reasonable; Ceph's default `nearfull_ratio` is 0.85 and `full_ratio` is 0.95.
