# How to Use Basic RBD Commands in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Block Storage, Command

Description: Learn the essential RBD CLI commands for managing RADOS Block Device images in a Rook-Ceph Kubernetes cluster.

---

## Introduction to RBD Commands

RADOS Block Device (RBD) is Ceph's block storage layer. In Rook-Ceph deployments, RBD images are automatically managed by the CSI driver, but understanding the underlying `rbd` CLI commands is essential for troubleshooting, migration, and manual operations.

All commands below are run via the Rook toolbox pod:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash
```

## Creating and Listing Images

Create a new RBD image in a pool:

```bash
rbd create replicapool/myimage --size 10G
```

List all images in a pool:

```bash
rbd ls replicapool
```

Get detailed information about an image:

```bash
rbd info replicapool/myimage
```

Sample output:

```text
rbd image 'myimage':
        size 10 GiB in 2560 objects
        order 22 (4 MiB objects)
        snapshot_count: 0
        id: abc123
        block_name_prefix: rbd_data.abc123
        format: 2
        features: layering, exclusive-lock, object-map, fast-diff, deep-flatten
```

## Resizing an Image

Increase an RBD image size:

```bash
rbd resize replicapool/myimage --size 20G
```

Decrease size (requires `--allow-shrink` flag):

```bash
rbd resize replicapool/myimage --size 5G --allow-shrink
```

## Removing an Image

Delete an RBD image:

```bash
rbd rm replicapool/myimage
```

Move an image to the trash before permanent deletion:

```bash
rbd trash move replicapool/myimage
rbd trash ls replicapool
rbd trash rm replicapool/<trash-id>
```

## Mapping and Unmapping Images

Map an RBD image to a block device on a host (requires `rbd-nbd` or kernel RBD). Note: these mapping commands must be run on the host node with kernel access, not from the Rook toolbox pod:

```bash
rbd map replicapool/myimage
```

Check currently mapped devices:

```bash
rbd showmapped
```

Unmap a device:

```bash
rbd unmap /dev/rbd0
```

## Checking Image Status

Check if an image is currently in use (watched) by any client:

```bash
rbd status replicapool/myimage
```

Sample output:

```text
Watchers:
        watcher=192.168.1.10:0/2345 client.12345 cookie=18446744073709551615
```

## Managing Features

Enable or disable RBD features on an image:

```bash
rbd feature enable replicapool/myimage exclusive-lock
rbd feature disable replicapool/myimage deep-flatten
```

## Summary

The `rbd` CLI provides essential operations for managing RADOS Block Device images in Ceph. Key commands include creating, resizing, removing, mapping, and inspecting images. In Rook-Ceph, these commands are typically run via the toolbox pod and are most useful for troubleshooting CSI-provisioned PVCs, performing manual migrations, and inspecting image metadata that Kubernetes abstracts away.
