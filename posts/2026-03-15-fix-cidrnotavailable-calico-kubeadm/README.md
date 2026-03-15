# How to Fix CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Troubleshooting, Fix

Description: Practical remediation steps for resolving CIDRNotAvailable errors in Calico-based Kubernetes clusters provisioned with kubeadm.

---

## Introduction

Once you have diagnosed a CIDRNotAvailable error in your Calico and kubeadm environment, the next step is to apply the correct fix. The remediation depends on the root cause: a CIDR mismatch between kubeadm and Calico, IP address exhaustion within the configured range, missing node CIDR assignments, or stale IPAM block allocations.

Each of these causes requires a different fix, and some fixes carry risks if applied incorrectly. This guide provides step-by-step instructions for each scenario, along with safety checks to minimize the impact on running workloads.

This guide assumes you have already completed the diagnostic process and identified the root cause.

## Prerequisites

- Kubernetes cluster provisioned with kubeadm
- Calico installed as the CNI plugin
- `kubectl` and `calicoctl` CLI tools installed
- Cluster-admin access
- Maintenance window for disruptive changes
- Backup of Calico IPAM state

## Fix 1: Correcting a CIDR Mismatch

If the Calico IPPool CIDR does not match the kubeadm pod network CIDR, align them:

```bash
# Check current kubeadm pod CIDR
KUBEADM_CIDR=$(kubectl get configmap -n kube-system kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | grep podSubnet | awk '{print $2}')
echo "kubeadm CIDR: $KUBEADM_CIDR"

# Check current Calico IPPool
calicoctl get ippools -o wide
```

Create a new IPPool matching the kubeadm CIDR:

```yaml
# new-ippool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

Apply the corrected IPPool:

```bash
# Delete the incorrect IPPool (only if no pods are using IPs from it)
calicoctl delete ippool <old-pool-name>

# Apply the corrected IPPool
calicoctl apply -f new-ippool.yaml

# Verify the new pool
calicoctl get ippools -o wide
```

## Fix 2: Expanding an Exhausted CIDR Range

If the pod CIDR is exhausted, add a new IPPool with additional address space:

```bash
# Check current utilization
calicoctl ipam show
```

Add a supplementary IPPool:

```yaml
# additional-ippool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: additional-ipv4-pool
spec:
  cidr: 10.245.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

```bash
# Apply the additional pool
calicoctl apply -f additional-ippool.yaml

# Verify both pools are active
calicoctl get ippools -o wide
calicoctl ipam show
```

## Fix 3: Assigning Missing Node CIDRs

If nodes are missing pod CIDR assignments, verify the kube-controller-manager configuration:

```bash
# Check controller-manager flags
kubectl get pod -n kube-system -l component=kube-controller-manager -o yaml | grep -E "cluster-cidr|allocate-node-cidrs|node-cidr-mask"
```

If `--allocate-node-cidrs=true` is not set, update the kube-controller-manager manifest:

```bash
# Edit the static pod manifest (on the control plane node)
# Add or verify these flags:
# --allocate-node-cidrs=true
# --cluster-cidr=10.244.0.0/16
# --node-cidr-mask-size=24
```

After the controller-manager restarts, verify nodes receive CIDR assignments:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR
```

## Fix 4: Cleaning Up Stale IPAM Blocks

If IPAM blocks are allocated to nodes that no longer exist:

```bash
# Show all block allocations
calicoctl ipam show --show-blocks

# Check for blocks assigned to non-existent nodes
ACTIVE_NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')
calicoctl ipam show --show-blocks | while read line; do
  echo "$line"
done
```

Release orphaned IPAM handles:

```bash
# Check IPAM status for leaked addresses
calicoctl ipam check

# Release specific handles if needed (use with caution)
calicoctl ipam release --ip=<leaked-ip>
```

## Fix 5: Adjusting Block Size

If the default block size is too large for your cluster topology:

```bash
# Check current block size
calicoctl get ippools -o yaml | grep blockSize
```

A smaller block size allows more nodes to receive allocations from the same CIDR but increases the number of routes:

```bash
# Update the IPPool block size (requires recreating the pool)
# WARNING: This is disruptive - schedule during a maintenance window
calicoctl get ippool default-ipv4-ippool -o yaml > ippool-backup.yaml

# Modify the blockSize in the YAML (e.g., from 26 to 28)
# Then delete and recreate
calicoctl delete ippool default-ipv4-ippool
calicoctl apply -f ippool-modified.yaml
```

## Verification

After applying the fix, verify the issue is resolved:

```bash
# Verify IPAM is healthy
calicoctl ipam show

# Check that new pods can be created
kubectl run test-pod --image=busybox --command -- sleep 3600
kubectl get pod test-pod -o wide

# Verify the test pod has an IP from the correct range
kubectl get pod test-pod -o jsonpath='{.status.podIP}'

# Clean up
kubectl delete pod test-pod

# Verify no pending pods remain
kubectl get pods --all-namespaces --field-selector=status.phase=Pending
```

## Troubleshooting

**Pods still failing after fix**: Restart the calico-node DaemonSet to force Felix to re-sync with the updated IPAM configuration.

```bash
kubectl rollout restart daemonset calico-node -n calico-system
```

**New IPPool not being used**: Ensure the new IPPool's `nodeSelector` matches your nodes and that it is not disabled.

**CIDR change not reflected on existing nodes**: Existing node CIDR assignments are immutable in Kubernetes. Nodes provisioned before the CIDR change will keep their old assignment. Cordon, drain, and rejoin the node if necessary.

## Conclusion

Fixing CIDRNotAvailable errors requires matching the remediation to the root cause. Whether the issue is a CIDR mismatch, address exhaustion, missing node allocations, or stale IPAM data, each fix has specific steps and risk considerations. Always verify the fix by creating test pods and checking IPAM utilization after applying changes. For disruptive changes like IPPool recreation or block size adjustments, use maintenance windows and ensure you have backups of your IPAM state.
