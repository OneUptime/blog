# How to Identify Hot Spots in Ceph Data Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, CRUSH, Data Distribution

Description: Learn how to identify data distribution hot spots in Ceph by analyzing OSD utilization, PG distribution, and CRUSH map configuration to balance IO and storage evenly.

---

## What Causes Hot Spots in Ceph

Hot spots occur when some OSDs receive significantly more IO than others. Common causes include:

- Unbalanced PG distribution (too many or too few PGs on certain OSDs)
- CRUSH map misconfiguration that over-assigns certain disks
- Mixed OSD capacities without properly configured CRUSH weights
- A single high-IO pool mapped to a small set of OSDs

## Check OSD Utilization Balance

Inspect per-OSD utilization to spot outliers:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd df tree
"
```

Look for OSDs with significantly higher `%USE` values than others. Healthy clusters typically have utilization within 5-10% of each other.

## Check PG Distribution Across OSDs

Identify how many PGs are assigned per OSD using `ceph osd df` which shows the PG count per OSD directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd df --format json | jq '.nodes[] | {osd: .name, pgs: .pgs, utilization: .utilization}'
"
```

## Identify Hot OSDs via Prometheus

Query for the top OSDs by write IOPS over the past hour:

```bash
# Top 10 OSDs by write ops rate
topk(10, rate(ceph_osd_op_w[1h]))

# Top 10 OSDs by bytes written
topk(10, rate(ceph_osd_op_w_in_bytes[1h]))

# Standard deviation of OSD utilization (high = imbalance)
stddev(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes)
```

## Check CRUSH Weights for Imbalance

OSDs with incorrect CRUSH weights receive proportionally more or fewer PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd tree
"
```

Compare the `WEIGHT` and `REWEIGHT` columns. The `REWEIGHT` value (0.0-1.0) adjusts PG distribution without changing the CRUSH map:

```bash
# Reweight a specific OSD to reduce its load
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd reweight osd.3 0.8
"
```

## Use osd-reweight-by-utilization

Ceph has a built-in command to automatically rebalance by utilization:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Test what changes would be made (dry run)
  ceph osd test-reweight-by-utilization 120

  # Apply the rebalancing
  ceph osd reweight-by-utilization 120
"
```

The `120` threshold means only OSDs using more than 120% of the average utilization are reweighted.

## Fix CRUSH Map Imbalance

If PG distribution is uneven due to CRUSH map issues, verify and tune pg_num per pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Check PG autoscaler recommendations
  ceph osd pool autoscale-status

  # Enable autoscaler for a pool
  ceph osd pool set rbd pg_autoscale_mode on
"
```

## Summary

Identifying Ceph data distribution hot spots requires checking per-OSD utilization with `ceph osd df`, reviewing PG counts per OSD, querying Prometheus for IOPS outliers, and inspecting CRUSH weights. Remediation options include OSD reweighting, automatic rebalancing with `osd-reweight-by-utilization`, and enabling the PG autoscaler to distribute load evenly across all OSDs.
