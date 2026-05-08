# How to Verify Pod Networking with Calico on Bare Metal with Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Container, Verification

Description: A systematic verification guide for confirming Calico pod networking is fully operational on a bare metal Kubernetes cluster running containers.

---

## Introduction

Verifying pod networking on a bare metal Calico cluster is more involved than on cloud-managed clusters because the underlying routing may depend on Calico BGP peering between nodes, route reflectors, or physical top-of-rack switches rather than a cloud provider's managed network. A verification process that only checks pod-to-pod pings is insufficient - you need to confirm BGP route advertisement when BGP is in use, validate that the routing table on each node contains correct pod subnet routes, and test egress from pods to external destinations.

Container-based workloads on bare metal can achieve very high throughput, and a misconfigured MTU or missing route can create hard-to-diagnose performance cliffs. Catching these issues during verification prevents them from surfacing under production load.

This guide provides a thorough verification workflow for Calico pod networking on bare metal with containers.

## Prerequisites

- Calico running on a bare metal Kubernetes cluster with containers
- At least two worker nodes
- `kubectl` and `calicoctl` installed
- SSH access to nodes
- Calico installed with BGP networking enabled

## Step 1: Check All Calico Pods Are Running

```bash
kubectl get pods -n calico-system
kubectl get tigerastatus
```

For manifest-based installs, use `kube-system` instead of `calico-system`. `TigeraStatus` is available on operator-managed installs, and all TigeraStatus conditions should show `Available: True`.

## Step 2: Verify IP Pool Assignment

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Each node should have at least one IPAM block allocated.

## Step 3: Deploy Test Pods Across Nodes

```bash
kubectl run pod-node1 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<worker-node-1>"}}' --command -- sleep 3600

kubectl run pod-node2 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<worker-node-2>"}}' --command -- sleep 3600
```

## Step 4: Test Cross-Node Communication

```bash
POD2_IP=$(kubectl get pod pod-node2 -o jsonpath='{.status.podIP}')
kubectl exec pod-node1 -- ping -c5 $POD2_IP
```

## Step 5: Check BGP Routes on Nodes

SSH into a worker node and inspect the routing table.

```bash
ip route show | grep bird
```

You should see routes for remote node pod subnets learned by Calico's BGP process. The next hop depends on your BGP topology: node-to-node mesh typically uses the remote node IP, while peering through route reflectors or top-of-rack switches may show the next hop learned from that design.

```bash
calicoctl node status
```

All BGP sessions should show `Established`.

## Step 6: Measure Throughput

Use iperf3 to measure actual throughput between pods on different nodes.

```bash
kubectl exec pod-node2 -- iperf3 -s -1 &
kubectl exec pod-node1 -- iperf3 -c $POD2_IP -t 10
```

On bare metal with native routing and a 10GbE NIC, multi-gigabit throughput is typical when the hosts, NICs, MTU, and CPU capacity are configured correctly. Lower values may indicate MTU misconfiguration, CPU bottlenecks, policy overhead, or NIC offload issues.

## Step 7: Test Egress

```bash
kubectl exec pod-node1 -- curl -s --max-time 5 https://example.com | head -5
```

## Conclusion

Verifying Calico pod networking on bare metal with containers requires checking BGP session state when BGP is enabled, confirming routing table entries on each node, testing cross-node connectivity, measuring throughput, and validating egress. The BGP and routing table checks are especially important in bare metal environments and are a common source of unexpected networking failures.
