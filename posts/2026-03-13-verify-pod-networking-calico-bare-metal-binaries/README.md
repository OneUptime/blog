# How to Verify Pod Networking with Calico on Bare Metal with Binaries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Verification

Description: A guide to verifying that Calico's binary installation provides correct pod networking on bare metal Kubernetes nodes.

---

## Introduction

Verifying pod networking in a binary-installed Calico environment adds OS-level checks that are not needed in operator-based deployments. Because Felix can run as a native systemd service while Kubernetes uses the Calico CNI plugin binaries on each node, you can inspect its state directly through the process tree, its log output via journalctl, and its effect on the Linux networking stack without going through Kubernetes API layers.

The verification workflow covers the calico-felix service status, CNI plugin execution, IP allocation, pod-to-pod connectivity, and egress routing. Each check confirms a distinct layer of the networking stack is working correctly.

This guide provides a complete verification workflow for binary-installed Calico on bare metal.

## Prerequisites

- Calico CNI plugin binaries installed on all nodes and Felix running as a systemd service
- `kubectl` and `calicoctl` installed
- At least two worker nodes

## Step 1: Verify calico-felix Service Health

On each node:

```bash
sudo systemctl status calico-felix
sudo journalctl -u calico-felix --since "10 minutes ago" | grep -E "(ERROR|WARN|started|Felix|felix)"
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
ip route show | grep -E "proto bird|proto 80|tunl0|vxlan.calico"
```

Routes marked `proto bird` are learned via BGP, while some Calico-installed routes may appear with a numeric route protocol such as `proto 80`. If you are using IPIP or VXLAN, look for `tunl0` or `vxlan.calico` routes instead.

## Step 6: Check Felix Dataplane Rules

Verify that Felix has programmed iptables rules when using the iptables dataplane.

```bash
sudo iptables-save | grep -c "cali-"
```

A healthy Felix installation using the iptables dataplane will have multiple `cali-` chains in iptables.

## Step 7: Test Egress

```bash
kubectl exec pod-a -- wget -qO- -T 5 http://example.com
```

## Conclusion

Verifying binary-installed Calico on bare metal requires checking the calico-felix systemd service, confirming CNI plugins are present, validating IPAM block allocation, testing cross-node connectivity, and inspecting the node routing table for Calico routes. The OS-level checks - service status, routing table, iptables rules when using the iptables dataplane - are the distinguishing aspect of binary installation verification compared to container-based deployments.
