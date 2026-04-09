# How to Configure NVMe-oF High Availability Groups in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, High Availability, Storage

Description: Configure NVMe-oF high availability groups in Ceph to ensure gateway failover and continuous storage access when individual gateway nodes fail.

---

## Overview

Ceph NVMe-oF supports high availability (HA) through gateway groups. Multiple gateway instances form an HA group where namespaces are load-balanced and failed gateways trigger automatic failover to surviving group members.

## Understanding NVMe-oF HA Architecture

In an HA configuration:
- Multiple gateway pods form a gateway group (defined by the `group` field)
- Each namespace is owned by one gateway (ANA optimized) while other gateways report it as inaccessible
- On failure, a surviving gateway takes ownership and becomes the optimized path
- Initiators use ANA (Asymmetric Namespace Access) to route I/O to the owning gateway

## Deploy a Multi-Gateway Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-ha-gw
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:1.5
  pool: nvmeof-pool
  group: ha-group
  instances: 2           # 2 active gateways
```

Verify two gateway pods are running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof
# Should show 2 pods in Running state
```

## Configure the HA Group

```bash
# Show gateway information
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof gateway info
```

Note: The HA group membership is configured declaratively via the `group` and `instances` fields in the CephNVMeOFGateway resource. All gateway instances sharing the same `group` name form an HA group automatically.

## Create Subsystem with HA Listeners

Add listeners on both gateways for the same subsystem:

```bash
NQN="nqn.2024-01.io.ceph:ha-subsystem"

# Create subsystem
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof subsystem add nqn=$NQN

# Add listener on gateway 1
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof listener add \
  nqn=$NQN host_name=nvmeof-ha-gw-0 \
  traddr=10.0.1.10 trsvcid=4420

# Add listener on gateway 2
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof listener add \
  nqn=$NQN host_name=nvmeof-ha-gw-1 \
  traddr=10.0.1.11 trsvcid=4420
```

## Verify ANA Groups

```bash
# Check ANA group assignments after namespace creation
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof namespace list nqn=$NQN

# Each namespace should show its ANA group assignment and owning gateway
```

## Test Failover

Simulate a gateway failure and verify continuity:

```bash
# On the initiator node
nvme list
nvme ana-log /dev/nvme0

# Kill one gateway pod
kubectl -n rook-ceph delete pod rook-ceph-nvmeof-ha-gw-0-xxxxx

# On initiator - verify path switches to second gateway
nvme ana-log /dev/nvme0  # Should show ANA state changed
```

## Summary

NVMe-oF HA groups in Ceph provide automatic failover by deploying multiple gateway instances that share subsystem listeners. ANA (Asymmetric Namespace Access) allows initiators to use the optimized path while automatically failing over to surviving gateways when the active gateway fails. The CephNVMeOFGateway resource `instances` field controls the number of HA group members, and the `group` field defines the HA group.
