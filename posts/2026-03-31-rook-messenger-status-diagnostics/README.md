# How to Check Messenger Status and Connection Diagnostics in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network, Messenger, Diagnostic

Description: Inspect Ceph messenger connection status, active sessions, and network connectivity between daemons using admin socket commands in Rook clusters.

---

Ceph uses its own messaging layer (Messenger) to handle all inter-daemon and client-daemon communication. When diagnosing connectivity issues, slow operations, or network-related health warnings, the messenger status commands provide visibility into active connections and their state.

## Messenger Versions

Ceph supports two messenger protocols:

| Version | Description |
|---|---|
| Messenger v1 (msgr1) | Legacy protocol, port 6789 (MON) / 6800+ (OSD) |
| Messenger v2 (msgr2) | Modern protocol with optional encryption, port 3300 (MON) / 6800+ (OSD) |

Rook enables msgr2 by default on Ceph Nautilus and later.

## Check Messenger Status

> **Note:** `ceph daemon` commands require access to the daemon's local admin socket and must be run from the daemon's own pod. From the Rook toolbox, use `ceph tell` instead, which routes commands through the monitor.

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell osd.0 status
```

Sample output:

```text
{
  "cluster_fsid": "a3f8e12d-...",
  "osd_fsid": "b4c9f231-...",
  "whoami": 0,
  "state": "active",
  "oldest_map": 1,
  "newest_map": 1234,
  "num_pgs": 45
}
```

## View Active Connections

To inspect active connections, exec into the OSD pod directly (admin socket access required):

```bash
kubectl exec -n rook-ceph $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph-osd-id=0 -o jsonpath='{.items[0].metadata.name}') -c osd -- \
  ceph daemon osd.0 objecter_requests
```

This shows outgoing requests and connections from the OSD to other daemons. To view in-flight operations and their source connections:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell osd.0 dump_ops_in_flight
```

## Check Messenger Configuration

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph tell osd.0 config get ms_type
  ceph tell osd.0 config get ms_bind_msgr1
  ceph tell osd.0 config get ms_bind_msgr2
  ceph tell osd.0 config get ms_cluster_mode
  ceph tell osd.0 config get ms_service_mode
"
```

## Check Monitor Connection Status

To inspect monitor connections, exec into the monitor pod (admin socket access required):

```bash
kubectl exec -n rook-ceph $(kubectl get pod -n rook-ceph -l app=rook-ceph-mon,ceph_daemon_id=a -o jsonpath='{.items[0].metadata.name}') -c mon -- \
  ceph daemon mon.a sessions
```

## Verify Msgr2 Encryption Status

For clusters with encryption at the messenger level:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell osd.0 config get ms_cluster_mode
```

Values: `secure` (encrypted), `crc` (integrity only). The default is `crc secure` (a preference-ordered list).

## Network Connectivity Tests Between Pods

Test OSD-to-OSD connectivity at the network layer:

```bash
# Get OSD pod IPs
kubectl get pods -n rook-ceph -l app=rook-ceph-osd \
  -o custom-columns='NAME:.metadata.name,IP:.status.podIP'

# Test connectivity from toolbox to an OSD port
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  timeout 5 bash -c "echo > /dev/tcp/10.0.0.5/6800" && echo "Connected" || echo "Failed"
```

## View Messenger Performance Counters

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | python3 -c "
import json, sys
data = json.load(sys.stdin)
ms = data.get('AsyncMessenger::Worker-0', {})
for key, val in ms.items():
    if isinstance(val, (int, float)) and val > 0:
        print(f'  {key}: {val}')
"
```

## Check for Network Errors in Logs

```bash
kubectl logs -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph-osd-id=0 -o name) \
  -c osd | grep -E "connection (lost|reset|refused|timeout)"
```

## Summary

Ceph messenger diagnostics use `ceph tell` and admin socket commands (`objecter_requests`, `config get ms_*`, `perf dump`) to inspect active connections, protocol versions, and encryption settings. In Rook clusters, verify that all OSD and MON pods can reach each other on the appropriate ports (3300 for MON msgr2, 6789 for MON msgr1, 6800+ for OSD msgr1/msgr2). Check messenger performance counters for connection errors that correlate with client-visible I/O latency spikes.
