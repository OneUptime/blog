# Validate Cilium Requirements on RKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, rke, rancher, kubernetes, requirements, prerequisites, cni

Description: Learn how to validate that your Rancher Kubernetes Engine (RKE or RKE2) cluster meets all requirements for running Cilium, covering RKE-specific configuration and system prerequisites.

---

## Introduction

Rancher Kubernetes Engine (RKE and its successor RKE2) is Rancher Lab's production-grade Kubernetes distribution. RKE2 in particular is gaining wide adoption as a hardened, FIPS-compliant Kubernetes distribution. Both RKE and RKE2 support Cilium as a CNI option, but each has specific configuration requirements and validation steps.

RKE2 is particularly interesting for Cilium because it is designed with security hardening in mind, and some of its default security settings require explicit configuration to allow Cilium's eBPF programs to load. Understanding the RKE/RKE2-specific requirements and validating them prevents common installation failures.

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
kubectl version --short

# Check RKE2 configuration file for CNI settings
# Location: /etc/rancher/rke2/config.yaml on server nodes
# The cni field should specify cilium
# Example:
# cni: cilium
# disable:
#   - rke2-canal  # Disable default Canal CNI

# For RKE1, check cluster.yml for network plugin
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
# All require kernel 5.4+ for full Cilium feature support

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

RKE2 uses containerd with specific socket paths that Cilium must be configured for.

```bash
# Check that Cilium is configured with the correct containerd socket path
# RKE2 uses /run/k3s/containerd/containerd.sock (not the standard path)
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.cgroup-root}'

# Verify RKE2's containerd socket is accessible to Cilium
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  ls /run/k3s/containerd/ 2>/dev/null || echo "Check containerd socket path"
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

- Use `cni: cilium` in your RKE2 config.yaml and disable Canal/Flannel explicitly
- For RKE2, use `HelmChartConfig` to customize Cilium values without modifying the bundled chart
- Pin the RKE2 version to control the bundled Cilium version; update together
- Validate on a single-node RKE2 cluster before deploying to production multi-node
- Review RKE2 release notes for Cilium version bumps between RKE2 releases

## Conclusion

Validating Cilium requirements on RKE/RKE2 involves checking both RKE-specific configuration (CNI selection, containerd paths, Helm charts) and standard Cilium prerequisites. When requirements are met and the connectivity test passes, you have a confirmed working Cilium installation on your Rancher Kubernetes Engine cluster.
