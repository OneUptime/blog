# How to Verify Pod Networking with Calico on OpenShift Hosted Control Planes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Verification

Description: A guide to verifying Calico pod networking on OpenShift Hosted Control Plane worker nodes, including multi-cluster isolation checks.

---

## Introduction

Verifying pod networking on OpenShift Hosted Control Planes adds a multi-tenancy dimension that does not exist in single-cluster deployments. You need to verify not just that pods within the hosted cluster can communicate, but also that they cannot inadvertently communicate with pods in sibling hosted clusters sharing the same management infrastructure. The CIDR isolation between hosted clusters is the first line of multi-tenant defense.

Additionally, the hosted cluster's API server runs as pods in the management cluster rather than on dedicated nodes. Pod-to-API-server connectivity crosses a cluster boundary and must be verified separately from intra-cluster pod connectivity.

This guide covers the verification workflow for Calico on OpenShift Hosted Control Planes.

## Prerequisites

- Calico running on an OpenShift Hosted Control Plane cluster
- `kubectl` configured with the hosted cluster kubeconfig
- `calicoctl` installed

## Step 1: Verify Calico Components on Worker Nodes

```bash
export KUBECONFIG=hosted-kubeconfig.yaml
kubectl get pods -n calico-system
kubectl get tigerastatus
```

## Step 2: Verify Pod IP Assignment

```bash
kubectl run test-pod --image=busybox -- sleep 300
kubectl get pod test-pod -o wide
```

The IP must fall within the hosted cluster's configured pod CIDR and must not overlap with other hosted clusters.

```bash
calicoctl ipam show --show-blocks
```

## Step 3: Test Intra-Cluster Pod Communication

```bash
kubectl run server --image=nginx -n default
kubectl expose pod server --port=80 -n default
kubectl run client --image=busybox -- sleep 300

SERVER_IP=$(kubectl get pod server -o jsonpath='{.status.podIP}')
kubectl exec client -- wget -qO- --timeout=5 http://$SERVER_IP
```

## Step 4: Test Kubernetes API Server Connectivity

The API server runs in the management cluster. Verify pods can reach it.

```bash
kubectl exec client -- wget -qO- --timeout=5 https://kubernetes.default.svc.cluster.local/healthz \
  --no-check-certificate
```

## Step 5: Verify Cross-Cluster Isolation

If you know an IP from another hosted cluster, verify it is not reachable.

```bash
kubectl exec client -- ping -c3 <other-hosted-cluster-pod-ip> || echo "Cross-cluster isolation working"
```

## Step 6: Test DNS Resolution

```bash
kubectl exec client -- nslookup server.default.svc.cluster.local
kubectl exec client -- nslookup kubernetes.default.svc.cluster.local
```

## Conclusion

Verifying Calico on OpenShift Hosted Control Planes requires confirming intra-cluster pod connectivity, cross-cluster isolation, API server reachability from worker pods, and DNS resolution. The cross-cluster isolation check is unique to HCP environments and ensures the multi-tenant architecture's network boundaries are correctly enforced by Calico.
