# How to Set crush_rule for Custom Data Placement in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Data Placement, Pool

Description: Learn how to create and assign custom CRUSH rules to Ceph pools for fine-grained data placement control, including tiered storage, rack awareness, and device class separation.

---

## What CRUSH Rules Do

CRUSH (Controlled Replication Under Scalable Hashing) rules define where Ceph places data replicas. By default, Ceph uses a single CRUSH rule that distributes data across hosts. Custom rules allow you to:

- Place hot data on SSDs and cold data on HDDs
- Enforce rack-level fault domains instead of host-level
- Restrict specific pools to specific nodes
- Separate different tenant data onto different hardware

## View Existing CRUSH Rules

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd crush rule ls
  ceph osd crush rule dump
"
```

Default rules include `replicated_rule` and possibly device-class-specific rules.

## Create a Custom CRUSH Rule via Rook

Define a custom failure domain in the CephBlockPool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  deviceClass: ssd        # Only use SSD-class OSDs
  replicated:
    size: 3
```

For rack-level fault domains:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rack-aware-pool
  namespace: rook-ceph
spec:
  failureDomain: rack     # Replicas spread across racks
  replicated:
    size: 3
```

## Create CRUSH Rules Manually

For more complex rules, create them via CLI and reference by name:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Create a rule that places data on SSD OSDs with host failure domain
  ceph osd crush rule create-replicated ssd-rule default host ssd

  # List to verify
  ceph osd crush rule ls
"
```

Then apply the rule to a pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool set my-pool crush_rule ssd-rule
"
```

## Set Up Device Classes

Ensure OSD device classes are correctly labeled. Ceph auto-detects ssd, hdd, and nvme:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # View current device classes
  ceph osd tree

  # Manually set device class if auto-detection is wrong
  ceph osd crush rm-device-class osd.5
  ceph osd crush set-device-class ssd osd.5
"
```

## Apply Crush Rule via Rook CRD Parameters

For pools that need a specific existing CRUSH rule name:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: custom-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    crush_rule: ssd-rule
```

## Verify Data Placement

After applying a CRUSH rule, verify PGs are placed correctly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Check which OSDs hold PGs for the pool
  ceph pg ls-by-pool custom-pool | head -10

  # Verify OSD device classes
  ceph osd tree class ssd
  ceph osd tree class hdd
"
```

## Test with CRUSH Calculator

Before applying rules to production pools, test placement with the CRUSH calculator:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # First extract the CRUSH map
  ceph osd getcrushmap -o /tmp/crushmap.bin

  # Find the rule ID for your rule
  ceph osd crush rule dump ssd-rule | grep rule_id

  # Simulate PG placements for the rule (use the numeric rule ID)
  crushtool --test -i /tmp/crushmap.bin \
    --rule 1 \
    --num-rep 3 \
    --show-utilization
"
```

## Summary

Custom CRUSH rules in Ceph enable precise control over data placement across hardware tiers, failure domains, and device classes. Rook's CephBlockPool CRD supports device class selection and failure domain configuration directly, while more complex rules created via CLI can be referenced by name through the `crush_rule` pool parameter. Verifying placement with `ceph pg dump` and the CRUSH calculator ensures rules work as intended before applying them to production workloads.
