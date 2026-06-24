# How to Fix STRETCH_MODE_BUCKET_WEIGHT_IMBALANCE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Stretch Mode, CRUSH, Health Check

Description: Learn how to resolve STRETCH_MODE_BUCKET_WEIGHT_IMBALANCE in Ceph, a warning that the two data site buckets in stretch mode have unequal CRUSH weights.

---

## What Is UNEVEN_WEIGHTS_STRETCH_MODE?

`UNEVEN_WEIGHTS_STRETCH_MODE` is a Ceph health warning that fires when the two data site CRUSH buckets in a stretch mode cluster have significantly different total weights. In stretch mode, Ceph expects both datacenters to have equal storage capacity so that data is evenly distributed between sites.

When the weights are unbalanced, one site stores more data than the other, which can lead to:
- Uneven disk utilization
- Incorrect failover behavior
- PGs not spreading evenly between sites

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] UNEVEN_WEIGHTS_STRETCH_MODE: Stretch mode buckets have uneven weights
    datacenter-A weight: 18.000, datacenter-B weight: 12.000
```

Check bucket weights in the CRUSH map:

```bash
ceph osd tree
ceph osd df
```

## Root Causes

- Unequal number of OSDs between sites
- OSDs of different sizes between sites
- OSDs reweighted differently between sites
- One site had OSD failures reducing effective weight

## Fix Options

### Option 1 - Add OSDs to the Lighter Site

The preferred fix is adding equal capacity to the lighter datacenter:

```bash
ceph osd tree | grep -E "datacenter|weight"
```

In Rook, add nodes to the underpowered zone:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    nodes:
    - name: "new-node-zone-b-01"
      deviceFilter: "^sd."
```

### Option 2 - Reweight OSDs to Balance Sites

You can artificially reweight OSDs in the heavier site to match the lighter site's total weight. This is a temporary workaround - it wastes capacity on the heavier site:

```bash
ceph osd reweight osd.1 0.8
ceph osd reweight osd.2 0.8
ceph osd reweight osd.3 0.8
```

Or use utilization-based reweighting:

```bash
ceph osd reweight-by-utilization
```

### Option 3 - Adjust CRUSH Weights

Manually set CRUSH weights to match between sites:

```bash
ceph osd crush reweight osd.10 2.0
ceph osd crush reweight osd.11 2.0
```

### Verify Balance

After adjustments, verify the site weights are equal:

```bash
ceph osd tree | grep datacenter
```

Both datacenter buckets should show equal `weight` values.

## Checking Stretch Mode Data Distribution

Verify PGs are evenly distributed between sites:

```bash
ceph pg dump | awk '{print $1, $14}' | head -20
```

## Monitoring

After fixing, confirm the warning clears:

```bash
ceph health
ceph -s
```

## Summary

`UNEVEN_WEIGHTS_STRETCH_MODE` warns that the two stretch mode data sites have unequal CRUSH weights, causing uneven data distribution. The best fix is adding matching capacity to the lighter site. As a temporary measure, you can reweight OSDs in the heavier site to match, though this wastes storage capacity. Stretch mode works best when both sites have identical hardware configurations.
