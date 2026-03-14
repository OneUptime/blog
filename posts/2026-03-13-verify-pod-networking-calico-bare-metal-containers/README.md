# How to Verify Pod Networking with Calico on Bare Metal with Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Verification

Description: A systematic verification guide for confirming Calico pod networking is fully operational on a bare metal Kubernetes cluster running containers.

---

## Introduction

Verifying pod networking on a bare metal Calico cluster is more involved than on cloud-managed clusters because the underlying routing depends on BGP sessions with physical switches rather than a cloud provider's managed network. A verification process that only checks pod-to-pod pings is insufficient — you need to confirm BGP route advertisement, validate that the routing table on each node contains correct pod subnet routes, and test egress from pods to external destinations.

Container-based workloads on bare metal can achieve very high throughput, and a misconfigured MTU or missing route can create hard-to-diagnose performance cliffs. Catching these issues during verification prevents them from surfacing under production load.

This guide provides a thorough verification workflow for Calico pod networking on bare metal with containers.

## Prerequisites

- Calico running on a bare metal Kubernetes cluster with containers
- At least two worker nodes
- `kubectl` and `calicoctl` installed
- SSH access to nodes

## Step 1: Check All Calico Pods Are Running

```bash
kubectl get pods -n calico-system
kubectl get tigerastatus
```

All TigeraStatus conditions should show `Available: True`.

## Step 2: Verify IP Pool Assignment

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Each node should have at least one IPAM block allocated.

## Step 3: Deploy Test Pods Across Nodes

```bash
kubectl run pod-node1 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<worker-node-1>"}}' -- sleep 3600

kubectl run pod-node2 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<worker-node-2>"}}' -- sleep 3600
```

## Step 4: Test Intra-Node Communication

```bash
POD2_IP=$(kubectl get pod pod-node2 -o jsonpath='{.status.podIP}')
kubectl exec pod-node1 -- ping -c5 $POD2_IP
```

## Step 5: Check BGP Routes on Nodes

SSH into a worker node and inspect the routing table.

```bash
ip route show | grep -E "^10\."
```

You should see routes for remote node pod subnets learned via BGP. If BGP is configured with physical switches, those routes will show the switch gateway as the next hop.

```bash
calicoctl node status
```

All BGP sessions should show `Established`.

## Step 6: Measure Throughput

Use iperf3 to measure actual throughput between pods on different nodes.

```bash
kubectl exec pod-node2 -- iperf3 -s &
kubectl exec pod-node1 -- iperf3 -c $POD2_IP -t 10
```

On bare metal with native BGP routing and a 10GbE NIC, you should see throughput in the range of 5-9 Gbps. Lower values may indicate MTU misconfiguration or CPU bottlenecks.

## Step 7: Test Egress

```bash
kubectl exec pod-node1 -- curl -s --max-time 5 https://example.com | head -5
```

## Conclusion

Verifying Calico pod networking on bare metal with containers requires checking BGP session state, confirming routing table entries on each node, testing cross-node connectivity, measuring throughput, and validating egress. The BGP and routing table checks are unique to bare metal environments and are the most common source of unexpected networking failures.
