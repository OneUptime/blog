# How to Verify Pod Networking with Calico on Single-Node Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, Single-Node, CNI

Description: Learn how to verify Calico pod networking is fully operational on a single-node Kubernetes cluster.

---

## Introduction

Verifying Calico pod networking on a single-node Kubernetes cluster covers component health, IP allocation, and connectivity. While the single-node setup eliminates cross-node routing concerns, you still need to verify that Calico's IPAM assigns pod IPs correctly, that DNS service discovery works, and that network policies can be enforced.

On a single-node cluster, all pods run on the same node. This means inter-pod communication happens at the local network level without the IPIP or VXLAN encapsulation that would be needed for cross-node traffic. This simplifies the verification but also means some Calico features like BGP peer health are not applicable.

This guide provides a targeted verification checklist for Calico on single-node Kubernetes, focusing on the features most relevant to this deployment type.

## Prerequisites

- Single-node Kubernetes with Calico installed
- kubectl and calicoctl configured
- Access to the cluster node for kernel-level inspection

## Step 1: Verify Calico Pods Are Running

```bash
kubectl get pods -n kube-system | grep calico
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l app=calico-kube-controllers
```

All should show `Running` with all containers in `Ready` state.

## Step 2: Check Calico Node Status

```bash
calicoctl node status
```

Felix should report as running. Bird may not show BGP peers (expected for single-node).

## Step 3: Verify IPAM

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Confirm the node has an IP block allocated from the configured CIDR.

## Step 4: Deploy Test Pods

```bash
kubectl run pod-1 --image=busybox --restart=Never -- sleep 3600
kubectl run pod-2 --image=nginx --port=80
kubectl get pods -o wide
```

Both pods should have IPs from the `192.168.0.0/16` range (or your configured CIDR).

## Step 5: Test Pod-to-Pod Connectivity

```bash
POD2_IP=$(kubectl get pod pod-2 -o jsonpath='{.status.podIP}')
kubectl exec pod-1 -- ping -c 4 $POD2_IP
```

## Step 6: Test Service Discovery

```bash
kubectl expose pod pod-2 --port=80 --name=pod2-svc
kubectl exec pod-1 -- wget -qO- http://pod2-svc.default.svc.cluster.local
```

## Step 7: Test External Egress

```bash
kubectl exec pod-1 -- ping -c 4 8.8.8.8
kubectl exec pod-1 -- wget -qO- https://httpbin.org/ip
```

## Step 8: Inspect iptables Rules

On the node, verify Calico's iptables chains are present:

```bash
sudo iptables -L | grep cali | head -10
sudo iptables -t nat -L | grep cali | head -10
```

## Conclusion

You have verified Calico pod networking on a single-node Kubernetes cluster through component health checks, IPAM inspection, pod connectivity tests, and iptables rule verification. All Calico features relevant to a single-node setup are confirmed working.
