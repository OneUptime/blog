# How to Configure Device Hotplug for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Hotplug, Device, Kubernetes, Storage

Description: Enable and configure automatic OSD provisioning when new block devices are hotplugged to Kubernetes nodes running Rook-Ceph clusters.

---

## Overview

Device hotplug support in Rook allows new disks added to a node to be automatically detected and provisioned as Ceph OSDs without manual intervention. This is particularly useful in bare-metal environments where drives are regularly added for capacity expansion.

## How Hotplug Detection Works

Rook's `rook-discover` DaemonSet uses udev events to detect device additions. When a new device is plugged in, the kernel generates a udev event, which the discover pod captures and triggers OSD provisioning if the device matches the configured criteria.

## Step 1: Enable the Discovery Daemon

Ensure the discovery daemon is enabled in the operator config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  ROOK_ENABLE_DISCOVERY_DAEMON: "true"
  ROOK_DISCOVER_DEVICES_INTERVAL: "30m"
```

Apply the config:

```bash
kubectl apply -f operator-config.yaml
kubectl -n rook-ceph rollout restart daemonset/rook-discover
```

## Step 2: Configure CephCluster for Auto-Detection

Enable automatic device use in the CephCluster spec:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
    config:
      osdsPerDevice: "1"
```

## Step 3: Verify the Discovery Daemon is Running

Confirm that the discover pods are running on all nodes:

```bash
kubectl -n rook-ceph get pods -l app=rook-discover
```

Check the discover daemon logs for device detection activity:

```bash
kubectl -n rook-ceph logs -l app=rook-discover --tail=50
```

If discover pods are not running, restart the operator to reconcile:

```bash
kubectl -n rook-ceph rollout restart deployment/rook-ceph-operator
```

## Step 4: Test Hotplug

Simulate a hotplug event to test the workflow:

```bash
# On the target node
udevadm trigger --action=add --subsystem-match=block
```

Watch for OSD prepare jobs:

```bash
kubectl -n rook-ceph get jobs -l app=rook-ceph-osd-prepare -w
```

## Step 5: Monitor New OSD Creation

After a device is hotplugged and detected:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

## Handling Slow Detection

If hotplug events are slow to trigger OSD provisioning, reduce the discovery interval:

```yaml
data:
  ROOK_DISCOVER_DEVICES_INTERVAL: "5m"
```

Or manually trigger discovery by deleting and recreating the discover pod.

## Summary

Device hotplug in Rook-Ceph is enabled by the `rook-discover` DaemonSet, which listens for udev events on block devices. Configuring `ROOK_ENABLE_DISCOVERY_DAEMON: "true"` and an appropriate `deviceFilter` in the CephCluster spec ensures new disks are automatically provisioned as OSDs when plugged into nodes.
