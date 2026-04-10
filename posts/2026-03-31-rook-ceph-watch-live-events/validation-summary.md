# Validation Summary: How to Watch Live Cluster Events with ceph -w

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (cluster monitoring, `ceph -w`, `ceph log last`)
- Rook (Rook-Ceph operator, toolbox deployment)
- Kubernetes (`kubectl exec`, `kubectl drain`)

## Sources Consulted
- Ceph official documentation: `ceph -w` command for real-time cluster event streaming (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph CLI reference: `ceph log last` subcommand syntax with num, level, and channel parameters (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph health checks documentation: OSD_DOWN and health check message formats (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Rook documentation: Rook-Ceph toolbox deployment for running Ceph CLI commands (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Kubernetes documentation: `kubectl drain` with `--delete-emptydir-data` flag (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)

## Issues Found
No technical issues found.

## Review Notes
- The `ceph -w` command, event format description, severity tags (`[INF]`, `[WRN]`, `[ERR]`), and all example outputs accurately represent Ceph's actual log output format.
- The `ceph log last <num> <level> <channel>` syntax is correctly demonstrated with `ceph log last 50 warn cluster`.
- The `--delete-emptydir-data` flag for `kubectl drain` is the current non-deprecated flag (replacing `--delete-local-data` since Kubernetes 1.23).
- The grep filtering approach with `kubectl exec -it ... -- ceph -w | grep ...` works because the pipe executes on the host side. In practice, dropping `-t` when piping output could avoid potential TTY control character issues, but the command as written will work for most users.
- The post does not mention `[DBG]` (debug) or `[SEC]` (security) severity levels, which is appropriate since these are not typically seen with `ceph -w` in normal operations.
