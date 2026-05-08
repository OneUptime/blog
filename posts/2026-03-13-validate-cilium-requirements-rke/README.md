# Validate Cilium Requirements on RKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, RKE, Rancher, eBPF

Description: Learn how to validate that your Rancher Kubernetes Engine (RKE or RKE2) cluster meets all requirements for running Cilium, covering RKE-specific configuration and system prerequisites.

---

## Introduction

Rancher Kubernetes Engine (RKE and its successor RKE2) is Rancher Labs' production-grade Kubernetes distribution. RKE2 in particular is gaining wide adoption as a hardened, FIPS-compliant Kubernetes distribution. RKE2 supports Cilium as a bundled CNI option, while RKE1 clusters should be created with `network.plugin: none` before installing Cilium separately. Each path has specific configuration requirements and validation steps.

RKE2 is particularly interesting for Cilium because it is designed with security hardening in mind and ships Cilium as a managed Helm chart. Understanding the RKE/RKE2-specific requirements and validating them prevents common installation failures.

## Prerequisites

- RKE2 (or RKE1) cluster installed
- `kubectl` configured with cluster access
- SSH access to cluster nodes
- `cilium` CLI installed

## Step 1: Validate RKE2 Version and Configuration

```bash
# Check RKE2 version (on a cluster node)

# rke2 --version

# Verify Kubernetes version via kubectl
kubectl version

# Check RKE2 configuration file for CNI settings
# Location: /etc/rancher/rke2/config.yaml on server nodes
# The cni field should specify cilium
# Example:
# cni: cilium

# For RKE1, check cluster.yml/config.yaml and confirm the network plugin
# was set to none before installing Cilium:
# network:
#   plugin: none
```

## Step 2: Verify Node OS and Kernel Version

```bash
# Check kernel versions on all nodes
kubectl get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.kernelVersion}{"\n"}{end}'

# RKE2 supports multiple OS types:
# - SLES 15 SP4+ (common in enterprise deployments)
# - Ubuntu 20.04/22.04
# - RHEL 8/9 / Rocky Linux / AlmaLinux
# Cilium's current base requirement is kernel 5.10+ or an equivalent
# distribution kernel such as RHEL 8.10's 4.18 kernel.

# Check OS on nodes
kubectl get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.osImage}{"\n"}{end}'
```

## Step 3: Check RKE2 CNI Configuration

```bash
# Check the RKE2 Helm chart for Cilium is deployed
kubectl -n kube-system get helmcharts | grep cilium

# For RKE2, Cilium is deployed as a bundled Helm chart
# Check the chart status
kubectl -n kube-system get helmchart rke2-cilium

# View the Cilium configuration applied by RKE2
kubectl -n kube-system get helmchartconfig rke2-cilium -o yaml 2>/dev/null
```

## Step 4: Validate Cilium Installation State

```bash
# Check Cilium DaemonSet
kubectl -n kube-system get daemonset cilium

# Run cilium CLI status
cilium status --wait

# Check for any failing pods
kubectl -n kube-system get pods -l k8s-app=cilium | grep -v Running

# Check Cilium logs for RKE2-specific issues
kubectl -n kube-system logs -l k8s-app=cilium --tail=30 | \
  grep -i "error\|warn\|fail"
```

## Step 5: Validate RKE2 Specific Settings

RKE2 uses containerd with specific socket paths. Cilium does not normally need the containerd socket for standard CNI operation, but checking it is useful when troubleshooting runtime-related issues on RKE2 nodes.

```bash
# Check Cilium's cgroup root setting when troubleshooting eBPF service issues
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.cgroup-root}'

# Verify RKE2's containerd socket on a node
# RKE2 uses /run/k3s/containerd/containerd.sock (not the standard path)
sudo /var/lib/rancher/rke2/bin/ctr \
  --address /run/k3s/containerd/containerd.sock \
  --namespace k8s.io container ls >/dev/null
```

## Step 6: Run Connectivity Tests

```bash
# Run the Cilium connectivity test to validate all networking
cilium connectivity test

# Check service connectivity specifically (kube-proxy replacement)
kubectl run test-svc \
  --image=busybox:1.36 \
  --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local
kubectl logs test-svc && kubectl delete pod test-svc
```

## Best Practices

- Use `cni: cilium` in your RKE2 config.yaml, or `cni: none` if you plan to install upstream Cilium yourself
- For RKE2, use `HelmChartConfig` to customize Cilium values without modifying the bundled chart
- Pin the RKE2 version to control the bundled Cilium version; update together
- Validate on a single-node RKE2 cluster before deploying to production multi-node
- Review RKE2 release notes for Cilium version bumps between RKE2 releases

## Conclusion

Validating Cilium requirements on RKE/RKE2 involves checking both RKE-specific configuration (CNI selection, containerd paths, Helm charts) and standard Cilium prerequisites. When requirements are met and the connectivity test passes, you have a confirmed working Cilium installation on your Rancher Kubernetes Engine cluster.
