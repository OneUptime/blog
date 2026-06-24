# How to Use CRUSH MSR Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Rule, Storage

Description: Learn how to use Ceph CRUSH Multi-Step Replication (MSR) rules to implement complex multi-level placement strategies for advanced topology requirements.

---

## What are CRUSH Multi-Step Rules

CRUSH multi-step rules allow you to define complex placement policies that go beyond single-level chooseleaf operations. These rules use multiple `take...chooseleaf...emit` sequences to place replicas across different parts of the CRUSH hierarchy, enabling sophisticated strategies like "2 replicas in datacenter A and 1 replica in datacenter B" or "primary on SSD, secondaries on HDD."

Note: These multi-step rules should not be confused with the Ceph CRUSH MSR (Multi-Step Retry) algorithm, which is a different feature that uses `choosemsr` steps for retry logic on failed OSDs.

Multi-step rules are type `replicated` rules that use multiple `take...emit` sequences to achieve multi-level selection.

## Basic Multi-Step Rule Structure

A multi-step rule in the CRUSH map uses a sequence of `take`, `chooseleaf`, and `emit` steps:

```text
rule msr-two-plus-one {
    id 10
    type replicated
    step take default
    step choose firstn 2 type datacenter
    step chooseleaf firstn 1 type host
    step emit
    step take default
    step choose firstn 1 type datacenter
    step chooseleaf firstn 1 type host
    step emit
}
```

The multiple `take...chooseleaf...emit` sequences are the key to multi-step rules. The first sequence selects 2 datacenters and picks one host from each (2 replicas). The second sequence selects 1 datacenter and picks one host (1 replica), for a total of 3 replicas. For guaranteed datacenter separation, use named CRUSH buckets as shown in the stretched cluster example below.

## Step-by-Step Rule Construction

Each step in a CRUSH rule narrows the selection:

```bash
# Export and decompile the CRUSH map
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
```

Add to `crush.txt`:

```text
rule primary-ssd-secondary-hdd {
    id 11
    type replicated
    step take default class ssd
    step chooseleaf firstn 1 type host
    step emit
    step take default class hdd
    step chooseleaf firstn 2 type host
    step emit
}
```

This places the primary replica on an SSD OSD and two secondary replicas on HDD OSDs.

```bash
crushtool -c crush.txt -o crush-new.bin

# Test the rule behavior
crushtool -i crush-new.bin --test \
  --rule 11 --num-rep 3 \
  --min-x 0 --max-x 100 \
  --show-statistics
```

## Multi-Step Rules for Stretched Clusters

A common use case is a 2+1 stretched cluster rule:

```text
rule stretched-2-1 {
    id 12
    type replicated
    # Place 2 replicas in primary datacenter
    step take dc-primary
    step chooseleaf firstn 2 type host
    step emit
    # Place 1 replica in secondary datacenter
    step take dc-secondary
    step chooseleaf firstn 1 type host
    step emit
}
```

## Applying Multi-Step Rules to Pools

```bash
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin

# Apply to a pool
ceph osd pool set critical-pool crush_rule stretched-2-1

# Verify rule assignment
ceph osd pool get critical-pool crush_rule

# Check PG placement
ceph osd map critical-pool testobject
```

## Testing Multi-Step Rule Distribution

```bash
# Simulate placement and review statistics
crushtool -i crush-new.bin \
  --test --rule 12 \
  --num-rep 3 \
  --min-x 0 --max-x 10000 \
  --show-statistics 2>&1 | tail -20

# Verify each replica lands in the correct datacenter
# The output shows which OSDs handle each PG
```

## Summary

CRUSH multi-step rules enable sophisticated multi-level placement strategies by using multiple `take...chooseleaf...emit` sequences within a single rule. Common use cases include placing replicas across different device classes (SSD primary, HDD secondaries) or across specific CRUSH roots (primary datacenter plus secondary datacenter). Always test multi-step rules with `crushtool --test` before applying them to production pools to verify the intended distribution behavior.
