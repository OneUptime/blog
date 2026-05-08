# How to Use the Calico WorkloadEndpoint Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, WorkloadEndpoint, Networking, CNI, Network Policy

Description: A practical guide to understanding, querying, and leveraging Calico WorkloadEndpoint resources for network visibility and troubleshooting in production clusters.

---

## Introduction

The WorkloadEndpoint resource in Calico represents a network interface associated with a workload, such as a Kubernetes pod. When Calico networking is set up for a pod, Calico creates a corresponding WorkloadEndpoint that tracks details such as the pod name, assigned IP CIDRs, host-side interface name, and the profiles applied to it.

Understanding WorkloadEndpoints is essential for operators who need to debug connectivity issues, verify that network policies are correctly applied, or audit which endpoints exist on a given node. Unlike higher-level Kubernetes resources, WorkloadEndpoints give you a direct view into the endpoint state that Calico uses to program policy and networking.

This guide walks through practical techniques for listing, inspecting, and using WorkloadEndpoint resources in real production clusters running Calico as the CNI plugin.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+ installed
- `calicoctl` CLI installed and configured
- `kubectl` access with cluster-admin privileges
- Familiarity with Calico networking concepts

## Listing WorkloadEndpoints

Use `calicoctl` to list all WorkloadEndpoints in the cluster:

```bash
# List all WorkloadEndpoints across all namespaces

calicoctl get workloadendpoints --all-namespaces -o wide

# List WorkloadEndpoints in a specific namespace
calicoctl get workloadendpoints --namespace=default -o wide

# Output in YAML format for detailed inspection
calicoctl get workloadendpoints --namespace=kube-system -o yaml
```

Each entry shows the endpoint name, node, orchestrator, workload, interface, and assigned IP addresses.

## Inspecting a Specific WorkloadEndpoint

To examine the full specification of a WorkloadEndpoint:

```bash
# Get a specific WorkloadEndpoint by name
calicoctl get workloadendpoint <endpoint-name> -o yaml --namespace=default
```

The output includes key fields:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node1-k8s-mypod-eth0
  namespace: default
  labels:
    projectcalico.org/namespace: default
    projectcalico.org/orchestrator: k8s
spec:
  node: node1
  orchestrator: k8s
  endpoint: eth0
  interfaceName: cali1234abcd
  ipNetworks:
    - 192.168.10.5/32
  profiles:
    - kns.default
    - ksa.default.default
```

## Filtering WorkloadEndpoints by Node

When troubleshooting a specific node, filter endpoints by the node name:

```bash
# List all WorkloadEndpoints on a particular node
calicoctl get workloadendpoints --all-namespaces -o wide | grep "node1"
```

You can also filter by Calico's automatic namespace label in YAML output:

```bash
# Filter by the namespace label in YAML output
calicoctl get workloadendpoints --all-namespaces -o yaml | grep -B 6 -A 20 "projectcalico.org/namespace: production"
```

## Correlating WorkloadEndpoints with Pod State

Cross-reference WorkloadEndpoints with Kubernetes pod state to verify consistency:

```bash
# Get pod IPs from Kubernetes
kubectl get pods -n default -o wide

# Compare with Calico WorkloadEndpoints
calicoctl get workloadendpoints -n default -o wide
```

If a pod exists in Kubernetes but has no corresponding WorkloadEndpoint, Calico may not have processed the pod yet, or Felix may be experiencing issues on that node. Check the calico-node logs, using the namespace where Calico is installed:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=50
# Or, for manifest-based installs:
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=50
```

## Checking Applied Profiles and Policies

The `profiles` field in a WorkloadEndpoint lists the Calico profiles assigned to the endpoint. Profiles can contribute labels to endpoints and historically could also contain policy rules, though Calico recommends NetworkPolicy and GlobalNetworkPolicy for policy:

```bash
# View profiles for a specific endpoint
calicoctl get workloadendpoint <endpoint-name> -n default -o yaml | grep -A 5 "profiles"

# List the profile details
calicoctl get profile kns.default -o yaml
```

This helps verify the endpoint's profile assignments and labels that policy may rely on.

## Debugging Interface Mapping

Each WorkloadEndpoint has an `interfaceName` field that maps to a veth interface on the host:

```bash
# Find the host-side interface for a WorkloadEndpoint
calicoctl get workloadendpoint <endpoint-name> -n default -o yaml | grep interfaceName

# Verify the interface exists on the node
kubectl debug node/node1 -it --image=busybox -- ip link show cali1234abcd
```

## Verification

After exploring WorkloadEndpoints, verify that your cluster state is consistent:

```bash
# Count WorkloadEndpoints vs running pods
WEP_COUNT=$(calicoctl get workloadendpoints --all-namespaces -o wide | tail -n +2 | wc -l)
POD_COUNT=$(kubectl get pods --all-namespaces --field-selector=status.phase=Running -o name | wc -l)
echo "WorkloadEndpoints: $WEP_COUNT, Running Pods: $POD_COUNT"

# Check for any endpoints without IPs
calicoctl get workloadendpoints --all-namespaces -o yaml | grep -B 10 "ipNetworks: \[\]"
```

The WorkloadEndpoint count should closely match the running pod count for pods that use Calico networking. Minor discrepancies can occur during pod scheduling transitions, and host-network pods do not have a normal Calico pod interface.

## Troubleshooting

**Missing WorkloadEndpoints**: If a pod has no corresponding WorkloadEndpoint, restart the calico-node pod on the affected node and check Felix logs for errors.

**Stale WorkloadEndpoints**: If WorkloadEndpoints exist for pods that no longer run, Felix may need to reconcile. Restart the calico-node DaemonSet pod on the affected node.

**Incorrect IP assignment**: Verify the IPAM configuration with `calicoctl ipam show` and ensure the pod CIDR matches the configured IP pools.

```bash
# Check IPAM allocation
calicoctl ipam show --show-blocks

# Verify IP pools
calicoctl get ippools -o wide
```

## Conclusion

Calico WorkloadEndpoint resources provide a detailed view into the network state of every workload in your cluster. By learning to query, filter, and correlate these resources with Kubernetes pod state, operators gain the visibility needed to diagnose network issues and verify policy enforcement. Incorporating WorkloadEndpoint inspection into your regular operational workflows helps maintain confidence in your cluster networking layer.
