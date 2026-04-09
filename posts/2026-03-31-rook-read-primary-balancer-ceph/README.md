# How to Operate the Read (Primary) Balancer in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Kubernetes, Performance

Description: Learn how to enable and operate the read balancer in Ceph to distribute primary OSD read load evenly across your cluster for better performance.

---

## What Is the Read Balancer in Ceph

By default in Ceph, all reads for a placement group (PG) are served by the primary OSD. This can create hotspots when many PGs land their primary on the same OSD. The read balancer (also called the primary balancer) redistributes which OSD acts as primary for each PG, spreading read load more evenly across the cluster.

This feature became available as an online balancer mode in Ceph Squid (19.x) and later. An offline read balancing tool was introduced earlier in Ceph Reef (18.x) via `osdmaptool`. The online mode works at the PG level and does not move data - it only changes which OSD is responsible for handling read I/O for each PG.

## Checking Current Primary Distribution

Before enabling the balancer, inspect the current primary OSD distribution:

```bash
ceph osd df
```

Look at the `PRI-AFF` (primary affinity) column to verify all OSDs have the default affinity of 1. You can also check which OSDs hold the most primaries:

```bash
ceph pg dump | awk '/^[0-9]/{print $14}' | sort | uniq -c | sort -rn | head -20
```

This shows how many PGs each OSD is primary for. Uneven numbers indicate a potential read hotspot.

## Enabling the Read Balancer

The read balancer is a module that integrates with the Ceph balancer. To turn it on:

```bash
ceph balancer on
ceph balancer mode read
```

By default, the balancer uses `upmap` mode for even PG data distribution. Switching to `read` mode enables optimization of primary OSD assignments for read I/O. You can check status with:

```bash
ceph balancer status
```

The output shows whether the balancer is active and what mode it is operating in.

## Running the Balancer Manually

To immediately evaluate and apply a rebalancing plan:

```bash
ceph balancer eval
ceph balancer optimize read_plan
ceph balancer execute read_plan
```

The `eval` command scores the current balance. The `optimize` command generates a plan named `read_plan`. The `execute` command applies it. You can inspect the plan before executing it:

```bash
ceph balancer show read_plan
```

## Configuring Auto-Balance

To let the balancer run automatically on a schedule, enable the auto mode:

```bash
ceph balancer on
ceph config set mgr mgr/balancer/mode read
ceph config set mgr mgr/balancer/sleep_interval 60
```

The `sleep_interval` is in seconds. The balancer will wake up, evaluate the cluster, and apply optimizations if the improvement score exceeds a threshold.

## Tuning the Improvement Threshold

The balancer will only apply a plan if the expected improvement meets a minimum score. To adjust the threshold:

```bash
ceph config set mgr mgr/balancer/min_score 0.02
```

A lower value causes the balancer to apply more aggressive or minor optimizations. A higher value causes it to wait for bigger imbalances before acting.

## Monitoring Balance Score

Track the read balance score over time using the Ceph dashboard or CLI:

```bash
ceph balancer eval
```

A score near 0.0 means perfect balance. The goal is to keep this below 0.1 in production clusters.

## Summary

The Ceph read balancer redistributes PG primary assignments so that read I/O is spread evenly across all OSDs. Enable it with `ceph balancer mode read`, generate and execute an optimization plan, and optionally configure automatic re-balancing. This reduces read hotspots without moving any data, making it a low-risk performance improvement for production Ceph clusters.
