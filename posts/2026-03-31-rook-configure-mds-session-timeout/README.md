# How to Configure MDS Session Timeout Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Session, Kubernetes, Configuration

Description: Learn how to configure CephFS MDS session timeout settings to control how long disconnected clients hold metadata locks before being evicted.

---

## Understanding MDS Sessions

Every CephFS client maintains a session with the MDS. This session tracks which files the client has open, which capabilities it holds, and its reconnect state after disconnections. Session timeouts control how long the MDS waits for disconnected clients before evicting them and releasing their held locks and capabilities.

Proper session timeout tuning is critical: too long and a crashed client blocks other clients from acquiring locks; too short and transient network interruptions cause unnecessary client evictions.

## Key Session Timeout Parameters

| Parameter | Default | Set Via | Purpose |
|---|---|---|---|
| `session_timeout` | 60s | `ceph fs set` | Time before marking an unresponsive client as stale |
| `session_autoclose` | 300s | `ceph fs set` | Time before evicting a stale/unresponsive client |
| `mds_reconnect_timeout` | 45s | `ceph config set mds` | Time to wait for clients to reconnect after MDS failover |
| `mds_cap_revoke_eviction_timeout` | 0 | `ceph config set mds` | Time to evict a client that refuses cap revocation |

## Setting Session Timeout

CephFS uses two filesystem-level parameters for session timeouts: `session_timeout` controls when an unresponsive client is marked as stale, and `session_autoclose` controls when a stale client is evicted. These are set with `ceph fs set`, not `ceph config set mds`:

```bash
# For stable datacenter networks - default stale timeout is fine
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set myfs session_timeout 60

# For unreliable networks or slow clients - increase the autoclose eviction timeout
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set myfs session_autoclose 600

# Verify current settings
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs get myfs | grep session
```

## Configuring Reconnect Timeout

The reconnect timeout controls how long the new active MDS waits for clients to reconnect after an MDS failover:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_reconnect_timeout 45

# Verify the current setting
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mds mds_reconnect_timeout
```

## Enabling Automatic Cap Revocation Eviction

Prevent clients from indefinitely blocking lock upgrades:

```bash
# Evict clients that don't respond to cap revocation within 60 seconds
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cap_revoke_eviction_timeout 60
```

## Checking Active Sessions

Monitor current client sessions and their ages:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph daemon mds.myfs.a session ls | \
  python3 -c "
import json, sys, time
sessions = json.load(sys.stdin)
for s in sessions:
    print(f\"Client: {s.get('client_metadata', {}).get('hostname', 'unknown')}, \
          Caps: {s.get('num_caps', 0)}, \
          State: {s.get('state', 'unknown')}\")"
```

## Manually Evicting Problem Sessions

If a specific client is holding locks and not responding:

```bash
# List sessions to find the client ID
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph daemon mds.myfs.a session ls

# Evict a specific session by client ID
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs:0 client evict id=4321
```

## Session Eviction Monitoring

Set up alerts for frequent client evictions, which indicate unstable clients or too-short timeouts:

```promql
increase(ceph_mds_sessions_session_remove[10m]) > 5
```

## Summary

MDS session timeouts balance availability against lock stickiness. Short timeouts reduce the impact of crashed clients but may evict clients with transient disconnections. Set `session_timeout` and `session_autoclose` via `ceph fs set` based on your network reliability, configure `mds_cap_revoke_eviction_timeout` to prevent capability revocation hangs, and monitor session removal rates as a health indicator. Adjust timeouts upward for WAN-connected clients and containerized workloads that may experience slow reconnections.
