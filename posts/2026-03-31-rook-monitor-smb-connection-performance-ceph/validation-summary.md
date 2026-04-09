# Validation Summary: How to Monitor SMB Connection Performance with Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba (smbstatus, net status, smb.conf configuration)
- Ceph / CephFS (MDS performance counters, ceph daemon CLI)
- Prometheus (scrape configuration, metrics exposition)
- Grafana (dashboard panels, PromQL queries)
- SMB protocol (SMB3, connection monitoring)

## Sources Consulted
- Samba official documentation and man pages for smbstatus (Samba 4.19): https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Ceph documentation on MDS performance counters and perf dump output format: https://docs.ceph.com/en/latest/dev/perf_counters/
- imker25/samba_exporter GitHub repository (Go-based Samba Prometheus exporter): https://github.com/imker25/samba_exporter
- PyPI package index (verified samba-prometheus-exporter does not exist)
- Samba smb.conf man page for log level and smb2 leases parameters

## Issues Found

1. **smbstatus -S described incorrectly**: The post said `-S` shows "only connections." The `-S` flag actually shows connected shares (`--shares`). Changed description to "Show connected shares."

2. **smbstatus -L described incorrectly**: The post said `-L` shows "open files." The `-L` flag actually shows locked files / byte-range locks (`--locks`). Changed description to "Show locked files."

3. **smbstatus -B does not exist**: The post claimed `-B` shows "file locks," but this flag does not exist in any version of smbstatus. The functionality for viewing locks is already covered by `-L`. Removed the `-B` line entirely.

4. **Fictional pip package `samba-prometheus-exporter`**: The post recommended `pip3 install samba-prometheus-exporter`, but this package does not exist on PyPI. The metric names listed (samba_active_connections_total, samba_bytes_read_total, etc.) were also fictional. Replaced with the well-known Go-based `imker25/samba_exporter`, which is installed via system packages (.deb/.rpm), and updated metric names to match its actual output (samba_client_count, samba_share_count, samba_locked_file_count, samba_pid_count, samba_server_up).

5. **Grafana panel queries used fictional metrics**: The PromQL queries referenced the non-existent metrics from the fictional exporter. Updated to use the actual metrics from the real samba_exporter.

6. **Python latency script printed wrong field**: The script used `avgcount` (which is the number of operations, not latency) and displayed it as milliseconds. In Ceph perf dump, latency metrics have three fields: `avgcount` (operation count), `sum` (total cumulative seconds), and `avgtime` (average seconds per operation). Fixed the script to use `avgtime` and convert from seconds to milliseconds.

## Review Notes
- The `smb2 leases = yes` directive in the slow operations config section enables SMB2 lease support (client caching/oplocks). While tangentially related to performance, it is not a "slow query logging" setting. It was left unchanged since it is technically valid and can affect performance behavior.
- The `ceph daemon mds.* perf dump` command relies on shell globbing of admin socket paths. This works if exactly one MDS socket exists on the node, but could fail or be ambiguous with multiple MDS daemons. Left unchanged as it is functional in single-MDS setups.
- The `samba-in-kubernetes/smbmetrics` project and Samba 4.23+'s native `smb_prometheus_endpoint` are alternative Prometheus monitoring options that could be mentioned in a future update.
