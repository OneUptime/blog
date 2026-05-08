# Validate Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, OpenShift, eBPF

Description: A guide to validating the specific requirements for running Cilium on Red Hat OpenShift, including SCC configuration, operator installation, and OpenShift-specific networking prerequisites.

---

## Introduction

Running Cilium on OpenShift requires navigating OpenShift's security model, which is significantly more restrictive than standard Kubernetes. OpenShift uses Security Context Constraints (SCCs) alongside Kubernetes Pod Security Admission, and Cilium should be configured as a supported primary CNI rather than treated as a simple live replacement for the default OVN-Kubernetes CNI. Additionally, OpenShift has specific requirements around operator lifecycle management.

Cilium on OpenShift is typically deployed through certified or vendor-maintained OLM images available from the Red Hat Ecosystem Catalog and OperatorHub, which handle the OpenShift-specific manifests and privileged access Cilium agents need. Validating requirements involves checking OpenShift version compatibility, SCC access, and the operator installation state.

## Prerequisites

- OpenShift cluster version supported by the selected certified Cilium or Isovalent release
- `oc` CLI with cluster-admin privileges
- Access to OperatorHub or the ability to apply Operator manifests

## Step 1: Validate OpenShift Version Compatibility

```bash
# Check OpenShift and Kubernetes version

oc version

# Check the cluster version (OpenShift-specific)
oc get clusterversion

# Validate against the current Red Hat certified CNI matrix.
# Examples from the certified matrix:
# Cilium Community 1.13: OpenShift 4.12 and 4.13
# Isovalent Enterprise for Cilium 1.14: OpenShift 4.13 through 4.16
# Isovalent Enterprise for Cilium 1.15: OpenShift 4.14 through 4.17
```

## Step 2: Check Node OS for eBPF Compatibility

```bash
# Verify nodes are running RHCOS (Red Hat CoreOS)
oc get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.osImage}{"\n"}{end}'

# Check kernel version
oc get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Cilium requires Linux kernel 5.10 or later, or an equivalent vendor kernel.
# Red Hat CoreOS 4.12+ is listed by Cilium as a compatible distribution.
# Newer kernels may be required for specific advanced Cilium features.
```

## Step 3: Validate Security Context Constraints

Cilium agents require privileged access to load eBPF programs.

```bash
# Check the SCCs available on the cluster
oc get scc

# Check which subjects can use the privileged and hostnetwork SCCs
oc adm policy who-can use scc privileged | grep -i cilium
oc adm policy who-can use scc hostnetwork | grep -i cilium

# Verify the Cilium DaemonSet service account
oc get daemonset cilium -n cilium \
  -o jsonpath='{.spec.template.spec.serviceAccountName}{"\n"}'

# Check Cilium-related RBAC created by the operator or manifests
oc get clusterrole,clusterrolebinding | grep -i cilium
```

## Step 4: Check the Cilium Operator Installation

```bash
# Check if the Cilium or Isovalent operator is installed via OLM
oc get csv -A | grep -Ei 'cilium|isovalent'

# Check the operator subscription
oc get subscription -A | grep -Ei 'cilium|isovalent'

# Verify the operator is in "Succeeded" state
OPERATOR_NAMESPACE=cilium
oc get csv -n "${OPERATOR_NAMESPACE}" \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.status.phase}{"\n"}{end}'
```

## Step 5: Validate Network Operator Configuration

On OpenShift, the cluster Network Operator manages CNI configuration.

```bash
# Check the current network configuration
oc get network.config.openshift.io cluster -o yaml

# Check the currently deployed network type.
# The Network spec networkType field is immutable after installation; use the
# OpenShift installer or a vendor-supported migration process for Cilium.
oc get network.config.openshift.io cluster \
  -o jsonpath='{.status.networkType}{"\n"}'

# Verify no conflicting CNI configs remain after migration
oc debug node/<node-name> -- chroot /host ls /etc/cni/net.d/
```

## OpenShift-Specific Considerations

```bash
# Check whether the Cilium agent container is configured as privileged
oc get pods -n cilium -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].securityContext.privileged}{"\n"}'

# Verify the Cilium DaemonSet has the required capabilities
oc describe daemonset cilium -n cilium | grep -A 5 "Capabilities"
```

## Best Practices

- Use the certified Cilium or Isovalent Operator from Red Hat OperatorHub for OpenShift support
- Do not skip the SCC and RBAC validation step - Cilium will fail to start without proper access
- Test the CNI migration from OVN-Kubernetes to Cilium in a non-production cluster first
- Keep the selected Cilium or Isovalent version within the certified OpenShift support matrix
- Monitor OpenShift cluster operators after Cilium changes: `oc get clusteroperators`

## Conclusion

Validating Cilium requirements on OpenShift is more complex than on standard Kubernetes due to OpenShift's security model and operator lifecycle management. By checking version compatibility, SCC configuration, operator installation state, and network operator settings, you ensure Cilium can run with the elevated privileges it needs while respecting OpenShift's security boundaries.
