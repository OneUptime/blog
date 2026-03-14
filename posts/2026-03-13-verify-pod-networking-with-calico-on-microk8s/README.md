# How to Verify Pod Networking with Calico on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, MicroK8s, CNI

Description: Learn how to verify Calico pod networking is fully operational on a MicroK8s cluster using health checks and connectivity tests.

---

## Introduction

Verifying Calico pod networking on MicroK8s ensures that all networking components are operational before deploying workloads. MicroK8s provides both its own status tools and standard kubectl access, which together give you multiple ways to inspect the networking layer.

On MicroK8s, Calico runs similarly to other Kubernetes distributions but with some unique aspects. The Calico add-on configures networking based on MicroK8s's internal settings, and the verification process should cover component health, IP allocation from MicroK8s's pod CIDR, and end-to-end connectivity tests.

This guide provides a comprehensive verification checklist for Calico on MicroK8s, using both MicroK8s-native commands and standard Kubernetes tools.

## Prerequisites

- MicroK8s with Calico enabled
- calicoctl installed and configured
- kubectl access (via microk8s kubectl or alias)

## Step 1: Check MicroK8s Overall Status

```bash
microk8s status
```

Look for `calico: enabled` in the add-ons list and `microk8s is running` status.

## Step 2: Verify Calico Pods Are Running

```bash
microk8s kubectl get pods -n kube-system -l k8s-app=calico-node
microk8s kubectl get pods -n kube-system -l app=calico-kube-controllers
```

## Step 3: Check Calico Node Status

```bash
calicoctl node status
```

On a single-node MicroK8s cluster, there are no BGP peers to check, but Felix should show as running.

## Step 4: Verify IP Pool

```bash
calicoctl get ippool -o wide
calicoctl ipam show
```

## Step 5: Deploy Test Pods

```bash
microk8s kubectl run pod-alpha --image=busybox --restart=Never -- sleep 3600
microk8s kubectl run pod-beta --image=nginx --port=80
microk8s kubectl get pods -o wide
```

Confirm both pods have IPs within the Calico IP pool CIDR.

## Step 6: Test Pod-to-Pod Connectivity

```bash
BETA_IP=$(microk8s kubectl get pod pod-beta -o jsonpath='{.status.podIP}')
microk8s kubectl exec pod-alpha -- ping -c 4 $BETA_IP
```

## Step 7: Test Pod-to-Service DNS

```bash
microk8s kubectl expose pod pod-beta --port=80 --name=beta-svc
microk8s kubectl exec pod-alpha -- wget -qO- http://beta-svc.default.svc.cluster.local
```

## Step 8: Verify External Egress

```bash
microk8s kubectl exec pod-alpha -- ping -c 2 8.8.8.8
```

## Step 9: Inspect Felix Logs for Errors

```bash
microk8s kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node | grep -i error | tail -10
```

## Conclusion

You have thoroughly verified Calico pod networking on MicroK8s, confirming component health, IP allocation, pod-to-pod connectivity, service DNS resolution, and external egress. A successful verification gives confidence that Calico is fully operational in your MicroK8s environment.
