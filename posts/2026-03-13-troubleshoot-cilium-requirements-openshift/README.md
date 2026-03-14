# Troubleshoot Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, OpenShift, EBPF

Description: A step-by-step guide to verifying Cilium prerequisites on Red Hat OpenShift, addressing OVN-Kubernetes replacement, RHCOS kernel requirements, and SCC configuration.

---

## Introduction

OpenShift clusters present unique challenges for Cilium installation due to the platform's opinionated security model and its default use of OVN-Kubernetes as the CNI. Red Hat CoreOS (RHCOS) nodes enforce SELinux, use immutable root filesystems, and restrict DaemonSet privileges in ways that require explicit Cilium configuration adjustments.

Replacing OVN-Kubernetes with Cilium in OpenShift is a supported but carefully sequenced operation. The cluster network operator (CNO) must be configured to recognize Cilium, and Security Context Constraints (SCCs) must be updated to grant Cilium's DaemonSet the required privileges.

This guide covers the critical requirement checks and configuration steps specific to OpenShift before and during Cilium installation.

## Prerequisites

- `oc` CLI authenticated as `cluster-admin`
- `cilium` CLI installed on your workstation
- OpenShift 4.10 or later
- Access to the `openshift-network-operator` namespace

## Step 1: Check RHCOS Kernel Compatibility

RHCOS ships with a Real-Time or standard kernel. Both support eBPF, but the standard kernel is required for Cilium - the RT kernel disables several eBPF program types.

Verify the kernel variant on each node:

```bash
# List all nodes with their kernel version
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Check if any node uses the RT kernel (contains "rt" in the version string)
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}' | grep rt
```

If RT kernel nodes are present, you must switch them to the standard kernel using a MachineConfig before installing Cilium.

## Step 2: Configure Security Context Constraints for Cilium

Cilium requires elevated privileges to manage network interfaces and BPF programs. OpenShift's default restricted SCC prevents these operations. A custom SCC must be created and bound to the Cilium service account.

Apply the required SCC for Cilium:

```yaml
# cilium-scc.yaml - grants Cilium the privileges it needs on RHCOS nodes
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: cilium
allowHostDirVolumePlugin: true
allowHostIPC: false
allowHostNetwork: true
allowHostPID: false
allowHostPorts: true
allowPrivilegeEscalation: true
allowPrivilegedContainer: true
allowedCapabilities:
  - NET_ADMIN
  - SYS_MODULE
  - SYS_ADMIN
runAsUser:
  type: RunAsAny
seLinuxContext:
  type: RunAsAny
users:
  - system:serviceaccount:kube-system:cilium
```

```bash
# Apply the SCC and bind it to the Cilium service account
oc apply -f cilium-scc.yaml
oc adm policy add-scc-to-user cilium system:serviceaccount:kube-system:cilium
```

## Step 3: Disable OVN-Kubernetes via the Cluster Network Operator

Before installing Cilium, OpenShift's CNO must be updated to stop managing the network. This is a disruptive operation that requires careful planning.

Patch the network operator configuration:

```bash
# View current network configuration
oc get network.config.openshift.io cluster -o yaml

# Patch the network operator to use a third-party CNI plugin (Cilium)
oc patch network.operator.openshift.io cluster \
  --type=merge \
  -p '{"spec":{"defaultNetwork":{"type":"Raw"}}}'
```

## Step 4: Verify Cilium Agent Status on OpenShift

After installation, validate that Cilium agents are running correctly and that SELinux is not blocking any operations.

Check agent health and SELinux audit logs:

```bash
# Check Cilium DaemonSet rollout status
oc -n kube-system rollout status daemonset/cilium

# Look for SELinux denials that might affect Cilium
ausearch -m AVC -ts recent | grep cilium

# Run the Cilium connectivity test against the OpenShift cluster
cilium connectivity test
```

## Best Practices

- Test Cilium on a non-production OpenShift cluster before migrating production workloads
- Use OpenShift's MachineConfig operator to manage kernel module loading across RHCOS nodes
- Avoid mixing OVN-Kubernetes and Cilium managed nodes during migration
- Use Cilium's `--set securityContext.privileged=true` Helm value explicitly for OpenShift
- Monitor Cilium pods with OpenShift's built-in monitoring stack (Prometheus/Alertmanager)

## Conclusion

Cilium on OpenShift requires careful preparation of Security Context Constraints, kernel variant validation, and coordination with the Cluster Network Operator. By addressing these requirements systematically, you can successfully replace OVN-Kubernetes with Cilium and leverage its advanced eBPF-based networking features on RHCOS nodes.
