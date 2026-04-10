# How to Configure Kernel RBD with Multiple Ceph Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RBD, Kernel, Multi-Cluster, Block Storage

Description: Map RBD images from multiple distinct Ceph clusters on a single client host using the kernel RBD module with cluster-specific keyrings and configurations.

---

## Connecting to Multiple Ceph Clusters

Some deployments require a single client machine to access RBD images from two or more independent Ceph clusters. The kernel RBD module supports this, but requires careful configuration to use the correct monitors and credentials for each cluster.

## Naming Convention

Each cluster has a unique name (default: `ceph`). When using multiple clusters, assign distinct names:

- Cluster A: `prod`
- Cluster B: `dr`

## Setting Up Cluster-Specific Configurations

Create separate config and keyring files for each cluster:

```bash
# /etc/ceph/prod.conf
[global]
fsid = aaa11111-...
mon_host = 10.0.1.10,10.0.1.11,10.0.1.12
auth_cluster_required = cephx
auth_service_required = cephx
```

```bash
# /etc/ceph/dr.conf
[global]
fsid = bbb22222-...
mon_host = 10.0.2.10,10.0.2.11,10.0.2.12
auth_cluster_required = cephx
auth_service_required = cephx
```

Store keyrings:

```bash
# /etc/ceph/prod.client.admin.keyring
[client.admin]
key = AQprod...==

# /etc/ceph/dr.client.admin.keyring
[client.admin]
key = AQdr...==
```

## Mapping RBD Images from Each Cluster

Use the `--cluster` flag with `rbd` commands:

```bash
# Map from production cluster
rbd device map \
  --cluster prod \
  --conf /etc/ceph/prod.conf \
  --keyring /etc/ceph/prod.client.admin.keyring \
  mypool/prod-image

# Map from DR cluster
rbd device map \
  --cluster dr \
  --conf /etc/ceph/dr.conf \
  --keyring /etc/ceph/dr.client.admin.keyring \
  mypool/dr-image
```

## Listing Mapped Devices

```bash
rbd device list
```

Each device shows the cluster name, pool, image, and block device path.

## Using rbd-nbd for Better Multi-Cluster Support

For complex multi-cluster scenarios, `rbd-nbd` (NBD-based mapping) offers better isolation:

```bash
rbd-nbd map \
  --cluster prod \
  --conf /etc/ceph/prod.conf \
  --keyring /etc/ceph/prod.client.admin.keyring \
  mypool/prod-image

rbd-nbd list-mapped
```

## Configuring Automatic Remapping at Boot

Add entries for all clusters to the single `/etc/ceph/rbdmap` file, specifying `cluster` and `conf` for each entry:

```bash
# /etc/ceph/rbdmap
mypool/prod-image id=admin,keyring=/etc/ceph/prod.client.admin.keyring,cluster=prod,conf=/etc/ceph/prod.conf
mypool/dr-image   id=admin,keyring=/etc/ceph/dr.client.admin.keyring,cluster=dr,conf=/etc/ceph/dr.conf
```

Enable the rbdmap service:

```bash
sudo systemctl enable rbdmap
```

## Summary

Access multiple Ceph clusters from a single host by creating separate config and keyring files per cluster and using the `--cluster` flag with `rbd device map`. Use distinct cluster names in each ceph.conf to avoid conflicts. For complex deployments, `rbd-nbd` provides better process isolation and easier multi-cluster management.
