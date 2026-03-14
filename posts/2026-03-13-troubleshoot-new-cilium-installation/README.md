# Troubleshooting a New Cilium Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Installation, Troubleshooting, eBPF, Networking

Description: A comprehensive troubleshooting guide for issues that arise during a fresh Cilium installation, from DaemonSet failures to network connectivity problems.

---

## Introduction

A new Cilium installation can encounter various issues that prevent it from functioning correctly. The most common problems fall into several categories: Cilium pods failing to start (due to kernel incompatibility or BPF filesystem issues), network connectivity not working after installation (MTU mismatches, IPAM configuration problems), pods not getting IP addresses, and conflicts with existing CNI configurations. This guide provides a systematic approach to diagnosing each category.

The key principle for troubleshooting a new installation is to start from the bottom up: verify the nodes can support Cilium (kernel version, BPF mount), then verify the Cilium DaemonSet is running correctly, then verify individual pods are getting IPs and endpoints are being created, then verify network connectivity.

## Prerequisites

- Kubernetes cluster with Cilium recently installed
- `kubectl` access with cluster-admin permissions
- Cilium CLI installed

## Step 1: Check Cilium Pod Status

```bash
# Check if Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Check operator
kubectl get pods -n kube-system -l name=cilium-operator

# Describe any failing pod
kubectl describe pod -n kube-system cilium-xxxxx | tail -30

# Check logs from a failing pod
kubectl logs -n kube-system cilium-xxxxx
kubectl logs -n kube-system cilium-xxxxx --previous 2>/dev/null
```

## Step 2: Diagnose Agent Startup Failures

```bash
# Common error: kernel too old
kubectl logs -n kube-system cilium-xxxxx | grep -i "kernel"

# Check kernel version on node
kubectl debug node/my-node -it --image=ubuntu -- uname -r

# Common error: BPF filesystem not mounted
kubectl logs -n kube-system cilium-xxxxx | grep -i "bpf"

# Verify BPF mount
kubectl exec -n kube-system cilium-xxxxx -- mount | grep bpf
```

## Step 3: Check IPAM and Pod IP Assignment

```bash
# Verify pods are getting IPs
kubectl get pods --all-namespaces -o wide | grep "<none>"

# Check IPAM allocation
kubectl exec -n kube-system ds/cilium -- cilium ip list

# Check CiliumNode resources
kubectl get CiliumNode

# Check for IPAM errors in operator
kubectl logs -n kube-system deploy/cilium-operator | grep -i "ipam\|cidr"
```

## Step 4: Connectivity Issues

```bash
# Run connectivity test
cilium connectivity test

# Check if kube-proxy replacement is configured correctly
kubectl exec -n kube-system ds/cilium -- cilium status | grep -i "kube-proxy"

# Test pod-to-service connectivity
kubectl run test-pod --image=busybox --restart=Never -it --rm -- \
  wget -qO- http://kubernetes.default.svc.cluster.local

# Check MTU
kubectl exec -n kube-system ds/cilium -- cilium status | grep -i mtu
ip link show | grep mtu
```

## Step 5: CNI Configuration Issues

```bash
# Check CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/05-cilium.conflist

# Check for conflicting CNI configurations
ls -la /etc/cni/net.d/

# If multiple CNI configs exist, ensure Cilium's is selected
# CNI configs are selected by alphabetical order - lower numbers win
```

## Step 6: Collect Diagnostics and Get Help

```bash
# Generate comprehensive sysdump
cilium sysdump --output-filename new-install-debug

# Check Cilium version compatibility with Kubernetes
cilium version
kubectl version --short

# Review installation parameters
helm get values cilium -n kube-system 2>/dev/null || \
  kubectl get configmap -n kube-system cilium-config -o yaml
```

## Common New Installation Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| CrashLoopBackOff | Old kernel / no BPF | Upgrade kernel |
| Pods stuck Pending | IPAM not configured | Check CiliumNode |
| No inter-pod connectivity | MTU mismatch | Set correct MTU |
| DNS failures | CoreDNS unreachable | Check DNS policy |
| Policy not enforced | Operator not running | Restart operator |

## Conclusion

Troubleshooting a new Cilium installation is a systematic process of checking each layer: node prerequisites, DaemonSet health, IPAM, connectivity, and CNI configuration. The `cilium status` command is your primary health indicator, while `cilium connectivity test` validates end-to-end functionality. For stubborn issues, `cilium sysdump` captures everything needed for community support.
