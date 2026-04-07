# How to Understand MDS States in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Monitoring

Description: Learn the different MDS daemon states in CephFS and what each state means for cluster health and operations in Rook-Ceph deployments.

---

## Overview

CephFS Metadata Servers (MDS) transition through a defined set of states as they start up, serve clients, handle failover, and shut down. Understanding these states is essential for diagnosing MDS issues, interpreting health alerts, and knowing when action is required in your Rook-Ceph cluster.

## Check Current MDS State

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mds dump
```

## MDS State Reference

### Active States

```text
up:active       - Normal operating state. The MDS is serving client requests
                  for one or more metadata subtrees (ranks).

up:standby      - The MDS daemon is running and healthy but not serving
                  any rank. Ready to take over if an active MDS fails.

up:standby-replay - Actively replaying the journal of an active MDS to
                  minimize failover time. Tracks a specific active rank.
```

### Transition States

```text
up:boot         - The MDS just started and is registering with the monitor.
                  Transient state during startup.

up:creating     - The MDS is creating the initial journal and metadata
                  structures for a new rank.

up:starting     - The MDS is loading metadata from its journal before
                  becoming active. May take time on large filesystems.

up:stopping     - The MDS is flushing its journal and evicting clients
                  in preparation for graceful shutdown.

up:replay       - The MDS is replaying its journal after a crash or restart.
                  Clients cannot connect until replay completes.

up:reconnect    - The MDS completed journal replay and is waiting for
                  clients to reconnect within the session timeout window.

up:rejoin       - The MDS is rejoining the cluster after reconnect and
                  reintegrating with other active MDS daemons.

up:resolve      - The MDS is resolving distributed metadata inconsistencies
                  after a multi-active failover scenario.
```

### Failure States

```text
up:damaged      - The MDS encountered unrecoverable journal or metadata
                  corruption and cannot proceed without manual repair.

down:failed     - The MDS daemon crashed or was killed and has not been
                  replaced by a standby yet.

down:dne        - The MDS rank does not exist (no MDS assigned).

down:stopped    - The filesystem or rank was explicitly stopped via
                  "ceph fs set <fs_name> down true" or "ceph fs fail <fs_name>".
```

## Common State Transitions

A healthy startup sequence looks like:

```text
up:boot -> up:creating (new fs) or up:replay (existing) -> up:reconnect -> up:rejoin -> up:active
```

A failover sequence:

```text
active MDS crashes -> down:failed -> standby promoted -> up:replay -> up:reconnect -> up:rejoin -> up:active
```

## Investigate a Stuck MDS

If an MDS is stuck in `up:replay` or `up:reconnect` for too long:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds,rook_file_system=cephfs \
  --tail=200 | grep -E "replay|reconnect|error"
```

Force the stuck MDS to fail so a standby takes over:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds fail cephfs:0
```

## Summary

CephFS MDS states reflect the daemon lifecycle from boot through normal operation to failure and recovery. Key states to watch in production are `up:active` (healthy), `up:replay` and `up:reconnect` (transitional - acceptable for short durations), and `up:damaged` or `down:failed` (require immediate attention). Monitoring MDS states via `ceph fs status` is a fundamental part of operating a healthy Rook-Ceph CephFS deployment.
