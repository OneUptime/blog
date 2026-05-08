# Fixing CIDRNotAvailable Errors in Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Troubleshooting

Description: Concrete steps to resolve CIDRNotAvailable errors in Kubernetes clusters running Calico and kubeadm, with commands you can apply immediately.

---

## Introduction

CIDRNotAvailable events are emitted by Kubernetes when the node CIDR allocator cannot allocate a pod CIDR for a node. In clusters using Calico IPAM, Calico does not use Kubernetes `Node.spec.podCIDR` allocations for pod IP assignment, so the event usually points to kube-controller-manager node CIDR allocation settings rather than Calico directly. Calico IPPool mismatches or exhaustion can still cause pod IP allocation and connectivity problems, and should be checked alongside the kubeadm pod CIDR.

This guide provides concrete fix procedures for CIDRNotAvailable errors. Each step includes the exact commands to run, with explanations of what each command does and why it resolves the issue.

Before applying fixes, ensure you have completed a proper diagnosis. Applying fixes without understanding the root cause can make the situation worse.

## Prerequisites

- A Kubernetes cluster experiencing CIDRNotAvailable errors
- `kubectl` with cluster-admin privileges
- `calicoctl` installed and configured
- A backup of your current Calico configuration

## Backup Current Configuration

Before making any changes, backup your existing Calico configuration:

```bash
calicoctl get ippools -o yaml > backup-ippools.yaml
calicoctl get felixconfiguration -o yaml > backup-felix.yaml
calicoctl get bgpconfigurations -o yaml > backup-bgp.yaml
calicoctl get nodes -o yaml > backup-nodes.yaml
```

## Step 1: Align the Pod CIDR

Check kubeadm's pod CIDR, the node CIDR allocator settings, and Calico's IPPool:

```bash
# Get kubeadm pod CIDR
kubectl get cm -n kube-system kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | grep podSubnet

# Check the running kube-controller-manager node CIDR settings
kubectl -n kube-system get pod -l component=kube-controller-manager -o yaml | grep -E -- '--allocate-node-cidrs|--cluster-cidr|--node-cidr-mask-size'

# Get Calico IPPool CIDR
calicoctl get ippool -o wide
```

If the node CIDR allocator is producing CIDRNotAvailable events in a Calico IPAM cluster, either configure kube-controller-manager with a large enough `--cluster-cidr` and appropriate `--node-cidr-mask-size`, or disable Kubernetes node CIDR allocation by setting `--allocate-node-cidrs=false`.

If the Calico IPPool does not fall within the Kubernetes cluster CIDR, migrate to a new Calico IPPool instead of changing the CIDR of an existing pool in place:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-ipv4-pool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f new-pool.yaml
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"disabled": true}}'
kubectl delete pod -A --all
calicoctl delete ippool default-ipv4-ippool
```

## Step 2: Expand the IP Pool if Exhausted

If Calico IPAM is exhausted, create an additional non-overlapping pool that is covered by the Kubernetes cluster CIDR and kube-proxy cluster CIDR configuration. This example assumes the cluster CIDR covers both `10.244.0.0/16` and `10.245.0.0/16`:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: additional-ipv4-pool
spec:
  cidr: 10.245.0.0/16
  blockSize: 26
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
```

```bash
calicoctl apply -f additional-pool.yaml
```

## Step 3: Clean Up Stale Block Affinities

Do not manually delete BlockAffinity resources. They are managed by Calico IPAM. If deleted nodes left stale Calico state behind, remove the stale Calico Node resource after confirming the host is no longer in service:

```bash
# List Calico nodes
calicoctl get nodes

# Remove the stale Calico node resource
calicoctl delete node <stale-node-name>
```

## Verification

After applying the fix, verify the error is resolved:

```bash
# Check for remaining errors
kubectl get events -A --field-selector type=Warning --sort-by='.lastTimestamp' | tail -20

# Verify all calico-node pods are running
kubectl get pods -n calico-system -l k8s-app=calico-node

# Test pod connectivity
kubectl run verify-fix --image=busybox --rm -it --restart=Never -- ping -c 3 <test-pod-ip>
```

## Troubleshooting

**Fix did not resolve the error:**
- Re-run the diagnostic steps to verify the root cause.
- Check if multiple issues are present simultaneously.
- Restore the backup and try an alternative approach.

**New errors appeared after the fix:**
- Compare current configuration with the backup to identify unintended changes.
- Roll back immediately if connectivity is broken.


## Best Practices for Future Updates

When making changes to fix networking issues in Calico, follow these operational guidelines:

1. **Always work from a backup.** Export the current state of all Calico resources before making any modification. This gives you a clean rollback point if the fix introduces new problems.

2. **Apply changes incrementally.** Rather than changing multiple Calico resources at once, modify one resource at a time and verify the impact before proceeding. This makes it easier to identify which change resolved the issue or caused a regression.

3. **Document every change.** Record the exact commands you ran, the timestamp, and the observed result. This documentation is invaluable for post-incident reviews and helps other team members understand what was done.

4. **Test connectivity after each change.** Use simple tools like `ping`, `wget`, and `nslookup` from test pods to verify that basic connectivity still works after each configuration change.

5. **Monitor Calico component health continuously.** After applying a fix, watch the calico-node pod logs and check for restarts for at least 15 minutes before declaring the issue resolved.

```bash
# Quick health check script to run after any fix
echo "=== Node Status ==="
kubectl get nodes
echo "=== Calico Pods ==="
kubectl get pods -n calico-system -o wide
echo "=== Recent Warnings ==="
kubectl get events -A --field-selector type=Warning --sort-by='.lastTimestamp' | tail -10
echo "=== IPAM Status ==="
calicoctl ipam show
```

If you frequently encounter this class of error, consider setting up automated canary tests that continuously verify pod connectivity and alert when failures are detected. Tools like Goldpinger or custom CronJobs can serve this purpose.


## Understanding the Root Cause

Before diving into the fix commands, it is worth understanding why this error occurs at a deeper level. Calico's architecture relies on several components working together: Felix for dataplane programming, the IPAM plugin for IP address management, and the CNI plugin for pod network setup. When any of these components encounters an inconsistency, errors propagate through the system.

The most reliable way to prevent recurring issues is to understand the interaction between these components. Felix watches for changes in the Calico datastore and programs the Linux kernel accordingly. If the datastore contains stale or conflicting data, Felix may program incorrect rules, leading to connectivity failures.

Similarly, the IPAM plugin allocates IP addresses based on the IPPool and BlockAffinity resources. If these resources are inconsistent with the actual state of pods in the cluster, you get IP conflicts or allocation failures.

Understanding this architecture helps you identify the correct fix more quickly and avoid applying changes that address symptoms rather than causes.

## Recovery Validation Checklist

After applying any fix, systematically verify each layer of the Calico stack:

```bash
# Layer 1: Calico system pods
kubectl get pods -n calico-system -o wide

# Layer 2: IPAM consistency
calicoctl ipam show --show-blocks

# Layer 3: Node-to-node connectivity
calicoctl node status

# Layer 4: Pod-to-pod connectivity
kubectl run fix-test --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=5 http://kubernetes.default.svc/healthz

# Layer 5: Application-level connectivity
kubectl get endpoints -A | grep "<none>" | head -10
```

Each layer depends on the previous one. If Layer 1 fails, do not proceed to testing Layer 2. Fix each layer in order to avoid chasing phantom issues caused by a lower-layer failure.

## Conclusion

CIDRNotAvailable errors in Calico and kubeadm are resolvable once you identify the root cause. Always backup your configuration before making changes, apply fixes methodically, and verify each step before proceeding to the next.
