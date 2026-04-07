# How to Track Client IO Distribution in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Client IO, Performance

Description: Learn how to track client IO distribution in Ceph to identify which clients, pools, or namespaces are consuming the most IOPS and bandwidth for workload management.

---

## Why Track Client IO Distribution

In a shared Ceph cluster, multiple applications and teams compete for IO resources. Understanding which clients generate the most read/write operations helps with capacity planning, QoS enforcement, and troubleshooting noisy-neighbor problems.

## View Current Client IO

Use the Ceph status command for an immediate overview:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph -s
"
```

The IO section shows aggregate client read and write rates:

```text
  io:
    client:   read: 250 MiB/s, 3200 op/s
              write: 120 MiB/s, 1800 op/s
```

## Per-Pool IO Distribution

Break down IO by pool to identify the busiest pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool stats
"
```

Sample output:

```text
pool rbd id 1
  client io 2100 op/s rd, 800 op/s wr, 180 MiB/s rd, 90 MiB/s wr

pool cephfs-data id 2
  client io 540 op/s rd, 230 op/s wr, 60 MiB/s rd, 30 MiB/s wr
```

## Prometheus Metrics for Per-Pool IO Tracking

For detailed IO monitoring, use the Ceph manager Prometheus exporter that Rook enables by default. The metrics are exposed through the rook-ceph-mgr service:

```bash
# Port-forward to the Ceph manager Prometheus endpoint
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr 9283:9283 &
curl -s http://localhost:9283/metrics | grep ceph_pool
```

Key metrics to track per-pool IO rates:

```text
ceph_pool_rd{pool_id="1"}
ceph_pool_wr{pool_id="1"}
ceph_pool_rd_bytes{pool_id="1"}
ceph_pool_wr_bytes{pool_id="1"}
```

## Track IO Per OSD

Identify uneven IO distribution across OSDs, which may indicate CRUSH imbalance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd perf
"
```

Compare `commit_latency_ms` and `apply_latency_ms` values across OSDs. Significantly higher latencies on certain OSDs indicate uneven load or hardware issues.

## Use rados df to View Pool Usage

Identify pools with the most objects and storage usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  rados df
"
```

This shows object count and read/write operations per pool:

```text
POOL_NAME         USED  OBJECTS  CLONES  COPIES  MISSING_ON_PRIMARY
rbd              50GiB    12500       0   37500                   0
cephfs-data      20GiB     4200       0   12600                   0
```

## Correlate Kubernetes Workloads with Ceph Pools

Map PVCs to RBD images to find which workloads are driving IO:

```bash
# List all RBD images in a pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd ls --pool rbd

# Get image details including size and parent
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info rbd/<image-name>

# Check PVC to image mapping
kubectl get pv -o json | jq -r '.items[] | [.metadata.name, .spec.csi.volumeAttributes.imageName] | @tsv'
```

## Summary

Tracking client IO distribution in Ceph combines per-pool statistics from `ceph osd pool stats`, OSD-level `ceph osd perf` metrics, and Prometheus CSI metrics to identify which workloads, pools, and OSDs carry the heaviest IO load. Correlating Kubernetes PVCs with RBD images lets you pinpoint specific applications driving high utilization and enables informed decisions around QoS, pool placement, and capacity expansion.
