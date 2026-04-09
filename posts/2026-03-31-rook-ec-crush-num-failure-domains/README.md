# How to Configure crush-num-failure-domains in Erasure Coding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Erasure Coding, CRUSH, Storage

Description: Configure the crush-num-failure-domains parameter in Ceph erasure code profiles to control the total number of distinct failure domains used for chunk placement.

---

## What is crush-num-failure-domains

The `crush-num-failure-domains` parameter in a Ceph erasure code profile specifies the total number of distinct failure domain instances (hosts, racks, etc.) that the erasure coded chunks are spread across. When not set, it defaults to k+m (the total number of chunks in the erasure code).

This parameter becomes important when used in combination with `crush-osds-per-failure-domain` to control how chunks are distributed across your available infrastructure.

## Default Behavior Without the Parameter

Without specifying `crush-num-failure-domains`, Ceph defaults to placing each of the k+m chunks in a separate failure domain:

```bash
# Default: k=4, m=2 -> 6 failure domains (one per chunk)
ceph osd erasure-code-profile set ec-default k=4 m=2 crush-failure-domain=host

ceph osd erasure-code-profile get ec-default
# crush-num-failure-domains = 0 (means use k+m automatically)
```

## Explicitly Setting crush-num-failure-domains

Use this parameter when you want to control the number of failure domains independently of k+m:

```bash
# Place 6 chunks across 3 failure domains (2 chunks per domain)
ceph osd erasure-code-profile set ec-3host-profile \
  k=4 \
  m=2 \
  crush-failure-domain=host \
  crush-num-failure-domains=3 \
  crush-osds-per-failure-domain=2

# Verify
ceph osd erasure-code-profile get ec-3host-profile
```

This tells Ceph: "I need 6 total OSD slots, spread across 3 hosts, with 2 slots per host."

## Relationship Between Parameters

The relationship between parameters must satisfy:

```text
k + m <= crush-num-failure-domains * crush-osds-per-failure-domain

Example: 4 + 2 = 6 <= 3 * 2 = 6  (exact fit)
Example: 4 + 2 = 6 <= 6 * 1 = 6  (exact fit, default)
Example: 4 + 2 = 6 <= 4 * 2 = 8  (valid - 2 slots unused, some domains get fewer chunks)
Example: 4 + 2 = 6 >  2 * 2 = 4  (INVALID - not enough slots for all chunks)
```

```bash
# Verify consistency before creating a pool
# k=6, m=3, 3 domains, 3 per domain: 9 = 3*3 = 9 (ok)
ceph osd erasure-code-profile set ec-9chunk \
  k=6 \
  m=3 \
  crush-failure-domain=rack \
  crush-num-failure-domains=3 \
  crush-osds-per-failure-domain=3
```

## Practical Example: Rack-Level Failure Domain

For a cluster with 4 racks and a k=4, m=2 EC profile:

```bash
# Option 1: One chunk per rack (needs 6 racks)
ceph osd erasure-code-profile set ec-rack-6 \
  k=4 m=2 \
  crush-failure-domain=rack

# Option 2: Spread 6 chunks across 4 racks (uneven: some racks get 2, some get 1)
# MSR rules handle this automatically - 2 racks get 2 chunks, 2 racks get 1
ceph osd erasure-code-profile set ec-rack-4 \
  k=4 m=2 \
  crush-failure-domain=rack \
  crush-num-failure-domains=4 \
  crush-osds-per-failure-domain=2

# Option 3: Use only 3 racks with 2 chunks per rack
ceph osd erasure-code-profile set ec-rack-3 \
  k=4 m=2 \
  crush-failure-domain=rack \
  crush-num-failure-domains=3 \
  crush-osds-per-failure-domain=2
```

## Creating and Verifying a Pool

```bash
# Create a pool with the custom profile
ceph osd pool create ec-rack-pool erasure ec-rack-3

# Verify chunk placement
ceph osd map ec-rack-pool testobject

# Confirm failure domain spread
ceph pg dump pgs | grep "ec-rack-pool" | head -5
```

## Summary

`crush-num-failure-domains` explicitly sets the number of distinct failure domain instances (hosts/racks) that erasure coded chunks are distributed across. It must satisfy `k + m <= crush-num-failure-domains * crush-osds-per-failure-domain`. Use this parameter when you need to adapt an erasure coding configuration to a specific number of available hosts or racks without changing k and m values. Always verify that the resulting fault tolerance meets your requirements given the number of chunks per failure domain.
