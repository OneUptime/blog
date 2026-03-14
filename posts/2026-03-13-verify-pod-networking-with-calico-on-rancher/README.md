# How to Verify Pod Networking with Calico on Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, Rancher, CNI

Description: Learn how to verify Calico pod networking is working correctly on Rancher-managed Kubernetes clusters.

---

## Introduction

Verifying Calico pod networking on Rancher-managed clusters involves both Rancher-specific tools and standard Kubernetes diagnostics. Rancher's cluster monitoring and UI provide a high-level view of cluster health, while kubectl and calicoctl give you detailed insights into Calico's data plane status.

Rancher clusters often span multiple nodes across different network segments, making cross-node pod connectivity verification particularly important. In multi-cloud or hybrid deployments managed by Rancher, Calico's routing and encapsulation must be verified across all node types and network zones.

This guide provides a comprehensive verification process for Calico on Rancher-managed clusters, covering both UI-based checks and command-line verification.

## Prerequisites

- Rancher-managed cluster with Calico installed
- kubectl configured with the cluster's kubeconfig (downloadable from Rancher UI)
- calicoctl installed

## Step 1: Check Cluster Status in Rancher UI

In the Rancher UI:
1. Navigate to your cluster
2. Check that the cluster shows **Active** state
3. Navigate to **Workloads** > **Pods** > filter by `kube-system`
4. Verify `calico-node` pods are `Running` on all nodes

## Step 2: Verify Calico Pods via kubectl

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
kubectl get pods -n kube-system -l app=calico-kube-controllers
```

All pods should show `Running` with no restarts.

## Step 3: Check Calico Node Status

```bash
calicoctl node status
```

Verify that BGP sessions are `Established` between all nodes in the cluster.

## Step 4: Verify IPAM

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Each node should have an IP block allocated.

## Step 5: Deploy Cross-Node Test Pods

Use node selectors to schedule pods on different nodes:

```bash
NODE1=$(kubectl get nodes -o name | head -1 | cut -d/ -f2)
NODE2=$(kubectl get nodes -o name | sed -n '2p' | cut -d/ -f2)

kubectl run pod-node1 --image=busybox --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE1\"}}" -- sleep 3600

kubectl run pod-node2 --image=busybox --restart=Never \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE2\"}}" -- sleep 3600

kubectl get pods -o wide
```

## Step 6: Test Cross-Node Connectivity

```bash
NODE2_POD_IP=$(kubectl get pod pod-node2 -o jsonpath='{.status.podIP}')
kubectl exec pod-node1 -- ping -c 4 $NODE2_POD_IP
```

## Step 7: Test Service Discovery

```bash
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --name=nginx-svc
kubectl exec pod-node1 -- wget -qO- http://nginx-svc.default.svc.cluster.local
```

## Step 8: Verify External Access

```bash
kubectl exec pod-node1 -- ping -c 4 8.8.8.8
```

## Conclusion

You have verified Calico pod networking on a Rancher-managed cluster through both UI inspection and command-line verification. Cross-node connectivity confirmation is especially important for Rancher's multi-node and multi-zone deployments where Calico's BGP routing or VXLAN encapsulation must correctly route traffic between nodes in different network segments.
