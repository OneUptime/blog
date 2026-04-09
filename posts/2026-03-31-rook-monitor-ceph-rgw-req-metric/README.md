# How to Monitor ceph_rgw_req Metric for RGW Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Prometheus, Metric, Performance, Kubernetes

Description: Track ceph_rgw_req and related RGW metrics to monitor S3 request rates, latency, and error rates for the Rook-Ceph RADOS Gateway.

---

## Overview

The `ceph_rgw_req` metric counts total HTTP requests served by the Ceph RADOS Gateway (RGW). Combined with other RGW metrics, it provides a comprehensive view of S3 API performance, error rates, and throughput.

## Key RGW Metrics

```promql
# Total requests (counter)
ceph_rgw_req

# Failed requests
ceph_rgw_failed_req

# GET operations
ceph_rgw_get

# PUT operations
ceph_rgw_put

# Bytes received (PUT)
ceph_rgw_put_b

# Bytes sent (GET)
ceph_rgw_get_b
```

## Checking RGW Stats from CLI

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep rgw

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin usage show --show-log-entries=false
```

## Calculating Request Rates

Since `ceph_rgw_req` is a counter, use `rate()` for current throughput:

```promql
# Requests per second
rate(ceph_rgw_req[5m])

# PUT requests per second
rate(ceph_rgw_put[5m])

# GET requests per second
rate(ceph_rgw_get[5m])

# Error rate percentage
(rate(ceph_rgw_failed_req[5m]) / rate(ceph_rgw_req[5m])) * 100
```

## Monitoring Throughput

```promql
# GET throughput (bytes per second)
rate(ceph_rgw_get_b[5m])

# PUT throughput (bytes per second)
rate(ceph_rgw_put_b[5m])

# Total throughput
rate(ceph_rgw_get_b[5m]) + rate(ceph_rgw_put_b[5m])
```

## Creating Performance Alerts

```yaml
groups:
- name: ceph-rgw-performance
  rules:
  - alert: CephRGWHighErrorRate
    expr: |
      (rate(ceph_rgw_failed_req[5m]) / rate(ceph_rgw_req[5m])) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "RGW error rate is {{ $value | humanizePercentage }}"
      description: "High error rate may indicate backend OSD issues or client problems"

  - alert: CephRGWRequestDropped
    expr: rate(ceph_rgw_req[5m]) == 0 and ceph_rgw_req > 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "RGW request rate has dropped to zero"
```

## Inspecting Per-Instance Metrics

If running multiple RGW instances, check per-instance rates:

```promql
# Request rate per RGW daemon
sum(rate(ceph_rgw_req[5m])) by (ceph_daemon)
```

Check individual RGW pod logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=100 | \
  grep -E "ERROR|WARN|failed"
```

## RGW Latency Monitoring

Combine request count with timing for average latency:

```promql
# Average GET request initial latency
rate(ceph_rgw_get_initial_lat_sum[5m]) /
  rate(ceph_rgw_get_initial_lat_count[5m])

# Average PUT request initial latency
rate(ceph_rgw_put_initial_lat_sum[5m]) /
  rate(ceph_rgw_put_initial_lat_count[5m])
```

## Grafana Dashboard for RGW

```javascript
// Request rate over time
Query A: sum(rate(ceph_rgw_put[5m])) by (ceph_daemon)
Label: "PUT - {{ceph_daemon}}"

Query B: sum(rate(ceph_rgw_get[5m])) by (ceph_daemon)
Label: "GET - {{ceph_daemon}}"

// Error rate
Query: (rate(ceph_rgw_failed_req[5m]) / rate(ceph_rgw_req[5m])) * 100
Unit: percent
Threshold: 1% yellow, 5% red
```

## Summary

`ceph_rgw_req` tracks cumulative RGW requests and combined with `rate()` provides current S3 request throughput. Monitor `ceph_rgw_failed_req` for error rates, `ceph_rgw_get_b` and `ceph_rgw_put_b` for bandwidth utilization, and alert when error rates exceed 5% as this typically indicates OSD or backend issues affecting S3 service quality.
