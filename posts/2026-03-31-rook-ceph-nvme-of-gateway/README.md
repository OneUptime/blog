# How to Set Up Ceph NVMe-oF Gateway for RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, RBD, Block Storage

Description: Learn how to deploy and configure the Ceph NVMe-oF gateway to expose RBD images as NVMe-oF namespaces in Rook-Ceph Kubernetes environments.

---

## What Is the Ceph NVMe-oF Gateway

The Ceph NVMe over Fabrics (NVMe-oF) gateway exposes RBD images as NVMe namespaces over TCP (NVMe/TCP). This provides ultra-low-latency block storage access for clients that support the NVMe/TCP protocol, such as:

- High-performance databases requiring sub-millisecond latency
- AI/ML training workloads with large sequential I/O
- Bare-metal servers that need fast block access without the RBD driver

The gateway is managed by Rook via the `CephNVMeOFGateway` CRD.

## Step 1 - Enable the NVMe-oF Gateway Feature

Ensure the Rook operator has the NVMe-oF feature enabled. Check the operator ConfigMap:

```bash
kubectl get configmap rook-ceph-operator-config -n rook-ceph -o yaml | grep nvme
```

## Step 2 - Create a CephNVMeOFGateway Resource

Deploy the NVMe-oF gateway via the Rook CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gateway
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:latest
  instances: 2
  pool: replicapool
  loadBalancerSourceRanges:
  - 10.0.0.0/8
```

Apply the resource:

```bash
kubectl apply -f ceph-nvmeof-gateway.yaml
```

## Step 3 - Create an NVMe Subsystem and Namespace

Use the `nvmeof-cli` tool in the NVMe-oF gateway pod to create a subsystem:

```bash
kubectl exec -it deploy/nvmeof-gateway -n rook-ceph -- \
  nvmeof-cli subsystem create --subsystem nqn.2026-03.com.ceph:nvme-subsystem-01

kubectl exec -it deploy/nvmeof-gateway -n rook-ceph -- \
  nvmeof-cli namespace add \
  --subsystem nqn.2026-03.com.ceph:nvme-subsystem-01 \
  --rbd-pool replicapool \
  --rbd-image nvme-disk-01 \
  --size 100G
```

## Step 4 - Add a Listener on a Gateway

Create a listener on the NVMe-oF gateway for clients to connect:

```bash
kubectl exec -it deploy/nvmeof-gateway -n rook-ceph -- \
  nvmeof-cli listener add \
  --subsystem nqn.2026-03.com.ceph:nvme-subsystem-01 \
  --gateway-name nvmeof-gateway-0 \
  --traddr 192.168.1.50 \
  --trsvcid 4420 \
  --adrfam ipv4 \
  --trtype tcp
```

## Step 5 - Connect an NVMe/TCP Initiator

On the client (Linux with nvme-cli):

```bash
apt-get install -y nvme-cli

# Discover NVMe subsystems
nvme discover -t tcp -a 192.168.1.50 -s 4420

# Connect to the subsystem
nvme connect -t tcp -n "nqn.2026-03.com.ceph:nvme-subsystem-01" \
  -a 192.168.1.50 -s 4420

# Verify connected namespace
nvme list
```

Sample output:

```text
Node             SN                   Model         Namespace Usage     Format
/dev/nvme0n1     ceph-nvmeof-uuid-01  Ceph NVMe-oF  1         100.00 GB 512  B + 0 B
```

## Step 6 - Verify Gateway Status

Check gateway and subsystem status from Rook:

```bash
kubectl get cephnvmeofgateways -n rook-ceph
kubectl describe cephnvmeofgateway nvmeof-gateway -n rook-ceph
```

## Summary

The Ceph NVMe-oF gateway exposes RBD images as NVMe namespaces over TCP, providing low-latency block access for high-performance workloads. Deploy the gateway using the `CephNVMeOFGateway` CRD in Rook, create subsystems and namespaces via the `nvmeof-cli` tool, and connect initiators using `nvme-cli`. The gateway scales horizontally and supports multiple listeners for redundancy.
