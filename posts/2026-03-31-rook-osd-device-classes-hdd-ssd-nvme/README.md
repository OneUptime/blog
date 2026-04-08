# How to Manage OSD Device Classes (HDD, SSD, NVMe) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Kubernetes, Performance

Description: Learn how to manage OSD device classes in Ceph to create tiered storage pools that target HDD, SSD, or NVMe drives using CRUSH rules.

---

## What Are OSD Device Classes

Ceph automatically detects the type of each storage device and assigns it a device class. The three built-in classes are:

- `hdd` - spinning hard drives
- `ssd` - SATA or SAS solid state drives
- `nvme` - NVMe PCIe solid state drives

Device classes let you create CRUSH rules that target specific drive types. This is the foundation for performance tiering: you can place hot data on NVMe drives and cold data on HDDs, all within the same Ceph cluster.

## Viewing Device Classes

To list all OSDs with their assigned device class:

```bash
ceph osd tree
```

The output includes a `CLASS` column. You can also query a specific OSD:

```bash
ceph osd metadata osd.0 | grep rotational
```

A `rotational` value of `1` indicates HDD; `0` indicates SSD or NVMe.

## Setting Device Classes Manually

If Ceph misdetects a device class, or if you are using a virtual disk, you can set it manually:

```bash
ceph osd crush rm-device-class osd.0
ceph osd crush set-device-class ssd osd.0
```

You must first remove the existing class before assigning a new one. To apply to multiple OSDs at once:

```bash
ceph osd crush set-device-class nvme osd.4 osd.5 osd.6
```

## Creating CRUSH Rules for Device Classes

Once OSDs are classified, create CRUSH rules that target a specific class:

```bash
ceph osd crush rule create-replicated ssd-rule default host ssd
ceph osd crush rule create-replicated hdd-rule default host hdd
ceph osd crush rule create-replicated nvme-rule default host nvme
```

The syntax is: `create-replicated <rule-name> <root> <failure-domain> <device-class>`.

Verify the rules:

```bash
ceph osd crush rule ls
ceph osd crush rule dump ssd-rule
```

## Assigning Rules to Pools

With the CRUSH rules created, assign them to the appropriate pools:

```bash
ceph osd pool set hot-data crush_rule nvme-rule
ceph osd pool set warm-data crush_rule ssd-rule
ceph osd pool set cold-data crush_rule hdd-rule
```

After changing a rule, Ceph will begin migrating PGs to the correct device class. Monitor progress:

```bash
ceph -s
ceph pg stat
```

## Creating Erasure Coded Pools with Device Classes

For erasure coded pools, define a profile with the device class, then create the pool:

```bash
ceph osd erasure-code-profile set nvme-ec-profile k=4 m=2 crush-device-class=nvme
ceph osd pool create nvme-ec-pool erasure nvme-ec-profile
```

## Using Device Classes in Rook CephBlockPool

In a Rook-managed cluster, specify device classes in the `CephBlockPool` manifest:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: ssd
```

Rook translates the `deviceClass` field into a CRUSH rule targeting that class.

## Summary

OSD device classes in Ceph allow you to build tiered storage by assigning HDDs, SSDs, and NVMe drives to distinct classes. Create class-aware CRUSH rules, then assign those rules to pools to control which physical devices store each pool's data. This approach supports both replicated and erasure coded pools and integrates cleanly with Rook-managed Kubernetes deployments.
