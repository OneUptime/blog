# Fixing Duplicate IPv4 Address Errors in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Troubleshooting

Description: Concrete steps to resolve Duplicate IPv4 Address errors in Kubernetes clusters running Calico, with commands you can apply immediately.

---

## Introduction

Duplicate IPv4 address errors occur when Calico assigns the same IP address to multiple pods. This can happen due to race conditions in IPAM, split-brain scenarios in the datastore, or incorrect BlockAffinity resources.

This guide provides concrete fix procedures for Duplicate IPv4 Address errors. Each step includes the exact commands to run, with explanations of what each command does and why it resolves the issue.

Before applying fixes, ensure you have completed a proper diagnosis. Applying fixes without understanding the root cause can make the situation worse.

## Prerequisites

- A Kubernetes cluster experiencing Duplicate IPv4 Address errors
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

## Step 1: Identify the Conflicting Pods

```bash
# Find pods with duplicate IPs
kubectl get pods -A -o wide | sort -k7 | awk 'NR>1{if($7==prev) print prev_line"\n"$0; prev=$7; prev_line=$0}'
```

## Step 2: Delete the Conflicting Pods

```bash
kubectl delete pod <conflicting-pod> -n <namespace>
```

The pod will be recreated with a new, unique IP address.

## Step 3: Clean Up IPAM State

```bash
# Release orphaned IPs
calicoctl ipam release --ip=<duplicate-ip>

# Verify the release
calicoctl ipam show --ip=<duplicate-ip>
```

## Step 4: Enable Strict Affinity

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
```

```bash
calicoctl apply -f ipamconfig.yaml
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
calicoctl ipam check

# Layer 3: Node-to-node connectivity
calicoctl node status

# Layer 4: Pod-to-pod connectivity
kubectl run fix-test --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=5 http://kubernetes.default.svc/healthz

# Layer 5: Application-level connectivity
kubectl get endpoints -A | grep "<none>" | head -10
```

Each layer depends on the previous one. If Layer 1 fails, do not proceed to testing Layer 2. Fix each layer in order to avoid chasing phantom issues caused by a lower-layer failure.

## Conclusion

Duplicate IPv4 Address errors in Calico are resolvable once you identify the root cause. Always backup your configuration before making changes, apply fixes methodically, and verify each step before proceeding to the next.
