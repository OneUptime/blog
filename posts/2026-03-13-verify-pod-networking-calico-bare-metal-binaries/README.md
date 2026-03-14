# How to Verify Pod Networking with Calico on Bare Metal with Binaries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Verification

Description: A guide to verifying that Calico's binary installation provides correct pod networking on bare metal Kubernetes nodes.

---

## Introduction

Verifying pod networking in a binary-installed Calico environment adds OS-level checks that are not needed in operator-based deployments. Because Calico runs as a native systemd service rather than a container, you can inspect its state directly through the process tree, its log output via journalctl, and its effect on the Linux networking stack without going through Kubernetes API layers.

The verification workflow covers the calico-node service status, CNI plugin execution, IP allocation, pod-to-pod connectivity, and egress routing. Each check confirms a distinct layer of the networking stack is working correctly.

This guide provides a complete verification workflow for binary-installed Calico on bare metal.

## Prerequisites

- Calico binary installation running on all nodes as a systemd service
- `kubectl` and `calicoctl` installed
- At least two worker nodes

## Step 1: Verify calico-node Service Health

On each node:

```bash
sudo systemctl status calico-node
journalctl -u calico-node --since "10 minutes ago" | grep -E "(ERROR|WARN|started|felix)"
```

## Step 2: Verify CNI Plugin Presence

```bash
ls -la /opt/cni/bin/calico /opt/cni/bin/calico-ipam
cat /etc/cni/net.d/10-calico.conflist
```

## Step 3: Verify IP Allocation

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Each node should have IPAM blocks allocated. Deploy a test pod to trigger IP allocation.

```bash
kubectl run verify-pod --image=busybox -- sleep 300
kubectl get pod verify-pod -o wide
```

The pod IP should fall within the configured pool CIDR.

## Step 4: Test Cross-Node Connectivity

Deploy pods on different nodes and test connectivity.

```bash
kubectl run pod-a --image=busybox --overrides='{"spec":{"nodeName":"<node1>"}}' -- sleep 300
kubectl run pod-b --image=busybox --overrides='{"spec":{"nodeName":"<node2>"}}' -- sleep 300

POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c5 $POD_B_IP
```

## Step 5: Inspect the Routing Table

On a node, verify that routes to remote pod subnets are present.

```bash
ip route show | grep "proto bird"
```

Routes marked `proto bird` are learned via BGP. If you are using IPIP, look for `tunl0` routes instead.

## Step 6: Check Felix Dataplane Rules

Verify that Felix has programmed iptables rules.

```bash
iptables-save | grep -c "cali-"
```

A healthy Felix installation will have dozens of `cali-` chains in iptables.

## Step 7: Test Egress

```bash
kubectl exec pod-a -- wget -qO- --timeout=5 http://example.com
```

## Conclusion

Verifying binary-installed Calico on bare metal requires checking the calico-node systemd service, confirming CNI plugins are present, validating IPAM block allocation, testing cross-node connectivity, and inspecting the node routing table for BGP-learned routes. The OS-level checks — service status, routing table, iptables rules — are the distinguishing aspect of binary installation verification compared to container-based deployments.
