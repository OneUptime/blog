# How to Manage rbd-mirror Daemon (systemd Integration)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Systemd, Daemon

Description: Learn how to manage the rbd-mirror daemon using systemd on bare-metal Ceph clusters, including starting, stopping, and configuring daemon instances.

---

## Overview

The `rbd-mirror` daemon handles asynchronous replication of RBD images between Ceph clusters. On bare-metal or containerized-but-non-Rook deployments, systemd manages the daemon lifecycle. Understanding how to start, stop, configure, and troubleshoot the daemon via systemd is essential for maintaining reliable mirroring.

## Understanding the rbd-mirror Daemon

Each `rbd-mirror` daemon can watch one or more pools for images that require mirroring. You can run multiple daemon instances for redundancy or to spread the load across pools.

The daemon ID is composed as: `rbd-mirror.<daemon-id>`

## Starting and Stopping the Daemon

```bash
# Start the rbd-mirror daemon for a specific ID
sudo systemctl start ceph-rbd-mirror@rbd-mirror.0

# Stop the daemon
sudo systemctl stop ceph-rbd-mirror@rbd-mirror.0

# Restart the daemon
sudo systemctl restart ceph-rbd-mirror@rbd-mirror.0

# Enable daemon to start at boot
sudo systemctl enable ceph-rbd-mirror@rbd-mirror.0
```

## Checking Daemon Status

```bash
# Check daemon service status
sudo systemctl status ceph-rbd-mirror@rbd-mirror.0

# View recent daemon logs
sudo journalctl -u ceph-rbd-mirror@rbd-mirror.0 -n 50

# Follow logs in real time
sudo journalctl -u ceph-rbd-mirror@rbd-mirror.0 -f
```

## Daemon Configuration File

The daemon reads configuration from `/etc/ceph/ceph.conf`. Key options:

```ini
[client.rbd-mirror]
rbd_mirror_journal_poll_age = 5
rbd_mirror_sync_point_update_age = 30
rbd_mirror_concurrent_image_syncs = 5
rbd_mirror_image_state_check_interval = 15
```

You can also use `ceph config set` for runtime changes:

```bash
# Set max concurrent image syncs
ceph config set rbd-mirror rbd_mirror_concurrent_image_syncs 5

# Check current config
ceph config get rbd-mirror rbd_mirror_concurrent_image_syncs
```

## Multiple Daemon Instances

For high availability and load distribution, run multiple daemon instances:

```bash
# Start a second instance
sudo systemctl start ceph-rbd-mirror@rbd-mirror.1
sudo systemctl enable ceph-rbd-mirror@rbd-mirror.1

# Each instance handles a subset of images automatically
# via the MGR-based distribution
```

## Verifying Daemon Registration

After starting the daemon, confirm it is registered with the cluster:

```bash
# List all rbd-mirror daemons in cluster status
ceph -s | grep rbd-mirror

# Check daemon health in the mirror pool status
rbd mirror pool status replicapool

# Check daemon health specifically
rbd mirror pool info replicapool
```

## Rook: CephRBDMirror Resource

In Rook, the daemon is managed via the `CephRBDMirror` CRD rather than systemd:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: my-rbd-mirror
  namespace: rook-ceph
spec:
  count: 2
  resources:
    requests:
      cpu: 100m
      memory: 512Mi
    limits:
      memory: 1Gi
```

Apply and verify:

```bash
kubectl apply -f ceph-rbd-mirror.yaml
kubectl -n rook-ceph get CephRBDMirror
kubectl -n rook-ceph get pods | grep rbd-mirror
```

## Summary

The `rbd-mirror` daemon is managed via systemd on bare-metal Ceph clusters using the `ceph-rbd-mirror@<id>` service template. Key management operations include starting, stopping, enabling at boot, and reading logs via journalctl. In Rook deployments, the `CephRBDMirror` CRD replaces direct systemd management. Always verify daemon registration with the cluster after any changes.
