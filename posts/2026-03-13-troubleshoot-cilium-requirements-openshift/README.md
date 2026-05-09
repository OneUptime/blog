# Troubleshoot Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, OpenShift, eBPF

Description: A step-by-step guide to verifying Cilium prerequisites on Red Hat OpenShift, addressing OVN-Kubernetes replacement, RHCOS kernel requirements, and SCC configuration.

---

## Introduction

OpenShift clusters present unique challenges for Cilium installation due to the platform's opinionated security model and its default use of OVN-Kubernetes as the CNI. Red Hat CoreOS (RHCOS) nodes enforce SELinux, use immutable root filesystems, and restrict DaemonSet privileges in ways that require explicit Cilium configuration adjustments.

Installing Cilium on OpenShift is a vendor-specific operation. Current Cilium documentation does not provide a community-maintained OpenShift installation path and points users to vendor-maintained OLM images. Security Context Constraints (SCCs) must still be configured so Cilium's DaemonSet can run with the required privileges.

This guide covers the critical requirement checks and configuration steps specific to OpenShift before and during Cilium installation.

## Prerequisites

- `oc` CLI authenticated as `cluster-admin`
- `cilium` CLI installed on your workstation
- OpenShift 4.x with nodes that meet the kernel requirements for your Cilium version
- Access to the `openshift-network-operator` namespace

## Step 1: Check RHCOS Kernel Compatibility

Cilium requires a recent kernel with the eBPF and networking options documented for your Cilium release. Current Cilium releases recommend Linux kernel 5.10 or later, or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel.

Verify the kernel version on each node:

```bash
# List all nodes with their kernel version

oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Check if any node uses the RT kernel (typically contains "rt" in the version string)
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}' | grep rt
```

If RT kernel nodes are present, validate them against your Cilium vendor's OpenShift guidance before installing Cilium. Do not assume an RT kernel is equivalent to the standard RHCOS kernel for every Cilium feature.

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
  - NET_RAW
  - SYS_MODULE
  - SYS_ADMIN
  - SYS_RESOURCE
  - IPC_LOCK
  - DAC_OVERRIDE
  - FOWNER
  - SYSLOG
readOnlyRootFilesystem: false
runAsUser:
  type: RunAsAny
seLinuxContext:
  type: RunAsAny
fsGroup:
  type: RunAsAny
supplementalGroups:
  type: RunAsAny
volumes:
  - '*'
users:
  - system:serviceaccount:kube-system:cilium
```

```bash
# Apply the SCC and bind it to the Cilium service account
oc apply -f cilium-scc.yaml
oc adm policy add-scc-to-user cilium system:serviceaccount:kube-system:cilium
```

## Step 3: Validate the Cluster Network Operator Configuration

OpenShift's default network plugin is selected during cluster installation. In current OpenShift 4.x documentation, the `defaultNetwork.type` field is immutable after installation and `OVNKubernetes` is the supported default plugin. Do not patch an existing cluster from `OVNKubernetes` to `Raw`; plan a vendor-supported Cilium installation path before the cluster is created.

Check the network operator configuration:

```bash
# View current network configuration
oc get network.config.openshift.io cluster -o yaml

# View the Cluster Network Operator configuration
oc get network.operator.openshift.io cluster -o yaml
```

## Step 4: Verify Cilium Agent Status on OpenShift

After installation, validate that Cilium agents are running correctly and that SELinux is not blocking any operations.

Check agent health and SELinux audit logs:

```bash
# Check Cilium DaemonSet rollout status
oc -n kube-system rollout status daemonset/cilium

# Look for SELinux denials that might affect Cilium on a node
oc debug node/<node-name> -- chroot /host ausearch -m AVC -ts recent | grep cilium

# Run the Cilium connectivity test against the OpenShift cluster
cilium connectivity test
```

## Best Practices

- Test Cilium on a non-production OpenShift cluster before migrating production workloads
- Use OpenShift's MachineConfig operator to manage kernel module loading across RHCOS nodes
- Avoid ad hoc in-place changes from OVN-Kubernetes to Cilium on existing clusters
- Use Cilium's `--set securityContext.privileged=true` Helm value explicitly for OpenShift
- Monitor Cilium pods with OpenShift's built-in monitoring stack (Prometheus/Alertmanager)

## Conclusion

Cilium on OpenShift requires careful preparation of Security Context Constraints, kernel validation, and coordination with the Cluster Network Operator. By addressing these requirements systematically and following a vendor-supported installation path, you can use Cilium's advanced eBPF-based networking features on RHCOS nodes.
