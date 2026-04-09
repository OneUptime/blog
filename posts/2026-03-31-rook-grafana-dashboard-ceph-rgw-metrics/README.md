# How to Set Up Grafana Dashboard for Ceph RGW Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, RGW, Object Storage, Monitoring, Dashboard, S3

Description: Build a Grafana dashboard to monitor Ceph RADOS Gateway metrics including request rates, latency, bucket usage, and error rates for S3-compatible object storage.

---

## Ceph RGW Monitoring Overview

The Ceph RADOS Gateway (RGW) provides S3 and Swift-compatible object storage. Monitoring RGW is distinct from monitoring OSDs and pools - you need visibility into HTTP request rates, response codes, per-bucket usage, and gateway-level performance.

## Enabling RGW Metrics in Rook

Ensure the Prometheus metrics endpoint is enabled in your CephObjectStore:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 2
  healthCheck:
    bucket:
      disabled: false
      interval: 60s
```

RGW metrics are exposed through the Ceph MGR Prometheus module, which is enabled cluster-wide via `monitoring.enabled: true` in your CephCluster CR. You will also need to deploy ServiceMonitors (available as example manifests in the Rook repository) so that Prometheus can scrape the metrics endpoint.

## Key RGW Metrics

```promql
# Total RGW requests per second
rate(ceph_rgw_req{namespace="rook-ceph"}[5m])

# GET requests (reads)
rate(ceph_rgw_get{namespace="rook-ceph"}[5m])

# PUT requests (writes)
rate(ceph_rgw_put{namespace="rook-ceph"}[5m])

# Failed requests
rate(ceph_rgw_failed_req{namespace="rook-ceph"}[5m])

# Bytes sent to clients
rate(ceph_rgw_get_b{namespace="rook-ceph"}[5m])

# Bytes received from clients
rate(ceph_rgw_put_b{namespace="rook-ceph"}[5m])
```

## Throughput Panel

Create a Time series panel showing GET vs. PUT byte throughput:

```promql
# GET throughput (downloads)
sum(rate(ceph_rgw_get_b{namespace="rook-ceph"}[5m]))

# PUT throughput (uploads)
sum(rate(ceph_rgw_put_b{namespace="rook-ceph"}[5m])) * -1
```

Use the butterfly format (writes below zero) for immediate visual clarity.

## Error Rate Panel

Track error rates to detect client-side or server-side issues:

```promql
# Error rate as percentage of total requests
(
  rate(ceph_rgw_failed_req{namespace="rook-ceph"}[5m]) /
  rate(ceph_rgw_req{namespace="rook-ceph"}[5m])
) * 100
```

Set a threshold at 1% and color the panel red when exceeded.

## RGW Latency Panel

```promql
# Average GET latency in milliseconds
(
  rate(ceph_rgw_get_initial_lat_sum{namespace="rook-ceph"}[5m]) /
  rate(ceph_rgw_get_initial_lat_count{namespace="rook-ceph"}[5m])
) * 1000
```

## Request Queue Length Panel

```promql
# RGW request queue length
ceph_rgw_qlen{namespace="rook-ceph"}
```

## Dashboard Sections

```text
Row 1: Overview
  - Total Requests/sec (Stat)
  - Error Rate % (Gauge with threshold)
  - Active Gateways (Stat)

Row 2: Throughput
  - GET/PUT Throughput Butterfly (Time series)
  - Bytes Transferred (Time series)

Row 3: Performance
  - GET Latency (Time series)
  - PUT Latency (Time series)
  - Queue Length (Time series)
```

## Summary

A dedicated Grafana dashboard for Ceph RGW provides visibility into request rates, error percentages, throughput, and latency for your S3-compatible object storage layer. By monitoring GET vs. PUT patterns and tracking error rates, you can detect client application issues, gateway overload, and capacity problems before they affect applications relying on object storage.
