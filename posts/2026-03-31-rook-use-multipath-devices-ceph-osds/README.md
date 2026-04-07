# How to Use Multipath Devices with Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Multipath, Storage, Kubernetes

Description: Configure Ceph OSDs to use Linux multipath devices for high-availability disk access, ensuring redundant paths to SAN-attached storage in Kubernetes.

---

## Overview

Multipath I/O (MPIO) provides redundant paths to storage devices, typically SAN-attached disks. When using multipath with Ceph OSDs via Rook, you need to ensure the multipath device mapper (`/dev/mapper/mpathX`) is visible inside OSD pods and properly configured.

## Prerequisites

Ensure `multipathd` is running on all Kubernetes nodes:

```bash
systemctl status multipathd
systemctl enable --now multipathd
```

Verify multipath devices are visible:

```bash
multipath -ll
ls /dev/mapper/mpath*
```

## Step 1: Configure Multipath on the Host

Create or update `/etc/multipath.conf`:

```bash
cat /etc/multipath.conf
```

```text
defaults {
    user_friendly_names yes
    find_multipaths yes
}
blacklist {
    devnode "^sd[a-z]$"
}
devices {
    device {
        vendor "NETAPP"
        product "LUN"
        path_grouping_policy failover
        path_checker tur
        failback immediate
    }
}
```

Reload multipath configuration:

```bash
systemctl reload multipathd
multipath -r
```

## Step 2: Configure Rook to Use Multipath Devices

In the CephCluster spec, reference the multipath device by its `/dev/mapper` path or by wwid:

```yaml
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: /dev/mapper/mpatha
      - name: /dev/mapper/mpathb
    config:
      osdsPerDevice: "1"
```

Alternatively use device path filter with mapper paths:

```yaml
spec:
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
    - name: worker-1
      devicePathFilter: "^/dev/mapper/mpath"
```

## Step 3: Allow Device Mapper in OSD Pods

Rook OSD pods need access to the device mapper. The Rook operator runs OSD pods with the necessary privileges by default to access `/dev/mapper` devices. You can verify the OSD configuration includes the correct device class:

```yaml
spec:
  storage:
    config:
      deviceClass: ssd
```

Check if the device is properly detected:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

## Step 4: Verify OSD Creation

After applying the CephCluster config, check that OSDs are created on the multipath devices:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata 0 | grep -i device
```

## Troubleshooting

If OSDs fail to start on multipath devices, check the OSD prepare logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-osd-prepare --tail=50
```

Verify device mapper symlinks inside the node:

```bash
kubectl debug node/worker-1 -it --image=busybox -- \
  chroot /host ls -la /dev/mapper/
```

## Summary

Using multipath devices with Ceph OSDs requires configuring `multipathd` on the host, referencing `/dev/mapper/mpathX` paths in the CephCluster storage spec, and ensuring OSD pods have access to device mapper nodes. This setup provides path-level redundancy for SAN-attached storage used as Ceph OSDs.
