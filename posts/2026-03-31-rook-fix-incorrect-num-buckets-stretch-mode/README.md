# How to Fix INCORRECT_NUM_BUCKETS_STRETCH_MODE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Stretch Mode, Health Check, CRUSH

Description: Learn how to fix INCORRECT_NUM_BUCKETS_STRETCH_MODE in Ceph, a warning that stretch mode is misconfigured with an incorrect number of CRUSH buckets.

---

## What Is INCORRECT_NUM_BUCKETS_STRETCH_MODE?

`INCORRECT_NUM_BUCKETS_STRETCH_MODE` is a Ceph health warning that fires when the cluster is operating in stretch mode (designed for two-datacenter deployments with a tiebreaker site) but the number of CRUSH buckets does not match what stretch mode requires.

Stretch mode requires exactly 2 data site CRUSH buckets plus an optional tiebreaker bucket. If additional buckets are present or the count is wrong, this warning appears.

## Understanding Stretch Mode

Stretch mode is a Ceph feature for deploying across exactly 2 geographically separated data centers with a tiebreaker monitor. The CRUSH map must have exactly 2 `datacenter` (or equivalent) buckets, each containing OSDs from their respective site.

```text
root
├── datacenter-A (site 1 OSDs)
├── datacenter-B (site 2 OSDs)
└── tiebreaker (no OSDs, just a monitor)
```

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] INCORRECT_NUM_BUCKETS_STRETCH_MODE: Incorrect number of buckets in stretch mode
    Expected 2 data site buckets, found 3
```

Check stretch mode configuration:

```bash
ceph mon dump | grep stretch
ceph osd crush tree
```

Check the current stretch mode settings:

```bash
ceph osd dump | grep stretch
```

## Fix Steps

### Step 1 - Audit the CRUSH Map

Export and inspect the CRUSH map:

```bash
ceph osd getcrushmap -o /tmp/crushmap.bin
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
cat /tmp/crushmap.txt
```

Identify extra or incorrectly named buckets.

### Step 2 - Remove Extra Buckets

If there is an extra datacenter bucket that should not be in stretch mode:

```bash
ceph osd crush remove <extra-bucket-name>
```

### Step 3 - Verify OSD Placement

Ensure all OSDs are assigned to either datacenter-A or datacenter-B:

```bash
ceph osd tree
```

Move an OSD to the correct bucket if misplaced:

```bash
ceph osd crush move osd.5 datacenter=datacenter-A host=node-a1
```

### Step 4 - Verify Stretch Mode Configuration

Stretch mode is irreversible once enabled and cannot be disabled. If stretch mode has not yet been enabled and you are setting it up for the first time, ensure the CRUSH map is correct first, then enable it with the correct parameters:

```bash
ceph mon enable_stretch_mode <tiebreaker-mon> <stretch_crush_rule> datacenter
```

For example:

```bash
ceph mon enable_stretch_mode mon.e stretch_rule datacenter
```

If stretch mode is already enabled, fixing the CRUSH map (Steps 1–3) should resolve the warning without needing to re-enable it.

### Step 5 - Verify Stretch Mode Status

```bash
ceph mon dump | grep stretch
ceph osd dump | grep -E "stretch|tiebreaker"
```

## Rook Stretch Mode Configuration

In Rook, stretch mode is configured via the `CephCluster` CR:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  mon:
    count: 5
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
      - name: zone-a
        arbiter: false
      - name: zone-b
        arbiter: false
      - name: zone-c
        arbiter: true
```

## Summary

`INCORRECT_NUM_BUCKETS_STRETCH_MODE` indicates the CRUSH map has the wrong number of site buckets for stretch mode operation. Fix it by auditing the CRUSH map, removing extra buckets or reassigning OSDs to the correct datacenter buckets, and verifying stretch mode is enabled with the correct tiebreaker configuration. Stretch mode requires exactly 2 data site buckets.
