# How to Verify Pod Networking with Calico on Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Verification, Kind

Description: Learn how to verify that Calico pod networking is functioning correctly on a Kind cluster using kubectl and connectivity tests.

---

## Introduction

After installing Calico on Kind, it is essential to verify that pod networking is working as expected. Verification goes beyond checking that Calico pods are running — you need to confirm that pods can communicate with each other, with services, and with external endpoints. A thorough verification process catches misconfiguration early and builds confidence before running real workloads.

Calico manages pod IP address assignment, inter-pod routing, and network policy enforcement. Verifying each of these layers ensures that the full Calico data plane is operational. On Kind, this is especially important because the Docker networking substrate adds an extra layer that must cooperate with Calico's encapsulation.

This guide walks through a systematic verification process using kubectl, calicoctl, and test pods. You will check Calico component health, pod IP allocation, and inter-pod connectivity.

## Prerequisites

- Kind cluster with Calico installed and configured
- kubectl and calicoctl installed
- Basic familiarity with Kubernetes pod and service concepts

## Step 1: Verify Calico Components Are Healthy

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l app=calico-kube-controllers
```

All pods should show `Running` status with ready containers.

## Step 2: Check Node Status

```bash
kubectl get nodes -o wide
```

All nodes should be in `Ready` state. The internal IP addresses listed are what Calico uses for inter-node routing.

## Step 3: Inspect Calico Node Status with calicoctl

```bash
calicoctl node status
```

This command shows BGP peer status and data plane synchronization state. Look for `Established` BGP sessions between nodes.

## Step 4: Deploy Test Pods on Different Nodes

```bash
kubectl run pod-a --image=busybox --restart=Never -- sleep 3600
kubectl run pod-b --image=busybox --restart=Never -- sleep 3600
kubectl get pods -o wide
```

Note the IP addresses assigned to each pod.

## Step 5: Test Pod-to-Pod Connectivity

```bash
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 4 $POD_B_IP
```

Successful pings confirm that Calico is routing traffic between pods correctly.

## Step 6: Test Pod-to-Service Connectivity

```bash
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --name=nginx-svc
kubectl exec pod-a -- wget -qO- http://nginx-svc
```

## Step 7: Verify IP Pool Allocation

```bash
calicoctl get ippool -o wide
calicoctl ipam show --show-blocks
```

This confirms that Calico's IPAM has allocated IP blocks to nodes and is assigning pod IPs from the correct CIDR range.

## Conclusion

You have verified Calico pod networking on Kind by checking component health, node readiness, BGP status, pod IP allocation, and end-to-end connectivity. A clean verification gives you confidence that Calico is fully operational and ready to enforce network policies in your Kind cluster.
