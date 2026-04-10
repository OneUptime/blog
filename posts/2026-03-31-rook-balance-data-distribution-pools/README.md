# How to Balance Data Distribution Across Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Load Balancing, OSD, Kubernetes, Performance

Description: Learn how to balance data distribution across Ceph pools and OSDs using the balancer module, PG autoscaling, and CRUSH weight adjustments.

---

## Why Data Distribution Matters

Uneven data distribution in Ceph leads to some OSDs being overloaded while others sit underutilized. This creates performance bottlenecks, increases the risk of OSD failure from overuse, and complicates capacity planning. Ceph provides several tools to achieve and maintain even distribution.

## Enable the Balancer Module

The Ceph balancer module actively moves PGs to improve distribution:

```bash
# Check current balancer status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer status

# Enable the balancer in upmap mode (recommended)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer mode upmap

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer on
```

## Check Current Distribution

Before making changes, assess the current state:

```bash
# View OSD utilization
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df tree

# Check pool statistics
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail
```

Look for significant variance in the `VAR` column of `osd df` - values far from 1.0 indicate imbalance.

## Enable PG Autoscaling Per Pool

Allow Ceph to automatically adjust PG counts as data grows:

```bash
# Enable autoscaling globally
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool unset noautoscale

# Check autoscale status per pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

Set it per pool in the CephBlockPool spec:

```yaml
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
    target_size_ratio: "0.2"
```

## Adjust OSD and CRUSH Weights

If some OSDs are larger than others, adjust their weights to get proportional distribution:

```bash
# View current weights
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree

# Adjust OSD reweight based on actual utilization
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd reweight-by-utilization

# Manually set CRUSH weight for a specific OSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush reweight osd.5 2.0
```

## Trigger a Balancer Evaluation

Generate and review a balancing plan before applying it:

```bash
# Generate an optimization plan
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer optimize my-plan

# Evaluate the expected improvement
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer eval my-plan

# Execute the plan
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer execute my-plan
```

## Monitor Rebalancing Progress

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch ceph status
```

Look at the `pgs` section for `misplaced` objects count and the `io` section for recovery throughput to track progress.

## Summary

Balancing data distribution across Ceph pools requires a combination of enabling the automatic balancer module, configuring PG autoscaling, and adjusting CRUSH weights for heterogeneous OSD sizes. The `upmap` balancer mode provides the most precise control. Regular monitoring of OSD utilization variance ensures the cluster stays balanced as data patterns change over time.
