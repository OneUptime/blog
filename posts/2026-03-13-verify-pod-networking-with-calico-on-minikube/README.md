# How to Verify Pod Networking with Calico on Minikube

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, Minikube, CNI

Description: Learn how to verify that Calico pod networking is working correctly on a Minikube cluster through health checks and connectivity tests.

---

## Introduction

Verifying Calico pod networking on Minikube ensures that all components are healthy and that pods can communicate as expected before you start deploying real workloads. Since Minikube is a single-node cluster, verification focuses on pod-to-pod connectivity within the same node, pod-to-service communication, and external egress.

A thorough verification catches issues such as incorrect IP pool CIDR, misconfigured encapsulation, or container runtime conflicts early. On Minikube, where the networking stack includes the host OS network, the VM or container driver, and Calico's overlay, there are several points where misconfiguration can occur.

This guide provides a systematic checklist for verifying Calico on Minikube, covering component health, IP allocation, and end-to-end connectivity tests.

## Prerequisites

- Minikube cluster with Calico installed
- kubectl and calicoctl installed
- SSH access to the Minikube node (optional, for deep inspection)

## Step 1: Check Calico Pod Health

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l app=calico-kube-controllers
```

All pods must be in `Running` state with all containers ready (e.g., `1/1` or `2/2`).

## Step 2: Inspect Calico Node Status

```bash
calicoctl node status
```

Look for the data plane status showing healthy Felix and BIRD (if BGP is enabled).

## Step 3: Check IP Pool Allocation

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

This confirms Calico's IPAM has allocated IP blocks and is assigning addresses from the correct range.

## Step 4: Deploy Two Test Pods

```bash
kubectl run pod1 --image=busybox --restart=Never -- sleep 3600
kubectl run pod2 --image=busybox --restart=Never -- sleep 3600
kubectl get pods -o wide
```

Verify both pods have IPs from the Calico IP pool CIDR.

## Step 5: Test Pod-to-Pod Connectivity

```bash
POD2_IP=$(kubectl get pod pod2 -o jsonpath='{.status.podIP}')
kubectl exec pod1 -- ping -c 4 $POD2_IP
```

Four successful pings confirm intra-cluster pod networking is operational.

## Step 6: Test External Connectivity

```bash
kubectl exec pod1 -- ping -c 4 8.8.8.8
kubectl exec pod1 -- wget -qO- https://httpbin.org/ip
```

## Step 7: Test Service Discovery

```bash
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --name=nginx-svc
kubectl exec pod1 -- wget -qO- http://nginx-svc.default.svc.cluster.local
```

## Step 8: Check Calico Felix Logs

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node | grep -i error
```

No critical errors should appear in the Felix logs.

## Conclusion

You have verified Calico pod networking on Minikube by checking component health, IP allocation, intra-cluster connectivity, external egress, and service discovery. A clean verification result confirms that Calico is fully operational on your Minikube cluster.
