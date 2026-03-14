# Diagnosing CIDRNotAvailable Errors in Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Troubleshooting

Description: Step-by-step diagnostic procedures for identifying the root cause of CIDRNotAvailable errors in Kubernetes clusters running Calico and kubeadm.

---

## Introduction

CIDRNotAvailable errors occur when Calico cannot find a suitable CIDR block to allocate IPs from. This typically happens when the pod CIDR configured in kubeadm does not match the Calico IPPool configuration, or when the IP address space is exhausted.

This guide provides a systematic approach to diagnosing CIDRNotAvailable errors. Rather than guessing at solutions, you will methodically narrow down the root cause using Calico and Kubernetes diagnostic commands.

Accurate diagnosis is the most important step in resolving any Calico networking issue. Skipping straight to fixes without understanding the cause often leads to recurring problems or introduces new issues.

## Prerequisites

- A Kubernetes cluster running Calico where CIDRNotAvailable errors are occurring
- `kubectl` with cluster-admin privileges
- `calicoctl` installed
- Access to node logs (directly or via `kubectl debug`)

## Step 1: Confirm the Error

Start by confirming the exact error and its scope:

```bash
# Check calico-node pod logs for relevant errors
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=100 | grep -i "error\|fail\|warn"

# Check recent events across the cluster
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "calico\|cni\|network" | tail -20

# View Calico IPPool configuration
calicoctl get ippools -o yaml
```

Document the exact error message, which pods or nodes are affected, and when the error first appeared.

## Step 2: Deep Investigation

Dig deeper into the root cause:

```bash
# Check the Calico system pod status
kubectl get pods -n calico-system -o wide

# Verify IPAM state
calicoctl ipam show

# Check Felix configuration
calicoctl get felixconfiguration default -o yaml

# Look at calico-node logs on specific nodes
kubectl logs -n calico-system <calico-node-pod> -c calico-node --tail=200
```

## Step 3: Node-Level Analysis

Narrow down to specific nodes:

```bash
# Check which nodes have issues
kubectl get nodes -o wide

# Test connectivity from a debug pod
kubectl run debug-net --image=busybox --rm -it --restart=Never -- ping -c 3 <target-ip>

# Check calico-node status per node
calicoctl node status
```

## Step 4: Collect a Diagnostic Bundle

For complex issues, collect a full diagnostic bundle:

```bash
# Collect Calico diagnostic information
calicoctl node diag

# Collect cluster-wide Calico state
calicoctl get nodes -o yaml > calico-nodes.yaml
calicoctl get ippools -o yaml > calico-ippools.yaml
calicoctl get felixconfiguration -o yaml > calico-felix.yaml
```

## Verification

After identifying the root cause, verify your diagnosis before proceeding to fixes:

```bash
# Confirm the identified cause matches the symptoms
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "error\|warning" | tail -20

# Verify Calico system health
kubectl get pods -n calico-system
calicoctl node status
```

## Troubleshooting

**Cannot access calico-node pods for diagnostics:**
- Use `kubectl debug node/<name>` to get a shell on the node directly.
- Check if the calico-system namespace exists: `kubectl get ns calico-system`.

**calicoctl commands failing:**
- Ensure calicoctl version matches your Calico version: `calicoctl version`.
- Set the correct datastore type: `export DATASTORE_TYPE=kubernetes`.

**Inconsistent behavior across diagnostic runs:**
- The issue may be intermittent. Run diagnostics multiple times and compare results.
- Check for recent deployments or scaling events that may be triggering the error.


## Additional Considerations

### Multi-Cluster Environments

If you operate multiple Kubernetes clusters with Calico, standardize your configurations across clusters. Use a central repository for Calico resource manifests and deploy them consistently using your CI/CD pipeline. This prevents configuration drift and makes it easier to troubleshoot issues that may be cluster-specific.

```bash
# Compare Calico configurations across clusters
# Export from each cluster and diff
KUBECONFIG=cluster-1.kubeconfig calicoctl get felixconfiguration -o yaml > cluster1-felix.yaml
KUBECONFIG=cluster-2.kubeconfig calicoctl get felixconfiguration -o yaml > cluster2-felix.yaml
diff cluster1-felix.yaml cluster2-felix.yaml
```

### Upgrade Compatibility

Before upgrading Calico, always check the release notes for breaking changes to resource specifications. Some fields may be deprecated, renamed, or have changed semantics between versions. Test upgrades in a staging environment that mirrors your production Calico configuration.

```bash
# Check current Calico version
calicoctl version

# Review installed CRD versions
kubectl get crds | grep projectcalico | awk '{print $1, $2}'
```

### Security Hardening

Apply the principle of least privilege to Calico configurations. Limit who can modify Calico resources using Kubernetes RBAC, and audit changes using the Kubernetes audit log. Consider using admission webhooks to validate Calico resource changes before they are applied.

```bash
# Check who has permissions to modify Calico resources
kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org --all-namespaces --list

# Review recent changes to Calico resources (if audit logging is enabled)
kubectl get events -n calico-system --sort-by='.lastTimestamp' | tail -20
```

### Capacity Planning for Large Deployments

For clusters with hundreds of nodes or thousands of pods, plan your Calico resource configurations carefully. Monitor resource consumption of calico-node and calico-typha pods, and scale Typha replicas based on the number of Felix instances. Use the Calico metrics endpoint to track IPAM utilization and plan IP pool expansions before reaching capacity limits.

```bash
# Monitor IPAM utilization
calicoctl ipam show

# Check calico-node resource consumption
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=memory
```

## Conclusion

Systematic diagnosis of CIDRNotAvailable errors requires checking the error scope, investigating the relevant Calico and Kubernetes components, and collecting enough data to identify the root cause confidently. With the cause identified, you can proceed to apply a targeted fix rather than applying broad changes that may introduce new issues.
