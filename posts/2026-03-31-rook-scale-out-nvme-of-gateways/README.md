# How to Scale Out NVMe-oF Gateways in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Scaling, Storage

Description: Scale out Ceph NVMe-oF gateways horizontally to increase aggregate bandwidth and the number of concurrent initiator connections for high-demand workloads.

---

## Overview

As the number of NVMe-oF initiators or bandwidth requirements grow, you can scale out Ceph NVMe-oF gateways by increasing the `active` count in the CephNVMeoFGateway resource. Each gateway handles a subset of namespaces and connections.

## Check Current Gateway Load

Before scaling, assess current gateway utilization:

```bash
# Check gateway CPU and memory usage
kubectl -n rook-ceph top pods -l app=rook-ceph-nvmeof

# Check active connections per gateway
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof gateway info

# Check I/O stats
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof namespace list --nqn nqn.2024-01.io.ceph:mysubsystem
```

## Scale Up Gateway Count

Edit the CephNVMeoFGateway resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeoFGateway
metadata:
  name: nvmeof-gw
  namespace: rook-ceph
spec:
  server:
    active: 4  # scaled from 2 to 4
  resources:
    limits:
      cpu: "4"
      memory: "8Gi"
    requests:
      cpu: "2"
      memory: "4Gi"
```

Apply the change:

```bash
kubectl apply -f nvmeof-gateway.yaml
kubectl -n rook-ceph rollout status deploy/rook-ceph-nvmeof-nvmeof-gw
```

## Add Listeners for New Gateways

After scaling, add listeners for the new gateway instances to existing subsystems:

```bash
#!/bin/bash
NQN="nqn.2024-01.io.ceph:mysubsystem"

# Add new gateway instances as listeners
for i in 2 3; do
  GW_POD=$(kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof \
    -o jsonpath="{.items[$i].metadata.name}")
  GW_IP=$(kubectl -n rook-ceph get pod $GW_POD \
    -o jsonpath='{.status.hostIP}')

  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph nvmeof listener add \
    --nqn $NQN \
    --host-name nvmeof-gw-$i \
    --traddr $GW_IP \
    --trsvcid 4420 \
    --trtype TCP
done
```

## Rebalance Namespace Ownership

After adding gateways, rebalance namespaces across them:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof namespace list --nqn nqn.2024-01.io.ceph:mysubsystem

# Manually reassign namespace to new gateway if needed
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof namespace change_load_balancing_group \
  --nqn nqn.2024-01.io.ceph:mysubsystem \
  --nsid 1 \
  --load-balancing-group 2
```

## Configure Node Affinity for Gateways

Spread gateways across nodes to maximize bandwidth:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeoFGateway
spec:
  server:
    active: 4
  placement:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: rook-ceph-nvmeof
          topologyKey: kubernetes.io/hostname
```

## Summary

Scaling out Ceph NVMe-oF gateways involves increasing the `active` count in the CephNVMeoFGateway resource, adding listeners on new gateway instances to existing subsystems, and optionally rebalancing namespace ownership. Using pod anti-affinity ensures gateways spread across nodes for maximum aggregate bandwidth and failure isolation.
