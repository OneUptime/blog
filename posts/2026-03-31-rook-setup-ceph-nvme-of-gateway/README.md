# How to Set Up Ceph NVMe-oF Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Gateway, Storage, Block Storage

Description: Deploy and configure a Ceph NVMe-oF gateway using Rook to expose Ceph block storage over NVMe over Fabrics for high-performance storage access.

---

## Overview

NVMe over Fabrics (NVMe-oF) extends the NVMe protocol over network transports like TCP and RDMA, providing lower latency than iSCSI. Ceph supports NVMe-oF through the `nvmeof` gateway component, which Rook manages as a `CephNVMeOFGateway` resource.

## Prerequisites

Verify your kernel and modules support NVMe-oF:

```bash
# On initiator nodes
modprobe nvme-fabrics
modprobe nvme-tcp
lsmod | grep nvme
```

Check Ceph and Rook version support (requires Rook v1.19+ and Ceph Tentacle v20+):

```bash
kubectl -n rook-ceph get deployment rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Create the NVMe-oF Gateway

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gw
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:1.5
  pool: nvmeof-pool
  group: nvmeof-group
  instances: 2
```

Create the backing pool first:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool create nvmeof-pool 128 128

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd pool init nvmeof-pool
```

## Verify Gateway Deployment

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof
kubectl -n rook-ceph logs deploy/rook-ceph-nvmeof-nvmeof-gw

# Check gateway status via the NVMe-oF CLI (exec into the gateway pod)
kubectl -n rook-ceph exec deploy/rook-ceph-nvmeof-nvmeof-gw -- \
  cephnvmf gw info
```

## Create a Subsystem and Namespace

```bash
# Create a subsystem (NQN - NVMe Qualified Name)
kubectl -n rook-ceph exec deploy/rook-ceph-nvmeof-nvmeof-gw -- \
  cephnvmf subsystem add \
  --subsystem nqn.2024-01.io.ceph:mysubsystem

# Create a namespace (RBD image exposed as NVMe namespace)
kubectl -n rook-ceph exec deploy/rook-ceph-nvmeof-nvmeof-gw -- \
  cephnvmf namespace add \
  --subsystem nqn.2024-01.io.ceph:mysubsystem \
  --rbd-pool nvmeof-pool \
  --rbd-image nvme-disk-1 \
  --size 100G \
  --rbd-create-image
```

## Add a Gateway Listener

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-nvmeof-nvmeof-gw -- \
  cephnvmf listener add \
  --subsystem nqn.2024-01.io.ceph:mysubsystem \
  --host-name nvmeof-gw-0 \
  --traddr 10.0.1.10 \
  --trsvcid 4420
```

## Summary

Setting up a Ceph NVMe-oF gateway with Rook involves creating a CephNVMeOFGateway resource, deploying a backing RBD pool, configuring NVMe subsystems and namespaces, and adding TCP listeners. NVMe-oF provides lower latency than iSCSI while maintaining the familiar Ceph RBD data plane, making it ideal for latency-sensitive applications.
