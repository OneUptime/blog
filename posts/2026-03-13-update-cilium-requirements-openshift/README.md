# Update Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, OpenShift, eBPF

Description: A guide to verifying and updating Cilium's system requirements on Red Hat OpenShift, including Security Context Constraints, kernel compatibility, and OVN-Kubernetes migration considerations.

---

## Introduction

Red Hat OpenShift adds several layers of security and operational constraints beyond standard Kubernetes that affect Cilium's requirements. OpenShift's Security Context Constraints (SCCs), default CNI (OVN-Kubernetes), and RHCOS (Red Hat CoreOS) node images all introduce specific prerequisites for running Cilium.

OpenShift's strong security posture means Cilium's privileged agent requires SCC configuration when you are not using a vendor-provided OpenShift Operator that manages it for you. Additionally, replacing OVN-Kubernetes with Cilium requires careful planning around the cluster network operator and RHCOS kernel compatibility.

This guide covers the key checks for running Cilium on OpenShift, including SCC setup, kernel verification, and cluster-level network checks before Cilium installation.

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

# Cilium supports Red Hat CoreOS 4.12+.
# Current Cilium releases require Linux kernel 5.10+ or an equivalent
# vendor kernel; verify the actual kernel on every node instead of assuming
# it from the OpenShift minor version.
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

Cilium's agent requires privileged access. If your Cilium installation method does not provide an OpenShift-certified Operator or SCC, create an SCC for the service account used by your Cilium deployment.

```yaml
# cilium-scc.yaml - Security Context Constraint for Cilium
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
supplementalGroups:
  type: RunAsAny
volumes:
- '*'
users:
# Bind to the Cilium service account; adjust namespace/name for your installer
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

## Step 4: Check Firewall and Network Policy Conflicts

Verify that host firewalls, cloud firewalls, and the currently installed network plugin will not block the ports required by your chosen Cilium datapath.

```bash
# Check the network operator pods
oc get pods -n openshift-network-operator

# Inspect host firewall rules before Cilium install
oc debug node/<node-name> -- chroot /host iptables -L | head -30

# Check current network plugin rules
oc debug node/<node-name> -- chroot /host iptables -L -n | grep OVN
```

## Step 5: Verify etcd and API Server Accessibility

Cilium requires access to the Kubernetes API server. On OpenShift, use the cluster API endpoint and verify the required cluster-scoped permissions before installation.

```bash
# Check API server endpoint accessibility from worker nodes
oc debug node/<worker-node> -- curl -k https://api.<cluster-name>.<base-domain>:6443/readyz

# Verify Cilium's CRDs can be installed (requires cluster-admin)
oc auth can-i create customresourcedefinitions
oc auth can-i create clusterroles
oc auth can-i create clusterrolebindings
```

## Best Practices

- Always test Cilium on OpenShift in a non-production cluster first
- Use `oc debug node` for node-level diagnostics without SSH access
- Review Cilium and Red Hat compatibility notes before major OpenShift upgrades
- Install Cilium with vendor-maintained OpenShift Operator images or during cluster creation when possible
- Use Cilium's documented certificate management options, such as SPIRE for Cilium mutual authentication or cert-manager for Hubble TLS

## Conclusion

Running Cilium on OpenShift requires additional steps beyond standard Kubernetes due to OpenShift's security model and managed CNI architecture. By properly configuring SCCs, verifying RHCOS kernel compatibility, and understanding the Cluster Network Operator's role, you can successfully deploy Cilium on OpenShift and take advantage of its advanced networking capabilities within Red Hat's enterprise Kubernetes environment.
