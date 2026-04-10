# How to Set Up Ceph Metrics in Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Datadog, Monitoring, Observability

Description: Learn how to ship Ceph cluster metrics to Datadog using the Datadog Agent and OpenMetrics integration for full-stack observability.

---

## Overview

Datadog provides a powerful platform for monitoring Ceph clusters. By scraping Ceph's Prometheus endpoint and forwarding metrics to Datadog, you gain access to dashboards, alerts, and anomaly detection. This guide walks through configuring the Datadog Agent to collect Ceph metrics from a Rook-managed cluster.

## Step 1 - Enable the Ceph Prometheus Exporter

Rook exposes Ceph metrics via the Prometheus exporter. Verify it is running:

```bash
kubectl -n rook-ceph get svc | grep prometheus
# Expected output: rook-ceph-mgr or rook-ceph-mgr-metrics with port 9283

# Check the mgr Prometheus module is active
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module ls | grep prometheus
```

Enable it if not active:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module enable prometheus
```

## Step 2 - Install the Datadog Agent

Deploy the Datadog Agent using Helm:

```bash
helm repo add datadog https://helm.datadoghq.com
helm repo update

helm install datadog-agent datadog/datadog \
  --set datadog.apiKey=<YOUR_DD_API_KEY> \
  --set datadog.clusterName=my-k8s-cluster \
  --set agents.enabled=true \
  --namespace datadog --create-namespace
```

## Step 3 - Configure the OpenMetrics Check

Create a Datadog Agent configuration to scrape the Ceph Prometheus endpoint:

```yaml
# /etc/datadog-agent/conf.d/openmetrics.d/conf.yaml
init_config:

instances:
  - openmetrics_endpoint: http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics
    namespace: ceph
    metrics:
      - ceph_health_status
      - ceph_osd_up
      - ceph_osd_in
      - ceph_pool_bytes_used
      - ceph_pool_max_avail
      - ceph_mon_quorum_status
      - ceph_osd_apply_latency_ms
      - ceph_rgw_req
    collect_histogram_buckets: true
    tag_by_endpoint: true
```

Apply this as a Kubernetes ConfigMap for the Datadog Agent DaemonSet.

## Step 4 - Use Annotations for Auto-Discovery

Annotate the Ceph manager service for automatic metric collection:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
  annotations:
    ad.datadoghq.com/endpoints.check_names: '["openmetrics"]'
    ad.datadoghq.com/endpoints.init_configs: '[{}]'
    ad.datadoghq.com/endpoints.instances: |
      [{
        "openmetrics_endpoint": "http://%%host%%:9283/metrics",
        "namespace": "ceph",
        "metrics": ["ceph_health_status", "ceph_osd_up", "ceph_pool_bytes_used"]
      }]
```

## Step 5 - Create a Datadog Dashboard

After metrics start flowing, build a dashboard using Datadog's UI or the API:

```bash
# Verify metrics are arriving
curl -X GET "https://api.datadoghq.com/api/v1/metrics?from=$(date -d '1 hour ago' +%s)" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" | jq '.metrics[] | select(startswith("ceph"))'
```

Key metrics to include in your dashboard:
- `ceph.ceph_health_status` - Overall cluster health
- `ceph.ceph_osd_up` vs `ceph.ceph_osd_in` - OSD availability
- `ceph.ceph_pool_bytes_used` / `ceph.ceph_pool_max_avail` - Capacity utilization
- `ceph.ceph_osd_apply_latency_ms` - Write latency

## Step 6 - Set Up Alerts

Create a Datadog monitor for critical Ceph conditions:

```bash
# Use Datadog API to create a monitor
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d '{
    "name": "Ceph Health Warning",
    "type": "metric alert",
    "query": "avg(last_5m):avg:ceph.ceph_health_status{*} > 0",
    "message": "Ceph cluster health is degraded. @oncall-storage",
    "tags": ["env:prod", "service:ceph"]
  }'
```

## Summary

Integrating Ceph metrics with Datadog involves enabling the Prometheus exporter on the Ceph manager, configuring the Datadog Agent's OpenMetrics check to scrape those metrics, and building dashboards and alerts. Using Kubernetes annotations enables automatic discovery so metrics collection survives pod restarts and cluster changes.
