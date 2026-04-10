# How to Set Up Ceph Metrics in OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OneUptime, Monitoring, Observability

Description: Learn how to monitor Ceph cluster health and performance metrics in OneUptime using the OpenTelemetry Collector and Prometheus scraping for unified observability.

---

## Overview

OneUptime is an open-source observability platform that supports metrics, logs, and status pages in a single product. By connecting Ceph's Prometheus metrics endpoint to OneUptime via the OpenTelemetry Collector, you can track cluster health, build monitors, and create public or private status pages for your storage infrastructure.

## Step 1 - Enable the Ceph Prometheus Exporter

```bash
# Enable the Prometheus module on the Ceph manager
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module enable prometheus

# Verify the metrics endpoint responds
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr 9283:9283 &
curl -s http://localhost:9283/metrics | grep ceph_health
```

## Step 2 - Deploy the OpenTelemetry Collector

Deploy the OpenTelemetry Collector as a Kubernetes Deployment to scrape and forward Ceph metrics:

```yaml
# otel-collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Step 3 - Configure the OTEL Collector for Ceph

```yaml
# otel-collector-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
            - job_name: "ceph-mgr"
              scrape_interval: 30s
              static_configs:
                - targets:
                    - "rook-ceph-mgr.rook-ceph.svc.cluster.local:9283"
              metric_relabel_configs:
                - source_labels: [__name__]
                  regex: "ceph_(health_status|osd_up|osd_in|pool_bytes_used|pool_max_avail|mon_quorum_status)"
                  action: keep

    processors:
      batch:
        timeout: 10s
      resource:
        attributes:
          - key: service.name
            value: ceph-cluster
            action: upsert
          - key: deployment.environment
            value: production
            action: upsert

    exporters:
      otlp:
        endpoint: "oneuptime.example.com:4317"
        headers:
          Authorization: "Bearer ${ONEUPTIME_API_KEY}"

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [batch, resource]
          exporters: [otlp]
```

## Step 4 - Create Monitors in OneUptime

Use the OneUptime API to create metric monitors for Ceph:

```bash
# Create a monitor for Ceph health
curl -X POST "https://oneuptime.example.com/api/monitor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ONEUPTIME_API_KEY}" \
  -d '{
    "projectId": "<PROJECT_ID>",
    "name": "Ceph Cluster Health",
    "monitorType": "IncomingRequest",
    "description": "Monitors Ceph cluster health status via OTEL metrics"
  }'
```

## Step 5 - Configure Metric Alerts

Set up alerts in OneUptime for Ceph health changes:

```bash
# Create an alert policy via OneUptime API
curl -X POST "https://oneuptime.example.com/api/on-call-duty-policy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ONEUPTIME_API_KEY}" \
  -d '{
    "projectId": "<PROJECT_ID>",
    "name": "Ceph Storage Alert Policy",
    "escalationRules": [
      {
        "order": 1,
        "escalateAfterInMinutes": 5,
        "teams": ["<STORAGE_TEAM_ID>"]
      }
    ]
  }'
```

## Step 6 - Create a Status Page for Storage

Add Ceph monitors to an OneUptime status page:

```bash
# Add monitor to status page
curl -X POST "https://oneuptime.example.com/api/status-page-resource" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ONEUPTIME_API_KEY}" \
  -d '{
    "projectId": "<PROJECT_ID>",
    "statusPageId": "<STATUS_PAGE_ID>",
    "monitorId": "<CEPH_MONITOR_ID>",
    "displayName": "Object Storage",
    "displayTooltip": "Rook/Ceph S3-compatible object storage",
    "order": 1
  }'
```

## Summary

OneUptime integrates with Ceph by using the OpenTelemetry Collector to scrape Ceph manager Prometheus metrics and forward them via OTLP. Monitors and alert policies in OneUptime provide incident management with on-call escalation, while status pages give stakeholders transparent visibility into storage infrastructure health.
