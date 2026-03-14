# Validate Cilium Requirements on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, OpenShift, eBPF

Description: A guide to validating the specific requirements for running Cilium on Red Hat OpenShift, including SCC configuration, operator installation, and OpenShift-specific networking prerequisites.

---

## Introduction

Running Cilium on OpenShift requires navigating OpenShift's security model, which is significantly more restrictive than standard Kubernetes. OpenShift uses Security Context Constraints (SCCs) instead of PodSecurityAdmission, and its default OVN-Kubernetes CNI must be replaced or supplemented when using Cilium. Additionally, OpenShift has specific requirements around operator lifecycle management.

Cilium on OpenShift is typically deployed through the Cilium Operator available in OperatorHub, which handles SCC creation and the privileged access Cilium agents need. Validating requirements involves checking OpenShift version compatibility, SCC configuration, and the operator installation state.

## Prerequisites

- OpenShift cluster (4.12+)
- `oc` CLI with cluster-admin privileges
- Access to OperatorHub or the ability to apply Operator manifests
- `cilium` CLI installed

## Step 1: Validate OpenShift Version Compatibility

```bash
# Check OpenShift and Kubernetes version
oc version

# Check the cluster version (OpenShift-specific)
oc get clusterversion

# Cilium on OpenShift requirements:
# OpenShift 4.12+: Cilium 1.13+
# OpenShift 4.14+: Cilium 1.14+ (recommended)
# Full feature support requires OpenShift 4.14+ with RHEL CoreOS nodes
```

## Step 2: Check Node OS for eBPF Compatibility

```bash
# Verify nodes are running RHCOS (Red Hat CoreOS)
oc get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.osImage}{"\n"}{end}'

# Check kernel version
oc get nodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.nodeInfo.kernelVersion}{"\n"}{end}'

# RHCOS in OpenShift 4.14+ includes kernel 5.14+ which fully supports Cilium eBPF
```

## Step 3: Validate Security Context Constraints

Cilium agents require privileged access to load eBPF programs.

```bash
# Check if Cilium-specific SCCs are present (created by the Cilium Operator)
oc get scc | grep cilium

# Expected SCCs after Cilium Operator installation:
# cilium-admin
# cilium-node

# Verify the Cilium ServiceAccount is bound to the correct SCC
oc describe scc cilium-node | grep -A 10 "Users\|Groups"

# Check if the DaemonSet service account has SCC access
oc describe clusterrolebinding cilium 2>/dev/null | head -20
```

## Step 4: Check the Cilium Operator Installation

```bash
# Check if the Cilium Operator is installed via OLM
oc get csv -n cilium | grep cilium

# Check the operator subscription
oc get subscription -n cilium

# Verify the operator is in "Succeeded" state
oc get csv -n cilium \
  -o jsonpath='{.items[0].status.phase}'
```

## Step 5: Validate Network Operator Configuration

On OpenShift, the cluster Network Operator manages CNI configuration.

```bash
# Check the current network configuration
oc get network.config cluster -o yaml

# For replacing OVN-Kubernetes with Cilium, the networkType should be changed
# This is a significant operation - validate in a test cluster first
oc get network.config cluster \
  -o jsonpath='{.spec.networkType}'

# Verify no conflicting CNI configs remain after migration
oc debug node/<node-name> -- chroot /host ls /etc/cni/net.d/
```

## OpenShift-Specific Considerations

```bash
# Check that Cilium pods can run as privileged
oc get pods -n cilium -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].securityContext}' | \
  python3 -m json.tool

# Verify the Cilium DaemonSet has the required capabilities
oc describe daemonset cilium -n cilium | grep -A 5 "Capabilities"
```

## Best Practices

- Use the certified Cilium Operator from Red Hat OperatorHub for OpenShift support
- Do not skip the SCC creation step - Cilium will fail to start without proper SCCs
- Test the CNI migration from OVN-Kubernetes to Cilium in a non-production cluster first
- Keep the OpenShift Network Operator and Cilium Operator versions aligned
- Monitor OpenShift cluster operators after Cilium changes: `oc get clusteroperators`

## Conclusion

Validating Cilium requirements on OpenShift is more complex than on standard Kubernetes due to OpenShift's security model and operator lifecycle management. By checking version compatibility, SCC configuration, operator installation state, and network operator settings, you ensure Cilium can run with the elevated privileges it needs while respecting OpenShift's security boundaries.
