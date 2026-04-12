# How to Set Up Ceph Metrics in Dynatrace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dynatrace, Monitoring, Observability

Description: Learn how to ingest Ceph cluster metrics into Dynatrace using the Prometheus scraper extension and Dynatrace Operator for Kubernetes.

---

## Overview

Dynatrace supports Prometheus-format metrics natively, making it possible to collect Ceph storage metrics from Rook-managed clusters. You can use either the Dynatrace Operator's annotation-based scraping or the ActiveGate Prometheus extension to pull Ceph metrics.

## Step 1 - Enable the Ceph Prometheus Endpoint

Ensure the Ceph manager exposes metrics:

```bash
# Enable Prometheus module
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module enable prometheus

# Verify endpoint is reachable
kubectl -n rook-ceph get svc rook-ceph-mgr -o jsonpath='{.spec.ports[?(@.name=="http-metrics")]}'
```

## Step 2 - Install the Dynatrace Operator

```bash
kubectl create namespace dynatrace
kubectl apply -f https://github.com/Dynatrace/dynatrace-operator/releases/latest/download/kubernetes.yaml

# Create the DynaKube custom resource
cat <<EOF | kubectl apply -f -
apiVersion: dynatrace.com/v1beta6
kind: DynaKube
metadata:
  name: dynakube
  namespace: dynatrace
spec:
  apiUrl: https://<YOUR_ENV_ID>.live.dynatrace.com/api
  tokens: dynakube
  activeGate:
    capabilities:
      - kubernetes-monitoring
      - metrics-ingest
  extensions:
    prometheus: {}
EOF
```

## Step 3 - Annotate the Ceph Manager Service

Use Dynatrace annotations to enable automatic scraping:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
  annotations:
    metrics.dynatrace.com/scrape: "true"
    metrics.dynatrace.com/port: "9283"
    metrics.dynatrace.com/path: "/metrics"
    metrics.dynatrace.com/filter: |
      {
        "mode": "include",
        "names": [
          "ceph_health_status",
          "ceph_osd_up",
          "ceph_osd_in",
          "ceph_pool_bytes_used",
          "ceph_pool_max_avail",
          "ceph_mon_quorum_status"
        ]
      }
```

## Step 4 - Push Metrics via the Dynatrace Metrics API

For direct ingestion without Prometheus scraping, use the Dynatrace Metrics API v2:

```bash
# Fetch a Ceph metric value and push it to Dynatrace
HEALTH=$(kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph health --format json | jq '.status == "HEALTH_OK" | if . then 0 else 1 end')

curl -X POST "https://<ENV_ID>.live.dynatrace.com/api/v2/metrics/ingest" \
  -H "Authorization: Api-Token <DT_API_TOKEN>" \
  -H "Content-Type: text/plain" \
  -d "ceph.health.status,cluster=prod ${HEALTH}"
```

## Step 5 - Create Dynatrace Metric Events

Configure anomaly detection for Ceph metrics:

```json
// dynatrace-metric-event.json
{
  "metricId": "ceph.health.status",
  "name": "Ceph Health Degraded",
  "description": "Alerts when Ceph health status is not OK",
  "enabled": true,
  "monitoringStrategy": {
    "type": "STATIC_THRESHOLD",
    "threshold": 0,
    "alertCondition": "ABOVE",
    "samples": 5,
    "violatingSamples": 3,
    "dealertingSamples": 5,
    "alertingOnMissingData": true
  },
  "severity": "AVAILABILITY"
}
```

```bash
curl -X POST "https://<ENV_ID>.live.dynatrace.com/api/config/v1/anomalyDetection/metricEvents" \
  -H "Authorization: Api-Token <DT_CONFIG_TOKEN>" \
  -H "Content-Type: application/json" \
  -d @dynatrace-metric-event.json
```

## Step 6 - Build a Dynatrace Dashboard

Use the Dynatrace Data Explorer to visualize Ceph metrics:

```bash
# Query available Ceph metrics via API
curl "https://<ENV_ID>.live.dynatrace.com/api/v2/metrics?metricSelector=ceph.*" \
  -H "Authorization: Api-Token <DT_API_TOKEN>" | jq '.metrics[].metricId'
```

Create tiles for OSD utilization, pool capacity, and health status using metric expressions.

## Summary

Dynatrace integrates with Ceph by leveraging its built-in Prometheus scraping capabilities through the Dynatrace Operator. Annotating the Ceph manager service enables automatic metric discovery, while the Metrics Ingest API provides an alternative push path. Dynatrace anomaly detection can then automatically alert on Ceph health regressions without manual threshold tuning.
