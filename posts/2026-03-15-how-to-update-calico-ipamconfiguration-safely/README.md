# How to Update the Calico IPAMConfiguration Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAMConfiguration, Kubernetes, IP Address Management, Change Management

Description: Safely update Calico IPAMConfiguration resources without disrupting pod IP allocation or causing network outages.

---

## Introduction

Updating the Calico IPAMConfiguration resource changes how IP addresses are allocated cluster-wide. Unlike policy changes that affect traffic flow, IPAM configuration changes affect whether pods can receive IP addresses at all. A wrong configuration can leave new pods stuck in Pending state or cause IP conflicts.

The IPAMConfiguration resource has a single valid name, "default", so all changes modify the same global configuration. Changes take effect gradually as Calico nodes re-sync, and existing pod IPs are not affected. However, new pods and rescheduled pods will use the updated allocation behavior.

This guide covers safe procedures for updating IPAM configuration, including switching affinity modes, adjusting block limits, and handling the transition period.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Understanding of current IPAM state and block allocations

## Backing Up Current Configuration

Export the current IPAM configuration and block state:

```bash
calicoctl get ipamconfiguration default -o yaml > ipam-backup.yaml
calicoctl ipam show --show-blocks > ipam-blocks-snapshot.txt
```

Record current IP pool utilization:

```bash
calicoctl ipam show > ipam-utilization.txt
```

## Switching from Relaxed to Strict Affinity

This is the most common IPAM update. Before switching, verify that no pods are using IPs borrowed from other nodes:

```bash
calicoctl ipam show --show-borrowed
```

If borrowed IPs exist, drain the affected pods first so they get new IPs from local blocks:

```bash
kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data
kubectl uncordon worker-3
```

Apply the strict affinity configuration:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 10
```

```bash
calicoctl replace -f ipam-strict.yaml
```

## Adjusting maxBlocksPerHost

Changing the block limit affects future allocations. Existing blocks beyond the new limit are not reclaimed automatically:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 6
```

```bash
calicoctl replace -f ipam-adjusted-blocks.yaml
```

Verify the change is active:

```bash
calicoctl get ipamconfiguration default -o yaml
```

## Switching from Strict to Relaxed Affinity

Switching back to relaxed affinity is generally safe since it only loosens restrictions:

```yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: false
  maxBlocksPerHost: 0
```

```bash
calicoctl replace -f ipam-relaxed.yaml
```

## Performing Changes During a Maintenance Window

For production clusters, coordinate IPAM changes with a maintenance window:

```bash
# Step 1: Cordon all nodes to prevent new pod scheduling
kubectl cordon --all

# Step 2: Apply the IPAM change
calicoctl replace -f ipam-updated.yaml

# Step 3: Verify the change took effect
calicoctl get ipamconfiguration default -o yaml

# Step 4: Uncordon nodes one at a time and verify
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  kubectl uncordon $node
  echo "Uncordoned $node, verifying..."
  sleep 5
  kubectl run test-${node} --image=busybox --restart=Never --overrides="{\"spec\":{\"nodeName\":\"${node}\"}}" -- sleep 10
  kubectl get pod test-${node} -o jsonpath='{.status.podIP}'
  echo ""
  kubectl delete pod test-${node}
done
```

## Rolling Back Changes

If the update causes IP allocation failures, restore the backup:

```bash
calicoctl apply -f ipam-backup.yaml
```

Verify the rollback:

```bash
calicoctl get ipamconfiguration default -o yaml
```

Test that new pods get IPs:

```bash
kubectl run rollback-test --image=busybox --rm -it --restart=Never -- echo "IP allocation works"
```

## Verification

After the update, run a full verification:

```bash
calicoctl get ipamconfiguration default -o yaml
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Deploy a test pod on each node to verify IP allocation:

```bash
kubectl run verify-pod --image=busybox --restart=Never -- sleep 60
kubectl get pod verify-pod -o wide
kubectl delete pod verify-pod
```

## Troubleshooting

If pods remain in Pending state after the change, check for IPAM errors:

```bash
kubectl describe pod <pending-pod-name> | grep -A5 "Events:"
```

Check calico-node logs for allocation failures:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i "ipam\|allocation\|block"
```

If strict affinity is enabled and a node has no blocks with free IPs, no new pods can be scheduled there. Check:

```bash
calicoctl ipam show --show-blocks | grep <node-name>
```

Verify you are updating the resource named "default":

```bash
calicoctl get ipamconfiguration -o wide
```

## Conclusion

IPAM configuration updates require careful planning because they affect pod scheduling cluster-wide. Back up the current state before changes, drain nodes with borrowed IPs before enabling strict affinity, use maintenance windows for production changes, and verify IP allocation on every node after the update. Keep rollback manifests ready for immediate restoration if issues arise.
