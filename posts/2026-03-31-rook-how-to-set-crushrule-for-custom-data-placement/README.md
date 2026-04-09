# How to Set crush_rule for Custom Data Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Storage, Data Placement

Description: Create and apply custom CRUSH rules in Ceph to control data placement across failure domains like hosts, racks, or datacenters for precise redundancy control.

---

## What Is a CRUSH Rule

CRUSH (Controlled Replication Under Scalable Hashing) is Ceph's algorithm for determining where to store data. A CRUSH rule defines:
- Which part of the CRUSH hierarchy to use (e.g., the `default` root)
- What failure domain to use for replicas (e.g., `host`, `rack`, `datacenter`)
- Which device class to target (e.g., `ssd`, `hdd`)

By default, Ceph uses the `replicated_rule` which distributes replicas across different hosts. Custom rules let you target specific device classes (SSD vs HDD), specific racks, or custom failure domains.

## Step 1 - View Existing CRUSH Rules

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule ls
```

Output:

```text
replicated_rule
erasure-code
ssd-replicated
```

View details of a rule:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule dump replicated_rule
```

Output:

```json
{
    "rule_id": 0,
    "rule_name": "replicated_rule",
    "type": 1,
    "steps": [
        {"op": "take", "item": -1, "item_name": "default"},
        {"op": "chooseleaf_firstn", "num": 0, "type": "host"},
        {"op": "emit"}
    ]
}
```

## Step 2 - View the CRUSH Map Hierarchy

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Understand your hierarchy:

```text
ID  CLASS  WEIGHT  TYPE NAME
-1         12.000  root default
-3          4.000      host worker-1
 0    hdd   2.000          osd.0
 1    ssd   2.000          osd.1
-5          4.000      host worker-2
 2    hdd   2.000          osd.2
 3    ssd   2.000          osd.3
```

## Step 3 - Create a CRUSH Rule for a Specific Device Class

To create a rule that only uses SSD devices:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule create-replicated ssd-rule default host ssd
```

Parameters:
- `ssd-rule` - rule name
- `default` - CRUSH root to use
- `host` - failure domain type
- `ssd` - device class filter

Create an HDD-only rule:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule create-replicated hdd-rule default host hdd
```

## Step 4 - Create a Custom CRUSH Map Rule

For advanced placement, edit the CRUSH map directly:

```bash
# Get and decompile the current CRUSH map inside the tools pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c \
  "ceph osd getcrushmap -o /tmp/crushmap.bin && crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt"

# Copy the decompiled text file locally for editing
TOOLS_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools -o jsonpath='{.items[0].metadata.name}')
kubectl cp rook-ceph/$TOOLS_POD:/tmp/crushmap.txt ./crushmap.txt
```

Edit `crushmap.txt` to add a new rule:

```text
rule rack-replicated {
    id 5
    type replicated
    min_size 1
    max_size 10
    step take default
    step chooseleaf firstn 0 type rack
    step emit
}
```

Recompile and inject:

```bash
# Copy the edited file back to the pod and recompile/inject
kubectl cp ./crushmap.txt rook-ceph/$TOOLS_POD:/tmp/crushmap.txt
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c \
  "crushtool -c /tmp/crushmap.txt -o /tmp/new-crushmap.bin && ceph osd setcrushmap -i /tmp/new-crushmap.bin"
```

## Step 5 - Apply a CRUSH Rule to a Pool

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> crush_rule ssd-rule
```

Verify:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool get <pool-name> crush_rule
```

Output:

```text
crush_rule: ssd-rule
```

## Step 6 - Configure CRUSH Rule in Rook CRD

For a `CephBlockPool`, specify the CRUSH rule directly:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: ssd
```

Using `deviceClass: ssd` automatically creates and applies an appropriate CRUSH rule.

Or use `crushRoot` for more control:

```yaml
spec:
  replicated:
    size: 3
    replicasPerFailureDomain: 1
    targetSizeRatio: 0.5
  crushRoot: custom-root
```

## Step 7 - Verify Data Placement

After setting a custom CRUSH rule, verify data is being placed on the correct OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg ls-by-pool <pool-name>
```

This shows each PG in the pool along with its UP and ACTING OSD sets. Verify the acting OSDs are of the expected device class.

## Summary

CRUSH rules in Ceph govern data placement across the storage hierarchy. Create device-class-specific rules with `ceph osd crush rule create-replicated` to target SSDs or HDDs, or edit the CRUSH map directly for advanced rack or datacenter-level failure domain placement. Apply rules to pools with `ceph osd pool set crush_rule`, or declare them in Rook's `CephBlockPool` CRD using `deviceClass` for automatic rule creation.
