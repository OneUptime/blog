# How to Optimize Rancher API Performance - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, API, Performance, Optimization, Kubernetes

Description: Optimize Rancher's API performance through connection pooling, caching, pagination, and API query optimization for faster management operations.

## Introduction

Rancher's API is the backbone of its management capabilities-used by the UI, CLI, Terraform provider, and automation scripts. Poor API performance manifests as slow UI, timing out kubectl operations, and failed automation. This guide covers diagnosing and optimizing Rancher API performance.

## Prerequisites

- Running Rancher installation
- Prometheus/Grafana monitoring stack
- kubectl and curl access

## Step 1: Diagnose API Performance Issues

```bash
# Measure API response times

time curl -sk \
  -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/v3/clusters" \
  | jq '.data | length'

# If Rancher API audit logging is enabled, inspect slow requests from the
# rancher-audit-log sidecar using the logged request/response timestamps
kubectl logs -n cattle-system deployment/rancher --all-pods=true \
  -c rancher-audit-log --since=10m \
  | jq -r 'select(.requestTimestamp and .responseTimestamp) |
      [.requestTimestamp, .responseTimestamp, .responseCode, .requestURI] | @tsv' \
  | python3 -c 'import sys; from datetime import datetime
for line in sys.stdin:
    start, end, code, uri = line.rstrip("\n").split("\t", 3)
    start_ts = datetime.fromisoformat(start.replace("Z", "+00:00"))
    end_ts = datetime.fromisoformat(end.replace("Z", "+00:00"))
    print(f"{int((end_ts - start_ts).total_seconds() * 1000)}\t{code}\t{uri}")' \
  | sort -rn | head -20

# Check established TCP connections to a Rancher pod
kubectl exec -n cattle-system \
  $(kubectl get pod -n cattle-system -l app=rancher -o name | head -n 1) \
  -- sh -c 'ss -Htan state established | wc -l'
```

## Step 2: Enable Rancher API Caching

```bash
# Rancher can use SQLite-backed caching for Server-Side Pagination.
# In Rancher v2.12+ this is enabled by default and controlled by the
# ui-sql-cache feature flag.

# Edit Rancher deployment
kubectl edit deployment rancher -n cattle-system

# Add these environment variables to set the default feature value explicitly
env:
  - name: CATTLE_FEATURES
    value: "ui-sql-cache=true"
  # Optional: encrypt cached objects written to disk
  - name: CATTLE_ENCRYPT_CACHE_ALL
    value: "true"
```

## Step 3: Use API Pagination Effectively

```bash
# Avoid fetching all resources at once
# Use pagination for large result sets

# Bad: fetch all pods across all clusters
curl -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/v3/pods"

# Good: follow the pagination.next link Rancher returns
PAGE_SIZE=100
NEXT_URL="https://rancher.example.com/v3/pods?limit=$PAGE_SIZE"

while [ -n "$NEXT_URL" ]; do
  RESPONSE=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "$NEXT_URL")

  echo "$RESPONSE" | jq '.data | length'

  NEXT_URL=$(echo "$RESPONSE" | jq -r '.pagination.next // empty')
done
```

## Step 4: Filter API Requests

```bash
# Use server-side filters to reduce response size

# Filter with Steve's server-side filter syntax
curl -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/v1/pods?filter=metadata.namespace=production"

# Exact match on pod name
curl -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/v1/pods?filter=metadata.name='myapp-abc123'"

# Filter through the Kubernetes proxy with label and field selectors
curl -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/k8s/clusters/c-xxxxx/api/v1/pods?\
labelSelector=app=myapp&fieldSelector=status.phase=Running"
```

## Step 5: Configure Connection Keep-Alive

```python
# Python client with connection pooling
import requests
from requests.adapters import HTTPAdapter

token = "your-api-token"

session = requests.Session()
adapter = HTTPAdapter(
    pool_connections=10,
    pool_maxsize=20,
    max_retries=3
)
session.mount('https://', adapter)
session.headers.update({'Authorization': f'Bearer {token}'})

# Reuse the session for multiple requests
# This avoids TLS handshake overhead
response = session.get('https://rancher.example.com/v3/clusters', timeout=30)
response.raise_for_status()
clusters = response.json()['data']
```

## Step 6: Use Watch for Real-Time Updates

```bash
# Instead of polling, use watch for real-time updates
# This reduces API load significantly

# Watch pod changes through Rancher's Kubernetes proxy
curl -N -H "Authorization: Bearer $TOKEN" \
  "https://rancher.example.com/k8s/clusters/c-xxxxx/api/v1/namespaces/production/pods?watch=true&labelSelector=app=myapp" | \
  jq -r 'select(.type == "ADDED" or .type == "MODIFIED") |
    "\(.type) \(.object.metadata.name): \(.object.status.phase)"'

# Use kubectl watch for managed clusters
kubectl get pods -n production -w --context=rancher-production
```

## Step 7: Implement Local Caching in Automation

```python
# Cache API responses locally with TTL
import time
import requests

CACHE_TTL = 60  # 60 seconds

class RancherClient:
    def __init__(self, url, token):
        self.url = url
        self.session = requests.Session()
        self.session.headers['Authorization'] = f'Bearer {token}'
        self._cluster_cache = {}
        self._cache_time = {}

    def get_clusters(self):
        cache_key = 'clusters'
        now = time.time()

        if cache_key in self._cluster_cache and \
           now - self._cache_time.get(cache_key, 0) < CACHE_TTL:
            return self._cluster_cache[cache_key]

        response = self.session.get(f'{self.url}/v3/clusters', timeout=30)
        response.raise_for_status()
        self._cluster_cache[cache_key] = response.json()['data']
        self._cache_time[cache_key] = now
        return self._cluster_cache[cache_key]
```

## Step 8: Monitor API Metrics

```yaml
# rancher-api-alerts.yaml - Prometheus alerts for API issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-api-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: rancher-api
      rules:
        - alert: RancherAPIHighLatency
          expr: |
            (
              sum(rate(steve_api_request_time_sum{resource!="subscribe"}[5m]))
              /
              sum(rate(steve_api_request_time_count{resource!="subscribe"}[5m]))
            ) > 2000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Rancher API average request time > 2 seconds"

        - alert: RancherAPIHighErrorRate
          expr: |
            sum(rate(steve_api_total_requests{code=~"5.."}[5m])) /
            clamp_min(sum(rate(steve_api_total_requests[5m])), 1) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Rancher API error rate > 5%"
```

## Conclusion

Rancher API performance optimization is an iterative process. Start by identifying slow endpoints through audit log analysis, then apply targeted fixes: verify SQLite-backed caching is enabled, use proper pagination and filtering, implement connection pooling in clients, and leverage watch instead of polling for real-time monitoring. For automation and Terraform workflows, adding local client-side caching for rarely-changing resources like cluster metadata can significantly reduce API load and improve overall management performance.
