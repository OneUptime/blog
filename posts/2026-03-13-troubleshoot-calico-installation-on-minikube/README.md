# How to Troubleshoot Installation Issues with Calico on Minikube

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, Minikube, CNI

Description: A practical guide to diagnosing and fixing common Calico installation problems on Minikube clusters.

---

## Introduction

Calico installation on Minikube can encounter issues caused by Minikube driver differences, IP conflicts, and encapsulation incompatibilities. Common symptoms include Calico pods stuck in `Init` or `CrashLoopBackOff` state, nodes remaining `NotReady`, or pods failing to receive IP addresses from Calico's IPAM.

The Minikube environment varies significantly depending on the driver used (Docker, VirtualBox, KVM, Hyperkit). Each driver presents a different networking substrate that can interact with Calico's encapsulation and routing in unexpected ways. Understanding the driver-specific behavior is key to effective troubleshooting.

This guide covers the most common Calico issues on Minikube organized by symptom, with diagnostic commands and remediation steps for each.

## Prerequisites

- Minikube cluster with a Calico installation issue
- kubectl and calicoctl installed
- Access to the Minikube VM or container

## Step 1: Identify the Symptom

Start by running:

```bash
kubectl get pods -n kube-system
kubectl get nodes
kubectl describe node minikube
```

Note whether nodes are `NotReady`, pods are `Pending`, or pods are `CrashLoopBackOff`.

## Step 2: Check Calico Pod Logs

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=100
kubectl logs -n kube-system -l k8s-app=calico-node -c install-cni --tail=50
```

Look for errors containing `Failed`, `permission denied`, or `BIRD`.

## Step 3: Fix IP Conflict Issues

Check the active Calico IP pools:

```bash
calicoctl get ippool -o wide
```

If the active pool conflicts with your host network, recreate the Minikube cluster with a non-overlapping pod CIDR and install Calico with an IP pool that matches that CIDR. Calico's `CALICO_IPV4POOL_CIDR` setting only controls the default pool that is created at install time; changing it on an already-running `calico-node` DaemonSet does not change an existing IPPool.

## Step 4: Fix Minikube Driver Encapsulation Issues

If IPIP traffic is blocked in your environment, switch the active Calico IPPool to VXLAN:

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"Never","vxlanMode":"Always"}}'
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 5: Resolve CrashLoopBackOff in calico-node

If calico-node keeps crashing, check for mount issues:

```bash
kubectl describe pod -n kube-system -l k8s-app=calico-node | grep -A5 "Events:"
```

A common fix is ensuring the Minikube node has the required kernel modules:

```bash
minikube ssh -- sudo modprobe ipip
minikube ssh -- sudo modprobe vxlan
```

## Step 6: Clear Stale CNI Configuration

If you previously installed another CNI, stale config may interfere:

```bash
minikube ssh -- sudo rm -f /etc/cni/net.d/*.conf
minikube ssh -- sudo rm -f /etc/cni/net.d/*.conflist
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 7: Restart Minikube with Clean State

As a last resort:

```bash
minikube stop
minikube delete
minikube start --cni=calico
```

## Conclusion

Troubleshooting Calico on Minikube involves checking pod logs, addressing CIDR conflicts, resolving encapsulation incompatibilities with the Minikube driver, and clearing stale CNI configuration. Following these steps systematically resolves the majority of installation issues encountered on Minikube.
