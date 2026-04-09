# How to Set Up LIO iSCSI Gateway for RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, iSCSI, Gateway

Description: Learn how to configure the LIO iSCSI gateway to expose Ceph RBD images as iSCSI block devices for clients that cannot use the native RBD protocol.

---

## What Is the LIO iSCSI Gateway

The Ceph iSCSI gateway allows clients that do not support the native RBD protocol (Windows servers, legacy systems, VMware ESXi) to access Ceph RBD images over the standard iSCSI protocol. The gateway uses the Linux kernel's LIO iSCSI target stack and `tcmu-runner` to bridge between iSCSI and the Ceph RADOS layer.

In Rook-Ceph environments, the iSCSI gateway can be deployed as external gateway hosts pointing to the Rook-managed Ceph cluster.

## Step 1 - Prepare Gateway Hosts

Install the required packages on dedicated gateway hosts (not Kubernetes nodes):

```bash
apt-get install -y ceph-iscsi targetcli-fb tcmu-runner
```

Configure Ceph authentication on the gateway host:

```bash
kubectl get secret rook-ceph-admin-keyring -n rook-ceph \
  -o jsonpath='{.data.keyring}' | base64 -d > /etc/ceph/ceph.client.admin.keyring

kubectl get configmap rook-ceph-mon-endpoints -n rook-ceph \
  -o jsonpath='{.data.data}' > /etc/ceph/mon-endpoints.txt
```

## Step 2 - Create the RBD Image for iSCSI Export

Create an RBD image to be exported via iSCSI:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd create iscsipool/lun-01 --size 100G

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature disable iscsipool/lun-01 \
  deep-flatten fast-diff object-map
```

Note: iSCSI gateway requires disabling certain RBD features for compatibility. The `exclusive-lock` feature must remain enabled as it is required by the iSCSI gateway for proper operation.

## Step 3 - Configure the iSCSI Gateway

On the gateway host, create the gateway configuration:

```bash
gwcli
```

Use the interactive `gwcli` tool to configure:

```text
/> cd /iscsi-targets
/iscsi-targets> create iqn.2026-03.com.example:ceph-lun-01
/iscsi-targets> cd iqn.2026-03.com.example:ceph-lun-01/gateways
/gateways> create gw1 192.168.1.20
/gateways> cd /disks
/disks> attach iscsipool/lun-01
/disks> cd /iscsi-targets/iqn.2026-03.com.example:ceph-lun-01/hosts
/hosts> create iqn.2026-03.com.client:host-01
/hosts/iqn.2026-03.com.client:host-01> disk add iscsipool/lun-01
```

## Step 4 - Use the Configuration File Approach

Alternatively, define the gateway config in `/etc/ceph/iscsi-gateway.cfg`:

```text
[config]
cluster_name = ceph
gateway_keyring = /etc/ceph/ceph.client.admin.keyring
api_secure = false
api_user = admin
api_password = admin
api_port = 5000
trusted_ip_list = 192.168.1.20,192.168.1.21
```

Apply by restarting the iSCSI gateway services:

```bash
systemctl restart rbd-target-api
systemctl restart rbd-target-gw
```

## Step 5 - Connect an iSCSI Initiator (Linux)

On the client, install iSCSI initiator tools:

```bash
apt-get install -y open-iscsi
iscsiadm -m discovery -t sendtargets -p 192.168.1.20:3260
iscsiadm -m node --login
```

Verify the block device appears:

```bash
lsblk | grep sd
```

## Step 6 - Monitor the Gateway

Check gateway health:

```bash
gwcli ls
journalctl -u tcmu-runner --follow
```

## Summary

The LIO iSCSI gateway bridges the Ceph RBD protocol to standard iSCSI, enabling legacy clients and platforms like Windows and VMware to access RBD-backed storage. Disable incompatible RBD features before exposing images, configure portals and hosts via `gwcli`, and monitor the `tcmu-runner` service for errors. The gateway is stateless and can be scaled horizontally for high availability.
