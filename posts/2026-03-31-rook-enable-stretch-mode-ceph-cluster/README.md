# How to Enable Stretch Mode for a Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Mode, Configuration, High Availability

Description: Step-by-step guide to enabling stretch mode on a Ceph cluster across two sites with an arbiter monitor for site-level fault tolerance.

---

## Prerequisites

Before enabling stretch mode, you need:
- A healthy Ceph cluster (HEALTH_OK)
- OSDs distributed across two physical sites
- At least five monitors (two per site plus one arbiter)
- CRUSH buckets representing each site

Verify cluster health first:

```bash
ceph status
ceph osd tree
```

## Step 1 - Set Up CRUSH Buckets

Create datacenter-level CRUSH buckets for each site:

```bash
ceph osd crush add-bucket dc1 datacenter
ceph osd crush add-bucket dc2 datacenter
ceph osd crush move dc1 root=default
ceph osd crush move dc2 root=default
```

Move hosts and OSDs into the correct datacenter:

```bash
ceph osd crush move host-dc1a datacenter=dc1
ceph osd crush move host-dc1b datacenter=dc1
ceph osd crush move host-dc2a datacenter=dc2
ceph osd crush move host-dc2b datacenter=dc2
```

## Step 2 - Configure the Arbiter Monitor

The arbiter monitor lives in a third location with no OSDs. Assign the arbiter monitor a distinct CRUSH location:

```bash
ceph mon set_location mon-arbiter datacenter=arbiter
```

Verify monitor locations:

```bash
ceph mon dump
```

## Step 3 - Create a Stretch CRUSH Rule

Create a CRUSH rule that enforces placement across both datacenters:

```bash
ceph osd crush rule create-replicated stretch_rule default datacenter
```

## Step 4 - Enable Stretch Mode

Enable stretch mode by specifying the two site names and the arbiter monitor:

```bash
ceph mon enable_stretch_mode mon-arbiter stretch_rule datacenter
```

This command sets the stretch_mode_enabled flag and configures the monitor election logic.

Verify stretch mode is active:

```bash
ceph osd dump | grep stretch
# Expected: stretch_mode_enabled 1
```

## Step 5 - Update Pool Configuration

All existing pools must use the new stretch CRUSH rule and correct replication settings:

```bash
ceph osd pool set rbd crush_rule stretch_rule
ceph osd pool set rbd size 4
ceph osd pool set rbd min_size 2
```

For a new pool:

```bash
ceph osd pool create mypool 64 64 replicated stretch_rule
ceph osd pool set mypool size 4
ceph osd pool set mypool min_size 2
```

## Step 6 - Validate the Configuration

Check that PGs are distributed across both sites:

```bash
ceph pg dump | awk '{print $1, $15}' | head -20
```

Simulate a site failure by checking what happens when you mark an entire site's OSDs down:

```bash
# Do this only in a test environment
ceph osd set norebalance
ceph osd down osd.0 osd.1  # site dc1 OSDs
ceph health detail
```

Reset after testing:

```bash
ceph osd unset norebalance
systemctl start ceph-osd@0
systemctl start ceph-osd@1
```

## Summary

Enabling Ceph stretch mode requires careful CRUSH bucket setup, a dedicated arbiter monitor, and a stretch replication rule. Once enabled, pool sizes must be updated to four replicas with a minimum of two, ensuring data is always accessible from the surviving site. Testing with simulated failures before relying on stretch mode in production is strongly recommended.
