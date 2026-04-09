# How to Configure Stretch Clusters in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Stretch Cluster, High Availability, Distributed Storage

Description: Configure a Ceph stretch cluster spanning two data centers with an arbiter monitor for fault-tolerant storage that survives a full site failure.

---

## What Is a Ceph Stretch Cluster

A stretch cluster is a Ceph deployment that spans two geographically separated sites. If one site fails completely, the cluster continues operating using the data from the surviving site. An arbiter monitor at a third location provides quorum tiebreaking without storing data.

This is distinct from multisite replication - in a stretch cluster, a single Ceph cluster spans both sites, rather than two separate clusters replicating to each other.

## Prerequisites

- Two data sites, each with at least 2 OSDs
- A third site (or a cheap VM/server) for the arbiter monitor
- Low-latency network links between sites (typically under 10ms RTT)
- Ceph Pacific or later

## Cluster Topology

```text
Site A (datacenter-a)
  - osd.0, osd.1, osd.2
  - mon.a

Site B (datacenter-b)
  - osd.3, osd.4, osd.5
  - mon.b

Arbiter Site
  - mon.arbiter (monitor only, no OSDs)
```

## Step 1 - Label Hosts by Site

Use the CRUSH map to assign hosts to their data center buckets:

```bash
ceph osd crush add-bucket datacenter-a datacenter
ceph osd crush add-bucket datacenter-b datacenter
ceph osd crush move datacenter-a root=default
ceph osd crush move datacenter-b root=default
ceph osd crush move node-a1 datacenter=datacenter-a
ceph osd crush move node-a2 datacenter=datacenter-a
ceph osd crush move node-b1 datacenter=datacenter-b
ceph osd crush move node-b2 datacenter=datacenter-b
```

## Step 2 - Create Stretch Pool CRUSH Rules

The pool must be configured to distribute copies across both datacenters:

```bash
ceph osd crush rule create-replicated stretch_rule default datacenter
```

Verify the rule:

```bash
ceph osd crush rule dump stretch_rule
```

## Step 3 - Configure the Stretch Cluster

Set the monitor election strategy to connectivity mode, which is required for stretch mode:

```bash
ceph mon set election_strategy connectivity
```

Enable stretch mode with the arbiter monitor:

```bash
ceph mon enable_stretch_mode arbiter stretch_rule datacenter
```

This command:
- Sets the tiebreaker monitor to `mon.arbiter`
- Applies the `stretch_rule` CRUSH rule to all existing pools
- Configures the CRUSH bucket type `datacenter` as the site divider
- When a site fails, the cluster enters degraded stretch mode and automatically reduces min_size so I/O continues from the surviving site

## Step 4 - Apply the Rule to Pools

```bash
ceph osd pool create stretch_pool 64 64 replicated stretch_rule
ceph osd pool set stretch_pool size 4
ceph osd pool set stretch_pool min_size 2
```

With size=4 and two sites, each site holds 2 replicas. The pool can survive a complete site failure.

## Step 5 - Verify Stretch Mode

```bash
ceph mon dump
# Should show: stretch_mode_enabled, tiebreaker_mon=arbiter

ceph osd crush tree
# Verify datacenter buckets are visible

ceph -s
# Cluster should be HEALTH_OK
```

## Simulating a Site Failure

To test failover:

```bash
# Simulate taking Site A offline - stop all OSDs on site A
# The cluster should go into a degraded but active state

ceph -s
# Look for: HEALTH_WARN, x pgs degraded
# But I/O should continue from Site B

# Bring Site A back up
# Watch PGs recover
watch -n 5 ceph pg stat
```

## Network Partition Behavior

In a true stretch cluster, if network connectivity between sites is lost but both sites stay up, the cluster waits for quorum. The arbiter monitor determines which site wins quorum. The losing site enters a blocked state to prevent split-brain writes.

```bash
# Check which site has quorum
ceph quorum_status --format json-pretty | jq '.quorum_names'
```

## Monitoring Stretch Cluster Health

```bash
# Check monitor quorum
ceph mon stat

# Check OSD distribution by datacenter
ceph osd tree

# Check PG placement
ceph pg dump | awk '{print $1, $14}' | head -20
```

## Summary

A Ceph stretch cluster enables site-level fault tolerance by distributing OSDs across two data centers and using an arbiter monitor for quorum. Configuring it requires proper CRUSH map topology with datacenter buckets, stretch-mode pool rules with size=4 for 2+2 replica placement, setting the election strategy to connectivity, and enabling stretch mode via `ceph mon enable_stretch_mode`. This setup ensures continued operation even if one entire data center goes offline.
