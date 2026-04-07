# Validation Summary: How to View OSD Performance Counters in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph OSD (Object Storage Daemon)
- BlueStore (Ceph storage backend)
- FileStore (legacy Ceph storage backend)
- Rook (Kubernetes operator for Ceph)

## Sources Consulted
- Ceph official documentation on performance counters: https://docs.ceph.com/en/latest/dev/perf_counters/
- Ceph `ceph tell` and `ceph daemon` CLI reference: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph BlueStore configuration and counters: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph perf dump output structure from Ceph source code and admin documentation

## Issues Found

1. **Incorrect parsing of `op_r`/`op_w` counters (first Python snippet)**: The code used `.get('op_r', {}).get('val', 0)` to access `op_r` and `op_w`, but these are simple integer counters in `perf dump` output, not nested objects. Fixed to access them directly as integers.

2. **Misleading latency field access (first Python snippet)**: The code printed `avgcount` as the latency value, but `avgcount` is the number of operations sampled, not the latency. Changed to use `avgtime` which represents the average latency per operation.

3. **Incorrect parsing in real-time monitoring script**: Same issue as #1 — `op_r` and `op_w` were accessed as dicts with `.get('avgcount')`. Fixed to access as plain integers. Also added `read_latency_avg` using `avgtime` for more useful output, and removed misleading `/s` suffix since these are cumulative counters, not per-second rates.

4. **Non-existent `ceph perf dump` command**: `ceph perf dump` and `ceph perf schema` are not valid Ceph CLI commands. Replaced with `ceph tell osd.* perf dump` for cluster-wide collection and `ceph tell osd.0 perf schema` for schema inspection, which are the correct commands.

5. **Incorrect BlueStore counter names**: `bluestore.submit_latency` was listed in the table but the actual counter name is `bluestore.submit_lat`. Similarly, `kv_sync_latency` and `kv_final_latency` in the BlueStore Python snippet should be `kv_sync_lat` and `kv_final_lat`. Fixed all occurrences including the summary section.

6. **BlueStore counter access using `sum` instead of `avgtime`**: The BlueStore Python snippet used `.get('sum')` to read latency counters. While `sum` is a valid field, `avgtime` is more useful as it gives the average latency per operation. Changed to use `avgtime`.

## Review Notes
- The `filestore.journal_latency` counter is correct but FileStore is deprecated since Ceph Nautilus (v14.x) and removed in recent releases. The post correctly labels it as "(FileStore)" which is sufficient context.
- The `watch` command approach for real-time monitoring shows cumulative counters, not per-second rates. A true rate calculation would require computing deltas between two snapshots. The labels were corrected to not imply per-second rates.
- The post title references "Rook" but the content is about native Ceph CLI tools. The commands work both in Rook-managed and standalone Ceph clusters (via `kubectl exec` into the toolbox pod for Rook), but no Rook-specific instructions are provided.
