# How to Connect VMware ESXi to Ceph via iSCSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, VMware, ESXi

Description: Learn how to connect VMware ESXi hosts to Ceph iSCSI gateways to use RBD images as datastores for virtual machines.

---

## Overview

VMware ESXi supports iSCSI initiators that connect to external storage targets. By configuring ESXi to connect to a Ceph iSCSI gateway, you can use Ceph RBD images as VMFS datastores for hosting virtual machine disk files.

## Prerequisites

- Ceph iSCSI gateway configured and running
- RBD image created and exposed as a LUN
- VMware ESXi 6.7 or later
- Dedicated storage network (VMkernel adapter)

## Step 1 - Configure a VMkernel Adapter

Add a VMkernel network adapter dedicated to iSCSI traffic via the vSphere client or esxcli:

```bash
esxcli network vswitch standard add -v vSwitch1
esxcli network vswitch standard portgroup add -p iSCSI-PG -v vSwitch1
esxcli network ip interface add --interface-name vmk1 --portgroup-name iSCSI-PG
esxcli network ip interface ipv4 set --interface-name vmk1 \
  --ipv4 10.0.1.50 --netmask 255.255.255.0 --type static
```

## Step 2 - Enable the Software iSCSI Adapter

Enable the software iSCSI adapter on the ESXi host:

```bash
esxcli iscsi software set --enabled=true
```

Get the adapter name:

```bash
esxcli iscsi adapter list
```

Expected output:

```text
Adapter  Driver   State   UID            Description
-------  -------  ------  -------------  ----------------------------------------
vmhba65  iscsi_vmk  online  iscsi.vmhba65  iSCSI Software Adapter
```

## Step 3 - Configure Discovery

Add the Ceph iSCSI gateway as a send-targets discovery address:

```bash
ADAPTER=$(esxcli iscsi adapter list | awk 'NR>2 {print $1}' | head -1)
esxcli iscsi adapter discovery sendtarget add \
  --adapter $ADAPTER \
  --address 10.0.1.10:3260
```

Add the second gateway for redundancy:

```bash
esxcli iscsi adapter discovery sendtarget add \
  --adapter $ADAPTER \
  --address 10.0.1.11:3260
```

## Step 4 - Configure CHAP Authentication

Set CHAP credentials if required by the target:

```bash
esxcli iscsi adapter auth chap set \
  --adapter $ADAPTER \
  --level required \
  --authname initiator1 \
  --secret MySecretPassword123 \
  --direction uni
```

## Step 5 - Scan for Targets

Trigger a rescan to discover the Ceph target:

```bash
esxcli iscsi adapter discovery rediscover --adapter $ADAPTER
esxcli storage core adapter rescan --adapter $ADAPTER
```

List discovered targets:

```bash
esxcli iscsi adapter target list --adapter $ADAPTER
```

## Step 6 - Create a VMFS Datastore

Once the iSCSI LUN appears as a device, create a VMFS datastore:

```bash
# List available storage devices
esxcli storage core device list | grep iSCSI

# Create VMFS datastore (replace naa.XXXX with actual device NAA identifier)
vmkfstools -C vmfs6 -S CephDatastore /vmfs/devices/disks/naa.XXXX:1
```

Or through the vSphere Client: Storage > New Datastore > VMFS > select the iSCSI LUN.

## Verifying Connectivity

Check that the datastore is accessible:

```bash
esxcli storage filesystem list | grep CephDatastore
```

## Summary

Connecting VMware ESXi to Ceph iSCSI involves enabling the software iSCSI adapter, adding gateway addresses for discovery, configuring CHAP authentication, and then creating a VMFS datastore on the discovered LUN. Using two gateway addresses enables path redundancy, and a dedicated VMkernel adapter isolates iSCSI traffic from VM network traffic.
