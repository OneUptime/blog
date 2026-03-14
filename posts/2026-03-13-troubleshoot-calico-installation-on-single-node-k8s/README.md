# How to Troubleshoot Installation Issues with Calico on Single-Node Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, Single-Node, CNI

Description: Diagnose and resolve common Calico installation issues on single-node Kubernetes clusters bootstrapped with kubeadm.

---

## Introduction

Single-node Kubernetes clusters bootstrapped with kubeadm can encounter Calico installation issues related to the kubeadm network configuration, control plane taint, and network interface detection. Since all components run on one machine, problems that would be distributed across nodes in a multi-node cluster are concentrated and easier to diagnose.

Common issues on single-node clusters include the node remaining `NotReady` after applying the Calico manifest, CoreDNS pods staying `Pending`, and Calico detecting the wrong network interface for IP assignment. The control plane taint is a particularly common oversight that causes workload pods (including Calico) to remain unscheduled.

This guide provides targeted troubleshooting steps for Calico on single-node Kubernetes, organized by the most common failure modes.

## Prerequisites

- Single-node Kubernetes with a Calico installation issue
- kubectl and calicoctl configured
- root or sudo access on the node

## Step 1: Check Node and Pod Status

```bash
kubectl get nodes
kubectl get pods -n kube-system
kubectl describe node $(kubectl get nodes -o name)
```

Look at the `Conditions` and `Taints` sections in the node description.

## Step 2: Remove Control Plane Taint if Present

If the node shows a `control-plane` taint, Calico pods cannot be scheduled:

```bash
kubectl describe node | grep Taints
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
kubectl taint nodes --all node-role.kubernetes.io/master-
```

## Step 3: Check Calico Pod Logs

```bash
kubectl describe pod -n kube-system -l k8s-app=calico-node
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=100
kubectl logs -n kube-system -l k8s-app=calico-node -c install-cni --tail=30
```

## Step 4: Fix Interface Auto-Detection

If Calico picks the wrong network interface for IP assignment:

```bash
ip route
```

Find the interface with the default route. Then configure Calico to use it:

```bash
kubectl set env daemonset/calico-node -n kube-system \
  IP_AUTODETECTION_METHOD=interface=eth0
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 5: Resolve CIDR Mismatch

Verify that the kubeadm pod CIDR matches Calico's IP pool:

```bash
kubectl cluster-info dump | grep -i pod-cidr
calicoctl get ippool -o yaml | grep cidr
```

If mismatched, update the IP pool:

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"cidr":"192.168.0.0/16"}}'
```

## Step 6: Check for Swap or Kernel Issues

```bash
swapon --show
sudo dmesg | grep -i calico
sudo dmesg | grep -i ipip
```

Swap must be disabled. Load required kernel modules:

```bash
sudo modprobe ipip
sudo modprobe vxlan
```

## Step 7: Check SELinux or AppArmor

On systems with SELinux:

```bash
sudo getenforce
sudo ausearch -c calico-node --raw | tail -20
```

If blocking Calico, set SELinux to permissive temporarily to test:

```bash
sudo setenforce 0
```

## Conclusion

Troubleshooting Calico on a single-node Kubernetes cluster involves checking the control plane taint, examining pod logs, fixing interface auto-detection, resolving CIDR mismatches, and verifying kernel prerequisites. The single-node topology makes it straightforward to isolate and fix issues without cross-node complexity.
