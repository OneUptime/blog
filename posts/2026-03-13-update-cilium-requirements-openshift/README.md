# Update Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, openshift, redhat, kubernetes, requirements, cni, scc

Description: A guide to verifying and updating Cilium's system requirements on Red Hat OpenShift, including Security Context Constraints, kernel compatibility, and OVN-Kubernetes migration considerations.

---

## Introduction

Red Hat OpenShift adds several layers of security and operational constraints beyond standard Kubernetes that affect Cilium's requirements. OpenShift's Security Context Constraints (SCCs), default CNI (OVN-Kubernetes), and RHCOS (Red Hat CoreOS) node images all introduce specific prerequisites for running Cilium.

OpenShift's strong security posture means Cilium's privileged DaemonSet requires explicit SCC configuration — a step that doesn't exist on standard Kubernetes. Additionally, migrating from OVN-Kubernetes to Cilium requires careful planning around the cluster network operator and RHCOS kernel compatibility.

This guide covers all prerequisites for running Cilium on OpenShift, including SCC setup, kernel verification, and the cluster-level network changes needed before Cilium installation.

## Prerequisites

- OpenShift cluster (4.12+)
- `oc` CLI with cluster-admin permissions
- `kubectl` configured for the cluster
- `cilium` CLI installed
- Understanding of OpenShift's network operator architecture

## Step 1: Check OpenShift Version and RHCOS Kernel

Verify the OpenShift version and underlying RHCOS kernel meet Cilium's requirements.

```bash
# Check OpenShift version
oc version

# Check RHCOS kernel version on nodes
oc get nodes -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# OpenShift 4.14+ with RHCOS runs kernel 5.14+
# OpenShift 4.12+ with RHCOS runs kernel 5.14+ (minimum for Cilium eBPF)
```

## Step 2: Check Current CNI and Network Operator Status

OpenShift uses the Cluster Network Operator (CNO) to manage the CNI.

```bash
# Check the current CNI plugin in use
oc get network.operator cluster -o yaml | grep networkType

# Check CNO status
oc get clusteroperator network

# View the current cluster network configuration
oc get network.config cluster -o yaml
```

## Step 3: Configure Security Context Constraints for Cilium

Cilium's DaemonSet requires privileged access. Create the appropriate SCC.

```yaml
# cilium-scc.yaml — Security Context Constraint for Cilium
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: cilium-scc
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
fsGroup:
  type: RunAsAny
readOnlyRootFilesystem: false
runAsUser:
  type: RunAsAny
seLinuxContext:
  type: RunAsAny
users:
# Bind to the Cilium service account
- system:serviceaccount:kube-system:cilium
groups: []
```

Apply the SCC:

```bash
# Apply the Cilium SCC
oc apply -f cilium-scc.yaml

# Bind the SCC to the Cilium service account
oc adm policy add-scc-to-user cilium-scc \
  system:serviceaccount:kube-system:cilium

# Verify the binding
oc get scc cilium-scc -o yaml | grep users -A 5
```

## Step 4: Disable OpenShift Firewall Management Conflicts

OpenShift's iptables management may conflict with Cilium. Check for conflicts.

```bash
# Check if iptables-operator is running
oc get pods -n openshift-network-operator

# Verify no conflicting iptables rules exist before Cilium install
oc debug node/<node-name> -- chroot /host iptables -L | head -30

# Check current network plugin iptables chains
oc debug node/<node-name> -- chroot /host iptables -L -n | grep OVN
```

## Step 5: Verify etcd and API Server Accessibility

Cilium requires access to the Kubernetes API server which on OpenShift runs on control plane nodes.

```bash
# Check API server endpoint accessibility from worker nodes
oc debug node/<worker-node> -- curl -k https://api.<cluster-domain>:6443/healthz

# Verify Cilium's CRDs can be installed (requires cluster-admin)
oc auth can-i create customresourcedefinitions
oc auth can-i create clusterroles
oc auth can-i create clusterrolebindings
```

## Best Practices

- Always test Cilium on OpenShift in a non-production cluster first
- Use `oc debug node` for node-level diagnostics without SSH access
- Review Red Hat's Cilium compatibility announcements before major OpenShift upgrades
- Keep the Cluster Network Operator in sync with your Cilium version
- Use OpenShift's built-in certificate rotation to keep Cilium's mTLS certificates current

## Conclusion

Running Cilium on OpenShift requires additional steps beyond standard Kubernetes due to OpenShift's security model and managed CNI architecture. By properly configuring SCCs, verifying RHCOS kernel compatibility, and understanding the Cluster Network Operator's role, you can successfully deploy Cilium on OpenShift and take advantage of its advanced networking capabilities within Red Hat's enterprise Kubernetes environment.
