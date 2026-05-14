# Check Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, OpenShift, eBPF

Description: Learn how to verify that your OpenShift cluster meets the prerequisites for installing Cilium as the CNI, including OVN-Kubernetes replacement, RHCOS kernel requirements, and OpenShift-specific...

---

## Introduction

Installing Cilium on OpenShift is more complex than on vanilla Kubernetes because OpenShift ships with its own CNI plugin (OVN-Kubernetes) and has strict security requirements enforced through Security Context Constraints (SCCs). Using Cilium as the cluster network provider requires a supported OpenShift-specific installation path and SCC/RBAC configuration that allows Cilium's privileged operations.

This guide covers the prerequisites check for Cilium on OpenShift 4.x, including platform compatibility, kernel requirements, and the OpenShift-specific configuration needed before installation.

## Prerequisites

- OpenShift 4.x cluster (OCP or OKD) with a supported Cilium distribution or vendor-maintained OpenShift installation path
- `oc` CLI installed and authenticated
- `kubectl` configured (optional, works alongside `oc`)
- `cilium` CLI v1.14+
- Cluster admin privileges

## Step 1: Check OpenShift Version and Kubernetes Version Compatibility

Verify your OpenShift version maps to a supported Kubernetes version for Cilium.

```bash
# Check OpenShift version

oc version

# Check Kubernetes version (embedded in OpenShift)
oc version --short | grep "Kubernetes"

# Cilium compatibility:
# OpenShift 4.12 → Kubernetes 1.25 → Cilium 1.13+
# OpenShift 4.13 → Kubernetes 1.26 → Cilium 1.14+
# OpenShift 4.14 → Kubernetes 1.27 → Cilium 1.14+

# Check current CNI plugin
oc get clusteroperators network -o yaml | grep -A5 "status:"
```

## Step 2: Check RHCOS Kernel Version

Red Hat CoreOS (RHCOS) nodes run a specific kernel version that determines which Cilium eBPF features are available.

```bash
# Check kernel version on cluster nodes
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Check OS version (should be RHCOS for control plane, RHEL for workers)
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.osImage}{"\n"}{end}'

# RHCOS 4.12 is based on RHEL 8.6, while OpenShift 4.13/4.14 use RHEL 9.2-based RHCOS.
# Check the actual node kernel instead of assuming the kernel version from the OpenShift minor version.
# Verify minimum kernel version for your required Cilium features:
# - Cilium 1.19 baseline: Linux 5.10+, or an equivalent vendor kernel such as RHEL 8.10's 4.18 kernel
# - Advanced features can require newer kernels; check the Cilium system requirements for your Cilium version.
oc debug node/<node-name> -- chroot /host uname -r
```

## Step 3: Check Security Context Constraints Requirements

Cilium requires privileged access to the host network stack. Verify SCCs are in place.

```bash
# Check if the privileged SCC exists (required for Cilium)
oc get scc privileged

# Check if Cilium service account can use privileged SCC
# (This will fail before Cilium is installed, but verifies the SCC mechanism works)
oc adm policy who-can use scc/privileged

# The built-in privileged SCC allows these relevant settings:
# - allowHostNetwork: true
# - allowHostPID: true
# - allowPrivilegedContainer: true
# - runAsUser: RunAsAny
# - seLinuxContext: RunAsAny

# View the full privileged SCC definition
oc get scc privileged -o yaml | grep -E "allowPrivilegedContainer|allowHostNetwork|allowHostPID|runAsUser|seLinuxContext"
```

## Step 4: Prepare for CNI Replacement

OpenShift's documented network plugin migration flow is for migrating between OpenShift-managed network plugins, such as OpenShift SDN to OVN-Kubernetes. Do not assume that an existing OVN-Kubernetes cluster can be converted to Cilium by using the OpenShift SDN-to-OVN migration field; follow the supported Cilium or vendor documentation for your OpenShift version and distribution.

```bash
# Check current network operator configuration
oc get network.operator cluster -o yaml

# Check current network type
oc get network.config cluster -o jsonpath='{.status.networkType}'
# Typical default on OpenShift 4.14+: OVNKubernetes

# List network-related MachineConfig objects (supported migrations can trigger node reboots)
oc get machineconfig | grep -E "network|cni"

# Check node readiness before starting migration
oc get nodes
# All nodes should be in Ready state before attempting CNI migration

# Check cluster upgrade channel (should not migrate CNI during a cluster upgrade)
oc get clusterversion -o jsonpath='{.items[0].spec.channel}'
```

## Step 5: Confirm the Supported Cilium Installation Method

Use the supported OpenShift-specific Cilium installation method for your distribution. Current upstream Cilium documentation does not provide a community-maintained OpenShift installation; it points OpenShift users to vendor-maintained OLM images and instructions. Older OKD-focused documentation used Cilium OLM manifests during cluster installation rather than a generic `cilium install` or Helm install with an `openshift.enabled` value.

```bash
# Check whether a Cilium Operator installed through OLM is present
oc get csv -A | grep -i cilium

# Check for Cilium custom resources installed by your supported distribution
oc api-resources | grep -i cilium

# After installation, verify Cilium pods in the namespace used by your distribution
oc get pods -A -l k8s-app=cilium
```

## Best Practices

- Always test Cilium on a non-production OpenShift cluster before migrating production.
- Perform any supported CNI migration during a maintenance window; OpenShift network plugin migrations can include downtime and node reboots.
- Do not attempt CNI migration while an OpenShift cluster upgrade is in progress.
- Use the supported Cilium Operator or vendor-maintained OpenShift installation method so OpenShift-specific SCC and RBAC configurations are applied correctly.
- Verify all critical workloads are healthy after the migration before declaring success.

## Conclusion

Cilium on OpenShift requires specific preparation around SCCs, kernel compatibility, and the supported installation method. By checking RHCOS kernel versions, verifying SCC availability, and confirming cluster stability before migration, you minimize the risk of connectivity disruption during the Cilium installation. Always run `cilium status` after installation, using the correct namespace if needed, to confirm all agents are healthy on every node.
