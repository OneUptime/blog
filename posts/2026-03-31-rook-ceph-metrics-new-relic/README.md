# How to Set Up Ceph Metrics in New Relic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, New Relic, Monitoring, Observability

Description: Learn how to forward Ceph cluster metrics to New Relic using the Prometheus remote write integration for centralized observability.

---

## Overview

New Relic's Prometheus integration makes it straightforward to ingest Ceph metrics from a Rook-managed Kubernetes cluster. You can use either the Prometheus remote_write feature or the New Relic Kubernetes integration to collect and visualize Ceph health and performance data.

## Step 1 - Enable the Ceph Prometheus Exporter

Ensure the Ceph manager Prometheus module is active:

```bash
# Check module status
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module ls | grep prometheus

# Enable if not already active
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module enable prometheus

# Verify the metrics endpoint
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr 9283:9283 &
curl http://localhost:9283/metrics | grep ceph_health
```

## Step 2 - Configure Prometheus Remote Write to New Relic

Add the New Relic remote_write endpoint to your Prometheus configuration:

```yaml
# prometheus.yml additions
remote_write:
  - url: https://metric-api.newrelic.com/prometheus/v1/write?prometheus_server=ceph-cluster
    bearer_token: <YOUR_NEW_RELIC_LICENSE_KEY>
    write_relabel_configs:
      - source_labels: [__name__]
        regex: "ceph_.*"
        action: keep
    queue_config:
      max_samples_per_send: 1000
      max_shards: 10
      capacity: 2500
```

Apply this to your Prometheus Operator CRD:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  remoteWrite:
    - url: "https://metric-api.newrelic.com/prometheus/v1/write?prometheus_server=ceph-cluster"
      authorization:
        credentials:
          key: licenseKey
          name: newrelic-secret
      writeRelabelConfigs:
        - sourceLabels: [__name__]
          regex: "ceph_.*"
          action: keep
```

## Step 3 - Install the New Relic Kubernetes Integration

Alternatively, use the New Relic bundle for broader Kubernetes coverage:

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update

helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic --create-namespace \
  --set global.licenseKey=<YOUR_LICENSE_KEY> \
  --set global.cluster=my-ceph-cluster \
  --set newrelic-prometheus-agent.enabled=true \
  --set newrelic-prometheus-agent.config.kubernetes.integrations_filter.enabled=false
```

## Step 4 - Create a Ceph Scrape Config for New Relic Agent

```yaml
# newrelic-prometheus-config.yaml
config:
  scrape_configs:
    - job_name: ceph-mgr
      static_configs:
        - targets:
            - rook-ceph-mgr.rook-ceph.svc.cluster.local:9283
      metric_relabel_configs:
        - source_labels: [__name__]
          regex: "ceph_(health_status|osd_up|osd_in|pool_bytes_used|pool_max_avail|mon_quorum_status)"
          action: keep
```

## Step 5 - Build NRQL Queries for Ceph

Once metrics arrive in New Relic, use NRQL to query them:

```sql
-- Overall cluster health over time
SELECT latest(ceph_health_status)
FROM Metric
WHERE prometheus_server = 'ceph-cluster'
TIMESERIES AUTO

-- OSD availability ratio
SELECT (sum(ceph_osd_up) / sum(ceph_osd_in)) * 100 AS 'OSD Up %'
FROM Metric
SINCE 1 hour ago

-- Pool capacity utilization
SELECT latest(ceph_pool_bytes_used) / (latest(ceph_pool_bytes_used) + latest(ceph_pool_max_avail)) * 100 AS 'Usage %'
FROM Metric
FACET pool_name
```

## Step 6 - Set Up Alert Policies

```bash
# Create NRQL alert condition via New Relic NerdGraph API
curl -X POST https://api.newrelic.com/graphql \
  -H "Api-Key: <YOUR_NEW_RELIC_USER_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($accountId: Int!, $policyId: ID!, $condition: AlertsNrqlConditionStaticInput!) { alertsNrqlConditionStaticCreate(accountId: $accountId, policyId: $policyId, condition: $condition) { id name } }",
    "variables": {
      "accountId": <ACCOUNT_ID>,
      "policyId": "<POLICY_ID>",
      "condition": {
        "name": "Ceph Health Degraded",
        "enabled": true,
        "nrql": {
          "query": "SELECT latest(ceph_health_status) FROM Metric WHERE prometheus_server = '\''ceph-cluster'\''"
        },
        "signal": { "aggregationWindow": 60 },
        "terms": [{
          "threshold": 1,
          "thresholdOccurrences": "AT_LEAST_ONCE",
          "thresholdDuration": 300,
          "operator": "ABOVE_OR_EQUALS",
          "priority": "CRITICAL"
        }]
      }
    }
  }'
```

## Summary

Integrating Ceph metrics with New Relic involves enabling the Ceph manager's Prometheus module and either using Prometheus remote_write to forward metrics to New Relic's ingest API or deploying the New Relic Kubernetes bundle. NRQL provides flexible querying for building Ceph dashboards and alert policies to track cluster health.
