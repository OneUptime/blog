# Check Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, openshift, red-hat, kubernetes, networking, cni, requirements

Description: Learn how to verify that your OpenShift cluster meets the prerequisites for installing Cilium as the CNI, including OVN-Kubernetes replacement, RHCOS kernel requirements, and OpenShift-specific security context constraints.

---

## Introduction

Installing Cilium on OpenShift is more complex than on vanilla Kubernetes because OpenShift ships with its own CNI plugin (OVN-Kubernetes) and has strict security requirements enforced through Security Context Constraints (SCCs). Replacing the default CNI with Cilium requires specific cluster configuration, node rebooting during migration, and adjusting SCCs to allow Cilium's privileged operations.

This guide covers the prerequisites check for Cilium on OpenShift 4.x, including platform compatibility, kernel requirements, and the OpenShift-specific configuration needed before installation.

## Prerequisites

- OpenShift 4.x cluster (OCP or OKD)
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

# RHCOS 4.12+ uses kernel 5.14+ which provides full Cilium feature support
# Verify minimum kernel version for your required Cilium features:
# - Basic CNI: 4.9.17+
# - kube-proxy replacement: 4.19.57+
# - eBPF host routing: 5.10+
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

# Cilium requires these SCC capabilities:
# - hostNetwork: true
# - hostPID: true
# - privileged: true
# - runAsUser: RunAsAny
# - seLinux: RunAsAny

# View the full privileged SCC definition
oc get scc privileged -o yaml | grep -E "allowPrivilege|hostNetwork|hostPID|runAsUser"
```

## Step 4: Prepare for CNI Replacement

Replacing OVN-Kubernetes with Cilium on OpenShift requires putting the cluster into "network type migration" mode.

```bash
# Check current network operator configuration
oc get network.operator cluster -o yaml

# Check current network type
oc get network.config cluster -o jsonpath='{.status.networkType}'
# Expected before migration: OVNKubernetes

# List all MachineConfig objects (nodes will need to reboot during migration)
oc get machineconfig | grep -E "network|cni"

# Check node readiness before starting migration
oc get nodes
# All nodes should be in Ready state before attempting CNI migration

# Check cluster upgrade channel (should not migrate CNI during a cluster upgrade)
oc get clusterversion -o jsonpath='{.items[0].spec.channel}'
```

## Step 5: Install Cilium on OpenShift Using the Cilium Operator

Use the Cilium Helm chart with OpenShift-specific values.

```bash
# Install Cilium with OpenShift-specific configuration
# Note: OpenShift uses its own kube-proxy implementation — do not enable kube-proxy replacement initially
cilium install \
  --helm-set kubeProxyReplacement=false \
  --helm-set openshift.enabled=true \
  --helm-set cni.chainingMode=none \
  --version 1.15.0

# Alternatively, use Helm directly with OpenShift values
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --set openshift.enabled=true \
  --set kubeProxyReplacement=false \
  --set securityContext.privileged=true

# After installation, verify Cilium pods are running
oc get pods -n kube-system -l k8s-app=cilium
```

## Best Practices

- Always test Cilium on a non-production OpenShift cluster before migrating production.
- Perform CNI migration during a maintenance window — all nodes will reboot during the migration.
- Do not attempt CNI migration while an OpenShift cluster upgrade is in progress.
- Use the Cilium operator (`openshift.enabled=true`) to ensure OpenShift-specific SCC and RBAC configurations are applied correctly.
- Verify all critical workloads are healthy after the migration before declaring success.

## Conclusion

Cilium on OpenShift requires specific preparation around SCCs, kernel compatibility, and CNI replacement mode. By checking RHCOS kernel versions, verifying SCC availability, and confirming cluster stability before migration, you minimize the risk of connectivity disruption during the Cilium installation. Always run `cilium status` after installation to confirm all agents are healthy on every node.
