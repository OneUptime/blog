# Troubleshoot CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, CNI Chaining, Migration, eBPF

Description: A practical guide to troubleshooting CNI chaining configurations with Cilium, covering common failure modes when chaining with AWS VPC CNI, Flannel, or other plugins.

---

## Introduction

CNI chaining allows Cilium to operate alongside another CNI plugin, with Cilium acting as a secondary plugin that adds network policy enforcement and observability without replacing the primary CNI's IP allocation. This mode is commonly used on Amazon EKS (chaining with AWS VPC CNI) or when a gradual migration from another CNI is needed.

While CNI chaining reduces migration risk, it introduces a new category of failure: mismatches between the primary CNI's output and Cilium's expectations. When the chain is misconfigured, pods may start with incorrect network configurations, network policy may not be enforced, or pods may fail to start entirely.

This guide covers the most common CNI chaining failure modes and how to diagnose and resolve them.

## Prerequisites

- `kubectl` access to the cluster
- Understanding of which CNI is your primary (IP allocator)
- `cilium` CLI installed
- Access to node filesystems via SSH or `kubectl exec`

## Step 1: Verify the CNI Chain Configuration File

The CNI chain is defined in a conflist file in `/etc/cni/net.d/`. The order of plugins in this file determines execution order. Misconfigured or missing entries are the leading cause of chaining failures.

Inspect the CNI conflist on a node:

```bash
# View the CNI configuration files on the node
ls -la /etc/cni/net.d/

# Read the active conflist (Cilium creates 05-cilium.conflist or similar)
cat /etc/cni/net.d/05-cilium.conflist

# For AWS VPC CNI chaining, the conflist should include both aws-cni and cilium
# Example of a correct chain entry order: aws-cni first, then cilium
```

A correct AWS VPC CNI + Cilium chain conflist looks like this:

```json
{
  "name": "aws-cni-chain",
  "cniVersion": "0.4.0",
  "plugins": [
    {
      "name": "aws-cni",
      "type": "aws-cni",
      "vethPrefix": "eni"
    },
    {
      "name": "cilium-cni",
      "type": "cilium-cni"
    }
  ]
}
```

## Step 2: Check Cilium Configuration for Chaining Mode

Cilium must be explicitly told which CNI it is chaining with. Without this, it may try to manage IP allocation itself and conflict with the primary CNI.

Verify the Cilium ConfigMap for chaining settings:

```bash
# Inspect the Cilium configuration for the chaining mode setting
kubectl -n kube-system get configmap cilium-config -o yaml | grep -E "(cni-chaining|tunnel)"

# For AWS VPC CNI, the chaining-mode should be "aws-cni"
# For generic chaining, it should be "generic-veth"
kubectl -n kube-system get configmap cilium-config -o yaml | grep "cni-chaining-mode"
```

If `cni-chaining-mode` is missing or incorrect, patch the ConfigMap and restart Cilium:

```bash
# Update the Cilium Helm release to set the correct chaining mode
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set cni.chainingMode=aws-cni \
  --set tunnel=disabled
```

## Step 3: Diagnose Pod Startup Failures in Chained Mode

When CNI chaining is misconfigured, pods fail to start with network errors in kubelet logs. These errors indicate where in the chain the failure occurred.

Extract pod network failure details:

```bash
# Check kubelet logs for CNI errors on a specific node
kubectl get events --field-selector reason=FailedCreatePodSandBox -A

# On the node, check kubelet logs directly for CNI execution errors
journalctl -u kubelet --since "10 minutes ago" | grep -E "(CNI|cni|network)"

# Check if Cilium's CNI binary is present on the node
ls -la /opt/cni/bin/cilium-cni
```

## Step 4: Validate End-to-End Connectivity in Chained Mode

After fixing the chain configuration, validate that Cilium is correctly enforcing policy while the primary CNI handles IP allocation.

Test connectivity and policy enforcement:

```bash
# Run Cilium connectivity test to verify chained mode works end-to-end
cilium connectivity test

# Verify that Cilium endpoints are being created for new pods
kubectl -n kube-system exec -it ds/cilium -- cilium endpoint list

# Confirm that Cilium is in chaining mode (not managing IPs)
kubectl -n kube-system exec -it ds/cilium -- cilium status | grep -i "ipam"
```

## Best Practices

- Use `cni-chaining-mode: aws-cni` and `tunnel: disabled` for EKS to avoid encapsulation overhead
- Ensure the CNI conflist file has a consistent name prefix to guarantee correct loading order
- When upgrading either CNI in a chain, upgrade one at a time and test connectivity between upgrades
- Use `cilium monitor` to trace packet drops in chained mode - they appear as policy drops even if the primary CNI is the root cause
- Avoid chaining more than two CNI plugins; complexity increases disproportionately with each addition

## Conclusion

CNI chaining with Cilium provides a lower-risk path for adding Cilium's security and observability features without replacing an existing CNI. When chaining fails, the root cause is almost always in the conflist configuration, the Cilium chaining mode setting, or a version mismatch between the plugins. Systematic inspection of these three areas resolves the vast majority of chaining issues.
