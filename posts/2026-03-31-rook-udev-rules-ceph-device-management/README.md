# How to Use udev Rules for Ceph Device Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Udev, Device Management, OSD, Linux, Kubernetes

Description: Leverage udev rules to automate device labeling, discovery, and management for Ceph OSDs in Rook-managed Kubernetes environments.

---

## Overview

udev is the Linux device manager that handles device events and applies rules to configure devices as they appear. For Ceph device management with Rook, udev rules control automatic detection of new storage devices, device naming, and triggering of OSD provisioning.

## Rook's Built-in Device Discovery

Rook's discover DaemonSet runs on each node and monitors udev events programmatically to detect block device changes. It uses Go-based udev monitoring (not static udev rule files) to watch for device add, change, and remove events. When a new device appears, the discover daemon evaluates it and updates the cluster's device inventory.

You can check discovered devices via the Rook discover ConfigMap:

```bash
kubectl -n rook-ceph get configmap rook-ceph-discover-worker-1 -o jsonpath='{.data.devices}'
```

## Creating Custom udev Rules

To apply custom labels or aliases to devices before Rook provisioning, create a custom rules file:

```bash
cat /etc/udev/rules.d/60-ceph-devices.rules
```

```text
# Label SSD devices by model
SUBSYSTEM=="block", KERNEL=="sd*", ATTRS{model}=="Samsung SSD 870*", \
  SYMLINK+="ceph-ssd/$kernel", TAG+="ceph-ssd"

# Label NVMe devices
SUBSYSTEM=="block", KERNEL=="nvme*n*", \
  SYMLINK+="ceph-nvme/$kernel", TAG+="ceph-nvme"
```

Deploy this to all nodes via a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: udev-rules-installer
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: udev-rules-installer
  template:
    metadata:
      labels:
        app: udev-rules-installer
    spec:
      hostPID: true
      containers:
      - name: installer
        image: ubuntu:22.04
        command:
        - sh
        - -c
        - |
          cp /config/60-ceph-devices.rules /host/etc/udev/rules.d/
          nsenter --target 1 --mount -- udevadm control --reload-rules
          nsenter --target 1 --mount -- udevadm trigger --subsystem-match=block
          sleep infinity
        securityContext:
          privileged: true
        volumeMounts:
        - name: host-udev
          mountPath: /host/etc/udev/rules.d
        - name: config
          mountPath: /config
      volumes:
      - name: host-udev
        hostPath:
          path: /etc/udev/rules.d
      - name: config
        configMap:
          name: ceph-udev-rules
```

## Reloading udev Rules

After modifying rules, reload them on the node:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host udevadm control --reload-rules
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host udevadm trigger --subsystem-match=block
```

## Debugging udev Events

To monitor udev events for block devices:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host udevadm monitor --subsystem-match=block
```

Check device attributes used in rules:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host udevadm info --name=/dev/sdb --attribute-walk
```

## Referencing Devices by Persistent Attributes

Use stable device identifiers in Rook config to avoid `/dev/sdX` renaming:

```yaml
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: /dev/disk/by-id/wwn-0x500a075144e28580
      - name: /dev/disk/by-path/pci-0000:00:1f.2-ata-2
```

## Summary

udev rules provide the mechanism for automatic block device detection and management in Rook-Ceph environments. By combining Rook's built-in discover DaemonSet rules with custom device labeling rules, you can achieve reliable and stable device management across Kubernetes nodes.
