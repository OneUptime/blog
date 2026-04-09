# How to Set Up the Prometheus Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Prometheus, Monitoring, Kubernetes

Description: Learn how to enable and configure the Prometheus module in Ceph Manager to expose cluster metrics for scraping and alerting.

---

The Ceph Manager (ceph-mgr) Prometheus module exposes Ceph cluster metrics in a format compatible with Prometheus. This allows you to scrape performance, health, and capacity data directly from your Ceph cluster without external exporters.

## Enabling the Prometheus Module

First, verify whether the module is already enabled:

```bash
ceph mgr module ls
```

Enable the module if it is not active:

```bash
ceph mgr module enable prometheus
```

## Verifying the Endpoint

Once enabled, the module listens on port 9283 by default on the active manager host:

```bash
ceph mgr services
```

Sample output:

```json
{
  "prometheus": "http://192.168.1.10:9283/"
}
```

You can curl the metrics endpoint to confirm it is working:

```bash
curl http://192.168.1.10:9283/metrics | head -30
```

## Configuring the Prometheus Module

You can change the default listening port and interface:

```bash
ceph config set mgr mgr/prometheus/server_port 9283
ceph config set mgr mgr/prometheus/server_addr 0.0.0.0
```

To enable per-pool RBD image performance metrics:

```bash
ceph config set mgr mgr/prometheus/rbd_stats_pools "*"
```

## Prometheus Scrape Config

Add Ceph as a scrape target in your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'ceph'
    static_configs:
      - targets: ['192.168.1.10:9283']
    scrape_interval: 30s
    scrape_timeout: 10s
```

## Rook-Managed Clusters

In a Rook-managed cluster, the Prometheus module is typically enabled by default. You can add a ServiceMonitor for automatic discovery:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
spec:
  namespaceSelector:
    matchNames:
      - rook-ceph
  selector:
    matchLabels:
      app: rook-ceph-mgr
  endpoints:
    - port: http-metrics
      path: /metrics
      interval: 5s
```

## Key Metrics to Watch

Some important metrics exposed by the module:

- `ceph_health_status` - Overall cluster health (0=OK, 1=WARN, 2=ERR)
- `ceph_osd_up` - OSD availability per OSD
- `ceph_pool_bytes_used` - Bytes consumed per pool
- `ceph_pg_total` - Total placement group count

## Summary

The Ceph Manager Prometheus module provides a native metrics endpoint on port 9283, making it easy to integrate Ceph observability into any Prometheus-based monitoring stack. Enabling it requires a single command, and configuration options let you tune the scrape endpoint, listening interface, and per-pool RBD stats collection.
