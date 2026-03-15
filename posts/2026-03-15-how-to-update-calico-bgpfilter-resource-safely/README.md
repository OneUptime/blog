# How to Update the Calico BGPFilter Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, BGPFilter, Kubernetes, Networking, Operations, DevOps

Description: Safely update the Calico BGPFilter resource to modify route filtering rules without causing unintended route leaks or connectivity loss.

---

## Introduction

Updating BGPFilter resources requires careful planning because incorrect filter rules can either block legitimate routes (causing connectivity loss) or allow unintended routes (causing route leaks). Since filters are applied immediately upon update, there is no staging mechanism. A single mistake in rule ordering or CIDR matching can have immediate network impact.

The key risk factors when updating BGPFilter resources are rule ordering changes, CIDR range modifications, and action flips (changing Accept to Reject or vice versa). Each of these can disrupt established routing if not handled carefully.

This guide provides safe update procedures for common BGPFilter modification scenarios, including backup, validation, and rollback strategies.

## Prerequisites

- Kubernetes cluster with Calico and existing BGPFilter resources
- `calicoctl` and `kubectl` with cluster-admin access
- Current BGPFilter configurations backed up
- Understanding of which BGPPeer resources reference each filter

## Backing Up Current Filters

Before any changes, export all existing filters:

```bash
calicoctl get bgpfilter -o yaml > bgpfilter-backup-all.yaml
```

For a specific filter:

```bash
calicoctl get bgpfilter datacenter-filter -o yaml > bgpfilter-datacenter-backup.yaml
```

Also record which peers reference this filter:

```bash
calicoctl get bgppeer -o yaml | grep -A 5 "filters"
```

## Safe Update: Adding a New Allow Rule

Adding a new Accept rule before the catch-all Reject is non-disruptive. It only expands the set of allowed routes:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: datacenter-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Accept
      matchOperator: In
      cidr: 10.244.0.0/16
    - action: Accept
      matchOperator: In
      cidr: 198.51.100.0/24
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.0.0.0/8
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

```bash
calicoctl apply -f datacenter-filter-updated.yaml
```

## Safe Update: Removing an Allow Rule

Removing an Accept rule narrows the set of allowed routes. Verify no active services depend on the routes being removed:

```bash
# Check which routes are currently exchanged
calicoctl node status

# Verify no services use the CIDR being removed
kubectl get svc -A -o jsonpath='{range .items[*]}{.spec.clusterIP}{"\n"}{end}' | sort -u
```

Then remove the rule and apply:

```bash
calicoctl apply -f datacenter-filter-reduced.yaml
```

## Safe Update: Changing CIDR Ranges

When widening a CIDR (e.g., /24 to /16), you allow more routes. When narrowing (e.g., /16 to /24), you restrict routes. For narrowing changes, use a two-step approach:

Step 1: Add the new narrower rule while keeping the old one:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: datacenter-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/16
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

Step 2: After verifying traffic flows correctly with the narrower rule, remove the wider rule:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: datacenter-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/16
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

## Safe Update: Reordering Rules

Rule ordering matters because the first match wins. To safely reorder, first check if the new order changes the effective behavior by examining overlapping CIDRs:

```bash
# Review current filter
calicoctl get bgpfilter datacenter-filter -o yaml
```

If two rules have overlapping CIDRs with different actions, reordering them changes behavior. If they do not overlap, reordering is safe.

## Using the Patch Method for Small Changes

For minor updates, use calicoctl patch to avoid replacing the entire resource:

```bash
calicoctl patch bgpfilter datacenter-filter -p '{
  "spec": {
    "exportV4": [
      {"action": "Accept", "matchOperator": "In", "cidr": "10.96.0.0/12"},
      {"action": "Accept", "matchOperator": "In", "cidr": "10.244.0.0/16"},
      {"action": "Reject", "matchOperator": "In", "cidr": "0.0.0.0/0"}
    ]
  }
}'
```

## Verification

After every filter update:

```bash
# Confirm filter was updated
calicoctl get bgpfilter datacenter-filter -o yaml

# Check BGP sessions remain established
calicoctl node status

# Verify route exchange
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i "route\|filter\|accept\|reject"

# Test connectivity
kubectl run test --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=5 http://<service-ip>
```

## Troubleshooting

If connectivity breaks after a filter update:

- Restore the backup immediately: `calicoctl apply -f bgpfilter-datacenter-backup.yaml`
- Check if a catch-all Reject rule was placed before Allow rules
- Verify the filter name in BGPPeer references matches exactly
- Look for typos in CIDR notation: `calicoctl get bgpfilter datacenter-filter -o yaml`
- Check calico-node logs for filter application errors: `kubectl logs -n calico-system -l k8s-app=calico-node | grep -i error`

## Conclusion

Updating BGPFilter resources safely comes down to understanding rule ordering, backing up before changes, and verifying after each update. Adding Allow rules is generally safe, while removing rules or narrowing CIDRs requires verification that no active traffic depends on the routes being restricted. Always keep backups ready and use the two-step approach for potentially disruptive changes.
