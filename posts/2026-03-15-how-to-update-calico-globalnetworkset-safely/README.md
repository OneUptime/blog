# How to Update the Calico GlobalNetworkSet Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GlobalNetworkSet, Kubernetes, Network Security, Change Management

Description: Safely update Calico GlobalNetworkSet resources without disrupting existing network policies or breaking connectivity.

---

## Introduction

Updating a Calico GlobalNetworkSet changes which IP addresses are matched by every policy that references it. A careless update can block legitimate traffic or open access to unauthorized networks. Because GlobalNetworkSets are cluster-scoped and shared across policies, changes have wide-reaching effects.

Safe updates require understanding which policies reference the set, validating the new IP ranges, and testing in a controlled manner. Calico applies GlobalNetworkSet changes immediately, so there is no built-in staging mechanism.

This guide covers safe update workflows including pre-change auditing, incremental modifications, rollback strategies, and automated validation.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- An existing GlobalNetworkSet resource to update

## Auditing Before Changes

Before modifying a GlobalNetworkSet, identify every policy that references it. Export the current state:

```bash
calicoctl get globalnetworkset trusted-partners -o yaml > trusted-partners-backup.yaml
```

Find all policies that reference the set by its labels:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -B5 "role == 'trusted-external'"
```

Document the current nets:

```bash
calicoctl get globalnetworkset trusted-partners -o yaml | grep -A50 "nets:"
```

## Adding New CIDRs Incrementally

Retrieve the current resource, add new entries, and apply:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: trusted-partners
  labels:
    role: trusted-external
spec:
  nets:
    - 203.0.113.0/24
    - 198.51.100.0/24
    - 192.0.2.50/32
    - 198.51.200.0/24
```

```bash
calicoctl apply -f trusted-partners-updated.yaml
```

## Removing CIDRs Safely

When removing an IP range, first verify no active workloads depend on connectivity to that range:

```bash
kubectl run connectivity-test --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=5 http://198.51.100.10/health
```

If the test shows active use, coordinate with the application team before removal. To proceed, apply the updated manifest without the removed CIDR:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: trusted-partners
  labels:
    role: trusted-external
spec:
  nets:
    - 203.0.113.0/24
    - 192.0.2.50/32
    - 198.51.200.0/24
```

```bash
calicoctl apply -f trusted-partners-reduced.yaml
```

## Using Replace for Atomic Updates

The `calicoctl replace` command performs an atomic update and fails if the resource does not exist, preventing accidental creation:

```bash
calicoctl replace -f trusted-partners-updated.yaml
```

This is safer than `calicoctl apply` for updates because it will error out if the resource name is misspelled.

## Rolling Back Changes

If the update causes connectivity issues, restore from the backup:

```bash
calicoctl apply -f trusted-partners-backup.yaml
```

Verify the rollback:

```bash
calicoctl get globalnetworkset trusted-partners -o yaml
```

## Verification

After applying changes, confirm the update:

```bash
calicoctl get globalnetworkset trusted-partners -o yaml | grep -A20 "nets:"
```

Test connectivity to the newly added CIDRs:

```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=3 http://198.51.200.10/
```

Verify that removed CIDRs are no longer reachable (if behind a deny policy):

```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=3 http://198.51.100.10/
```

## Troubleshooting

If changes are not taking effect, check the Felix sync status:

```bash
kubectl exec -n calico-system -it $(kubectl get pod -n calico-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- calico-node -felix-live
```

Verify the resource was actually updated:

```bash
calicoctl get globalnetworkset trusted-partners -o yaml
```

If `calicoctl replace` fails with a not found error, the resource name may have a typo. List all sets:

```bash
calicoctl get globalnetworkset -o wide
```

Check Felix logs for errors processing the updated set:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=30 | grep -i "globalnetworkset"
```

## Conclusion

Updating GlobalNetworkSet resources requires care because changes propagate immediately to all referencing policies. Always back up before modifying, use `calicoctl replace` for atomic updates, test connectivity after changes, and keep rollback manifests available. Incremental modifications with validation at each step minimize the risk of outages.
