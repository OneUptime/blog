# How to Configure OSD Primary Affinity in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Primary Affinity, Performance

Description: Learn how to configure OSD primary affinity in Ceph to bias which OSDs serve as PG primaries and improve read performance.

---

## What Is OSD Primary Affinity?

In Ceph, each Placement Group (PG) has one primary OSD that handles all client reads and coordinates writes by forwarding them to replicas, acknowledging to the client only after all replicas confirm persistence. By default, any OSD in a PG's acting set can become primary. Primary affinity is a per-OSD weight between 0.0 and 1.0 that biases CRUSH's primary selection. Setting affinity to 0 prevents an OSD from becoming primary, while 1.0 (the default) gives it full eligibility. This is useful for directing reads toward faster drives (SSDs vs HDDs) or excluding partially failed OSDs from serving primary duties.

## Checking Current Primary Affinity

View all OSD primary affinities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep primary_affinity
```

Or check a specific OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree | grep osd.0
```

## Setting Primary Affinity

To reduce the likelihood of an OSD becoming primary (useful for slower or aging drives):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd primary-affinity osd.3 0.5
```

To completely exclude an OSD from primary selection:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd primary-affinity osd.3 0
```

To restore full eligibility:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd primary-affinity osd.3 1
```

## Use Case - Preferring SSD OSDs for Reads

In a heterogeneous cluster with both HDD and SSD OSDs, you can steer all primary reads to SSD OSDs:

```bash
# Reduce HDD OSD affinity
for osd in 0 1 2 3 4 5; do
  kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
    ceph osd primary-affinity osd.${osd} 0.1
done

# Keep SSD OSD affinity at maximum
for osd in 6 7 8; do
  kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
    ceph osd primary-affinity osd.${osd} 1.0
done
```

## Use Case - Excluding a Degraded OSD

If an OSD is showing elevated latency but is still functional, exclude it from primary duties while you investigate:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd primary-affinity osd.7 0
```

Clients will now read from other replicas, reducing latency impact while you diagnose the problem.

## Verifying PG Primary Distribution

After changing affinities, verify that PGs redistributed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump pgs_brief | awk '{print $6}' | sort -n | uniq -c | sort -rn | head -20
```

This shows how many PGs each OSD is acting primary for, confirming the bias took effect.

## Summary

OSD primary affinity lets you control which OSDs handle client read requests and write acknowledgments. Setting affinity to 0 on slower or degraded OSDs routes I/O to healthier drives. In mixed HDD and SSD clusters, setting high affinity on SSDs dramatically improves read latency. Changes take effect immediately without requiring a Rook operator restart.
