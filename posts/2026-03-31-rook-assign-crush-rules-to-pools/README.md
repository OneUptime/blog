# How to Assign CRUSH Rules to Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Rule, Storage

Description: Learn how to assign and change CRUSH rules on Ceph pools to control data placement across failure domains, device classes, and custom topology hierarchies.

---

## Why Assign CRUSH Rules to Pools

Each Ceph pool has exactly one CRUSH rule that governs where data is stored. The rule determines which failure domain (host, rack, datacenter) replicas are spread across and, optionally, which device class (hdd, ssd, nvme) is used. Assigning the correct CRUSH rule to a pool is essential for achieving the desired fault tolerance and performance characteristics.

## Listing Available CRUSH Rules

```bash
# List all CRUSH rules by name
ceph osd crush rule ls

# Get detailed configuration of all rules
ceph osd crush rule dump

# Show a specific rule
ceph osd crush rule dump replicated_rule
```

## Checking a Pool's Current CRUSH Rule

```bash
# Get the crush_rule setting for a pool
ceph osd pool get mypool crush_rule

# Show all pool settings including crush_rule
ceph osd pool get mypool all

# View crush_rule for all pools at once
ceph osd dump | grep -E "pool|crush_rule"
```

## Assigning a CRUSH Rule at Pool Creation

```bash
# Create a pool using a specific CRUSH rule
ceph osd pool create mypool 128 128 replicated rack-rule

# Create an erasure coded pool with a specific erasure code profile
ceph osd pool create ec-pool 128 128 erasure ec-4-2-profile

# Verify the rule was applied
ceph osd pool get mypool crush_rule
```

## Changing the CRUSH Rule on an Existing Pool

```bash
# Change the CRUSH rule on a running pool
# WARNING: This triggers data migration as PGs are remapped
ceph osd pool set mypool crush_rule ssd-rule

# Confirm the change
ceph osd pool get mypool crush_rule

# Monitor rebalancing triggered by the rule change
watch -n 5 ceph -s
```

## Practical Rule Assignment Examples

```bash
# Pool for critical databases on NVMe
ceph osd crush rule create-replicated nvme-rule default host nvme
ceph osd pool set databases crush_rule nvme-rule

# Pool for backups on HDD across racks
ceph osd crush rule create-replicated hdd-rack-rule default rack hdd
ceph osd pool set backups crush_rule hdd-rack-rule

# Pool spread across datacenters
ceph osd crush rule create-replicated dc-rule default datacenter
ceph osd pool set critical-data crush_rule dc-rule
```

## Assigning Rules in Rook

In Rook, the CRUSH rule is determined by the pool spec. Rook creates or selects the appropriate rule based on `failureDomain` and `deviceClass`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-block-pool
  namespace: rook-ceph
spec:
  failureDomain: rack    # corresponds to CRUSH rule type
  deviceClass: ssd       # targets shadow hierarchy for SSDs
  replicated:
    size: 3
```

Rook automatically creates a rule like `ssd-block-pool` with `step take default class ssd` and `chooseleaf firstn 0 type rack`.

## Verifying Data Placement After Rule Assignment

```bash
# Map an object to see which OSDs handle it
ceph osd map mypool testobject

# Verify those OSDs are in the expected failure domains
for osd in 2 5 8; do
  ceph osd find osd.$osd
done

# Check PG distribution across OSDs
ceph pg dump | grep mypool
```

## Summary

CRUSH rules are assigned to pools at creation time via `ceph osd pool create` or updated with `ceph osd pool set mypool crush_rule`. Each rule change triggers data migration as PGs are remapped to match the new placement policy. In Rook, use the `failureDomain` and `deviceClass` fields in pool specs to have Rook manage rule creation and assignment automatically.
