# How to Monitor NFS Performance in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Monitoring, Performance

Description: Learn how to monitor NFS-Ganesha performance in a Rook-Ceph cluster using Prometheus metrics, Ganesha stats, and Ceph MDS statistics.

---

## Why Monitor NFS Performance

NFS performance bottlenecks can occur at multiple layers in a Rook deployment: the NFS-Ganesha daemon, the network between clients and servers, the CephFS metadata server (MDS), or the underlying storage OSDs. Understanding which layer is responsible requires metrics from all of them. Rook exposes NFS metrics via the Ceph Manager, and Ganesha emits its own Prometheus metrics endpoint.

## Enabling Ganesha Prometheus Metrics

Configure Ganesha to expose Prometheus metrics by enabling the monitoring parameters in your `CephNFS` config:

```yaml
ganesha:
  config: |
    NFS_CORE_PARAM {
      Protocols = 4;
      Enable_Metrics = true;
      Enable_Dynamic_Metrics = true;
      Monitoring_Port = 9587;
    }
```

The Ganesha pod now serves metrics at port 9587.

## Creating a Prometheus ServiceMonitor

Instruct Prometheus Operator to scrape the NFS pods:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-nfs
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: rook-ceph-nfs
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

Ensure the NFS Service includes the `metrics` port:

```yaml
ports:
  - name: metrics
    port: 9587
    targetPort: 9587
```

## Key Ganesha Metrics to Watch

| Metric | Description |
|--------|-------------|
| `nfs_requests_total` | Total NFS requests |
| `nfs_bytes_received_total` | Bytes read via NFS |
| `nfs_bytes_sent_total` | Bytes written via NFS |
| `nfs_latency_ms` | Operation latency histogram |
| `nfs_mdcache_hits_total` | Metadata cache hits |
| `nfs_mdcache_misses_total` | Metadata cache misses |

High cache miss rates indicate the metadata cache is undersized. Increase `Entries_HWMark` in the `MDCACHE` config block.

## Monitoring CephFS MDS for NFS Workloads

NFS operations backed by CephFS ultimately pass through the MDS. Monitor MDS performance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.<id> perf dump
```

Replace `<id>` with your MDS daemon name (e.g., `mds.myfs-a`). Watch for high per-operation latency values (such as `req_lookup`, `req_create`, `req_getattr` with their `.lat` sub-fields), which indicate MDS latency caused by metadata operations from NFS clients.

## Checking NFS Ganesha Stats Directly

Use the Ganesha management tool for a quick snapshot without Prometheus:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-nfs -o name | head -1) -- \
  ganesha_stats v4_full
```

This prints NFSv4 per-export operation counts and latency summaries. Other useful subcommands include `v3_full` for NFSv3 stats and `fsal <name>` for FSAL-specific stats.

## Grafana Dashboard for NFS

Import the Ceph NFS Grafana dashboard (community dashboards available at grafana.com) or build a custom one with panels for:

```text
- NFS throughput (read/write bytes per second)
- NFS operation latency percentiles (p50, p95, p99)
- Active NFS client connections
- Ganesha cache hit ratio
- MDS request latency
```

## Summary

Monitoring NFS performance in Rook requires metrics from three sources: the Ganesha Prometheus endpoint for NFS protocol metrics, Ceph MDS perf for metadata layer metrics, and Ceph OSD metrics for data path performance. Enable the Ganesha Prometheus exporter via `Enable_Metrics` in the `NFS_CORE_PARAM` config block, create a ServiceMonitor for automatic scraping, and build Grafana dashboards to correlate NFS, MDS, and OSD metrics.
