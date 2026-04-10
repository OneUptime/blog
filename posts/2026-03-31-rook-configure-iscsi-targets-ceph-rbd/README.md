# How to Configure iSCSI Targets for Ceph RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, RBD, Block Storage

Description: Learn how to configure iSCSI targets on a Ceph iSCSI gateway to expose RBD images as LUNs to initiator clients.

---

## iSCSI Target Concepts

An iSCSI target is the server-side component that exposes storage. Each target has:
- A unique IQN (iSCSI Qualified Name)
- One or more portals (IP:port pairs)
- LUNs that map to RBD images
- ACLs that control which initiators can connect

## Naming iSCSI Targets

IQN format follows the convention `iqn.YYYY-MM.domain:identifier`. Choose meaningful names:

```text
iqn.2024-01.com.example:production-storage
iqn.2024-01.com.example:backup-storage
```

## Creating an RBD Image for the Target

Before creating a target, create and prepare the RBD image:

```bash
ceph osd pool create iscsi 64 64
rbd pool init iscsi
rbd create --size 200G iscsi/vol1 \
  --image-feature layering \
  --image-feature exclusive-lock \
  --image-feature object-map \
  --image-feature fast-diff
```

## Configuring the Target with gwcli

Start gwcli and create a new iSCSI target:

```bash
gwcli
```

```text
/> cd /iscsi-targets
/iscsi-targets> create iqn.2024-01.com.example:production-storage
```

Add portal IPs (one per gateway node):

```text
/iscsi-targets/iqn.2024-01.com.example:production-storage/> cd gateways
/gateways> create gw1 10.0.1.10
/gateways> create gw2 10.0.1.11
```

## Registering the RBD Disk

Before adding the disk to a target, register the RBD image globally in gwcli:

```text
/> cd /disks
/disks> create pool=iscsi image=vol1
```

## Adding the Disk to the Target

Map the registered disk as a LUN in the target:

```text
/> cd /iscsi-targets/iqn.2024-01.com.example:production-storage/disks
/disks> add iscsi/vol1
```

## Configuring ACLs for Initiators

Add the initiator IQN to the ACL:

```text
/iscsi-targets/iqn.../> cd hosts
/hosts> create iqn.1993-08.org.debian:prod-server-01
```

Assign the disk to the initiator:

```text
/hosts/iqn.1993-08.org.debian:prod-server-01> disk add iscsi/vol1
```

## Using the REST API

The `ceph-iscsi` daemon also exposes a REST API for programmatic target management:

```bash
curl -k -u admin:admin \
  https://gateway1:5000/api/targetconfig \
  -H "Content-Type: application/json" \
  -X GET
```

Create a target via the API:

```bash
curl -k -u admin:admin \
  https://gateway1:5000/api/target/iqn.2024-01.com.example:new-target \
  -H "Content-Type: application/json" \
  -X PUT
```

## Verifying the Configuration

Check the target is active:

```bash
targetcli ls /iscsi
```

Test connectivity from an initiator:

```bash
iscsiadm --mode discovery --type sendtargets --portal 10.0.1.10
iscsiadm --mode node --login
```

## Summary

Configuring iSCSI targets for Ceph RBD involves creating properly named targets with gateway portals, adding RBD disk mappings as LUNs, and setting up ACLs to authorize specific initiators. The `gwcli` tool and REST API both provide convenient interfaces for managing target configurations across multiple gateway nodes.
