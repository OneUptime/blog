# Update Cilium Requirements on RKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, RKE, Rancher, eBPF

Description: Learn how to verify and update Cilium's system requirements on Rancher Kubernetes Engine (RKE and RKE2), covering node OS compatibility, network configuration, and Rancher-specific prerequisites.

---

## Introduction

Rancher Kubernetes Engine (RKE and RKE2) has specific networking defaults and node provisioning behaviors that affect Cilium's requirements. RKE2 ships with Canal (Calico + Flannel) as its default CNI, while RKE1 uses Canal by default. RKE2 can deploy Cilium as a bundled CNI; RKE1 does not list Cilium as a built-in network plug-in, so it must be installed as a custom CNI with the RKE network plug-in set to `none` before cluster creation. Replacing an existing CNI requires understanding the CNI replacement process and ensuring all nodes meet Cilium's requirements before the switch.

RKE's node provisioning model - Docker for RKE1 and containerd for RKE2 - affects the host paths, privileges, and CNI artifacts that Cilium needs. Additionally, Rancher's node hardening CIS profiles can apply host-level requirements and pod security controls, making it essential to review these configurations before installation.

This guide covers checking and updating Cilium requirements specifically for RKE and RKE2 clusters, including CNI replacement planning, kernel verification, and Rancher-specific configuration adjustments.

## Prerequisites

- RKE or RKE2 cluster managed by Rancher
- `kubectl` with cluster-admin permissions
- `rke` or `rke2` CLI installed on provisioning nodes
- `cilium` CLI installed
- SSH access to cluster nodes (for RKE1)

## Step 1: Identify RKE Version and Current CNI

Determine whether you're running RKE1 or RKE2 and what CNI is currently in use.

```bash
# Check RKE/RKE2 version and status

rke --version
rke2 --version

# Check the bundled RKE2 Canal Helm chart, if Canal is in use
kubectl get configmap -n kube-system rke2-canal -o yaml 2>/dev/null || \
  echo "Canal not found - different CNI may be in use"

# Check which CNI pods are running
kubectl get pods -n kube-system | grep -E "canal|cilium|flannel|calico"

# View node annotations that may identify the configured CNI
# For RKE2: /etc/rancher/rke2/config.yaml contains node configuration,
# while /etc/rancher/rke2/rke2.yaml is the generated admin kubeconfig.
kubectl get node <node-name> -o jsonpath='{.metadata.annotations}'
```

## Step 2: Verify Node OS and Kernel Version

Check that all nodes meet Cilium's kernel requirements.

```bash
# Check all node kernel versions
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# Current Cilium releases require Linux kernel 5.10+ or an equivalent vendor kernel
# such as RHEL 8.10's 4.18 kernel.
# Ubuntu 22.04: kernel 5.15+ meets the base requirement.
# SLES/openSUSE Leap 15.4: verify the vendor kernel has the required eBPF options.
# RHEL 8.10: kernel 4.18 is listed by Cilium as an equivalent supported kernel.
```

Upgrade nodes that don't meet kernel requirements:

```bash
# On Ubuntu nodes - upgrade kernel to LTS version
sudo apt-get update && sudo apt-get install -y linux-generic-hwe-22.04
sudo reboot

# Verify kernel version after reboot
uname -r
```

## Step 3: Check RKE2 Network Configuration for Cilium Replacement

Plan the CNI replacement by reviewing RKE2's CNI configuration.

```bash
# View current RKE2 server configuration
cat /etc/rancher/rke2/config.yaml

# To replace Canal with Cilium, the RKE2 config needs:
# cni: cilium
# Set this before bootstrapping a new cluster, or during a planned reprovisioning
# when changing an existing cluster's CNI.
```

Create an updated RKE2 configuration for Cilium:

```yaml
# /etc/rancher/rke2/config.yaml - Updated for Cilium CNI
# This configuration selects the bundled Cilium CNI instead of the default Canal CNI
cni: cilium
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
# Disable kube-proxy if using Cilium's kube-proxy replacement
disable-kube-proxy: true
```

If you use Cilium's kube-proxy replacement mode on RKE2, add the matching Helm chart values:

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-cilium-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-cilium
  namespace: kube-system
spec:
  valuesContent: |-
    kubeProxyReplacement: true
    k8sServiceHost: "localhost"
    k8sServicePort: "6443"
```

## Step 4: Check for CIS Hardening Profile Conflicts

Rancher's CIS hardening profiles may restrict system calls Cilium needs.

```bash
# Check if CIS hardening is enabled on the cluster
kubectl get configmap -n kube-system rke2-cis-benchmark-config 2>/dev/null

# Check sysctl settings on nodes that Cilium requires
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.ip_forward
sysctl kernel.unprivileged_bpf_disabled

# Cilium's Kubernetes DaemonSet runs privileged and may set
# kernel.unprivileged_bpf_disabled=1 to disable unprivileged BPF use.
# Do not try to reset a value of 1 to 0 at runtime; on Linux this setting
# is a one-way switch until reboot.
```

## Step 5: Validate Container Runtime Configuration

RKE2 uses containerd. Verify it's configured to support Cilium's CNI requirements.

```bash
# Check container runtime access on RKE2 nodes
export CRI_CONFIG_FILE=/var/lib/rancher/rke2/agent/etc/crictl.yaml
/var/lib/rancher/rke2/bin/crictl info

# Verify RKE2's packaged CLI tools are accessible
ls /var/lib/rancher/rke2/bin/

# Check that CNI config directory is writable
ls -la /etc/cni/net.d/
```

## Best Practices

- Always test CNI replacement on a non-production RKE2 cluster first
- Back up the RKE cluster state before any CNI changes
- Plan for cluster downtime during CNI replacement in RKE1 (rolling replacement not supported)
- Use RKE2 over RKE1 for new clusters - better Cilium integration support
- Validate with `cilium connectivity test` after every requirement update

## Conclusion

Meeting Cilium's requirements on RKE and RKE2 involves verifying kernel compatibility, planning CNI replacement, and checking for CIS hardening profile conflicts. RKE2 provides the smoothest path for Cilium deployment through its native CNI plugin support. By carefully verifying each requirement layer before attempting the CNI switch, you avoid disrupting cluster networking during the transition.
