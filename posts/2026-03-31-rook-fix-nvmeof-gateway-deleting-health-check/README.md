# How to Fix NVMEOF_GATEWAY_DELETING Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, NVMe-oF, Health Check, Gateway

Description: Learn how to resolve NVMEOF_GATEWAY_DELETING in Ceph, a warning that an NVMe-oF gateway is stuck in a deleting state and cannot complete its removal.

---

## What Is NVMEOF_GATEWAY_DELETING?

`NVMEOF_GATEWAY_DELETING` is a Ceph health warning that fires when an NVMe-oF gateway is in the process of being deleted but has not completed deletion within the expected timeframe. This stuck deletion can happen if the gateway still has active NVMe-oF connections, has pending I/O operations, or if there is a bug in the deletion workflow.

A gateway stuck in deleting state prevents the cluster from reaching a clean health state and may indicate active clients are still connected to the gateway being removed.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] NVMEOF_GATEWAY_DELETING: 1 gateway(s) are in deleting state; namespaces are automatically balanced across remaining gateways, this should take a few minutes.
    NVMeoF Gateway 'nvmeof-gw-b' is in deleting state.
```

Check gateway status:

```bash
ceph nvmeof gw info
```

Check Kubernetes resources:

```bash
kubectl -n rook-ceph get cephnvmeofgateway
kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof
```

## Common Causes

- Active NVMe-oF initiator connections that haven't disconnected
- I/O operations in flight on namespaces hosted by the deleting gateway
- Kubernetes finalizers blocking pod deletion
- Ceph authentication keys that haven't been cleaned up

## Fix Steps

### Step 1 - Check for Active NVMe-oF Connections

On all initiator nodes, check for active connections to the gateway being deleted:

```bash
nvme list-subsys
nvme list
```

### Step 2 - Disconnect Initiators from the Gateway

On each initiator node, disconnect from the gateway being removed:

```bash
nvme disconnect --device /dev/nvme1
```

Or disconnect by NQN:

```bash
nvme disconnect --nqn nqn.2016-06.io.spdk:ceph-nvmeof-gw-b
```

### Step 3 - Force Delete Stuck Gateway

If the gateway is stuck and initiators are already disconnected, check for finalizers:

```bash
kubectl -n rook-ceph get pods ceph-nvmeof-b-<hash> -o yaml | grep finalizers
```

Remove stuck finalizers:

```bash
kubectl -n rook-ceph patch pod ceph-nvmeof-b-<hash> -p '{"metadata":{"finalizers":null}}'
```

### Step 4 - Clean Up Ceph Auth Keys

Remove any leftover authentication keys for the deleted gateway:

```bash
ceph auth ls | grep nvmeof
ceph auth del client.nvmeof.b
```

### Step 5 - Force Remove from Ceph MGR

If the gateway is stuck in Ceph's internal state, remove it using the monitor command (replace `<pool>` with your RADOS pool name):

```bash
ceph nvme-gw delete nvmeof-gw-b <pool> group0
```

### Step 6 - Restart the Rook Operator

After cleanup, restart the operator to reconcile state:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

## Preventing Stuck Deletions

Before removing an NVMe-oF gateway, always:

1. Migrate NVMe-oF clients to other gateways
2. Verify no active connections remain
3. Remove the gateway from the CephNVMeOFGateway CR

```yaml
spec:
  instances: 1  # reduce from 2 to 1
```

## Summary

`NVMEOF_GATEWAY_DELETING` indicates an NVMe-oF gateway is stuck during deletion. Fix it by disconnecting all NVMe-oF initiators from the stuck gateway, removing Kubernetes finalizers, cleaning up orphaned Ceph auth keys, and using force-delete commands if necessary. Always migrate clients before removing gateways to avoid stuck deletion states.
