# How to Verify Pod Networking with Calico on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, K3s, CNI

Description: Learn how to verify that Calico pod networking is working correctly on a K3s cluster through systematic health and connectivity checks.

---

## Introduction

Verifying Calico pod networking on K3s is important because K3s's lightweight architecture introduces specific behaviors that differ from standard Kubernetes. K3s uses its own container runtime (containerd) and a simplified control plane, which means CNI initialization and pod networking follow slightly different code paths than full Kubernetes distributions.

The verification process on K3s covers Calico component health, pod IP assignment from the correct CIDR, inter-pod connectivity, service DNS resolution, and external egress. On multi-node K3s clusters, cross-node pod communication is particularly important to verify since it requires Calico's IPIP or VXLAN encapsulation to work correctly with K3s's network configuration.

This guide provides a step-by-step verification process tailored for K3s with Calico.

## Prerequisites

- K3s cluster with Calico installed
- kubectl configured (`~/.kube/config`)
- calicoctl installed

## Step 1: Verify K3s Node Status

```bash
kubectl get nodes -o wide
kubectl describe node $(kubectl get nodes -o name | head -1)
```

All nodes should be `Ready` and the `Container Runtime` should be `containerd`.

## Step 2: Verify Calico Pods

```bash
kubectl get pods -n kube-system | grep calico
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=20
```

## Step 3: Run calicoctl Node Status Check

```bash
calicoctl node status
```

Verify that Felix is running and, for multi-node K3s, that BGP sessions are established.

## Step 4: Check IPAM Allocation

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Confirm that IP blocks are allocated per K3s node and within the expected CIDR.

## Step 5: Deploy Test Pods

```bash
kubectl run verify-a --image=busybox --restart=Never -- sleep 3600
kubectl run verify-b --image=busybox --restart=Never -- sleep 3600
kubectl get pods -o wide
```

## Step 6: Test Intra-Cluster Pod Connectivity

```bash
POD_B_IP=$(kubectl get pod verify-b -o jsonpath='{.status.podIP}')
kubectl exec verify-a -- ping -c 4 $POD_B_IP
```

## Step 7: Test Service Discovery

```bash
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --name=nginx-svc
kubectl exec verify-a -- wget -qO- http://nginx-svc.default.svc.cluster.local
```

## Step 8: Test External Connectivity

```bash
kubectl exec verify-a -- ping -c 4 1.1.1.1
```

## Step 9: Verify K3s-Specific CNI Path

Confirm Calico CNI config is present in K3s's CNI directory:

```bash
ls /var/lib/rancher/k3s/agent/etc/cni/net.d/
cat /var/lib/rancher/k3s/agent/etc/cni/net.d/10-calico.conflist
```

## Conclusion

You have verified Calico pod networking on K3s by checking component health, IPAM allocation, pod-to-pod connectivity, service DNS, and external egress. A successful verification confirms that Calico is fully integrated with K3s's container runtime and networking stack.
