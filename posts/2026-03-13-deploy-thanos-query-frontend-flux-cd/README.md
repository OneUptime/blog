# Deploy Thanos Query Frontend with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Thanos, Query Frontend, Prometheus, Caching, Flux CD, GitOps, Kubernetes, Metrics

Description: Deploy the Thanos Query Frontend on Kubernetes using Flux CD to add query splitting, caching, and retry logic in front of the Thanos Querier. This guide improves long-range query performance and reduces backend load.

---

## Introduction

The Thanos Query Frontend is an optional component that sits in front of the Thanos Querier and provides query splitting, result caching, and retry logic. For long-range queries spanning weeks or months, the frontend splits them into smaller day-sized chunks that can be executed in parallel and cached independently.

This component significantly reduces Thanos Querier load for repeated queries—such as those from Grafana dashboards—by serving cached results from an in-memory or Memcached backend. Deploying it via Flux CD ensures cache configuration and query splitting parameters are version-controlled.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Thanos Querier deployed and accessible (see the Thanos Sidecar guide)
- Optional: Memcached deployed for shared caching across frontend replicas
- `flux` and `kubectl` CLIs installed

## Step 1: Deploy Memcached for Query Result Caching (Optional)

A shared Memcached cache allows multiple Query Frontend replicas to share results.

```yaml
# clusters/my-cluster/thanos/memcached-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: thanos-memcached
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: memcached
      version: ">=6.0.0 <7.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    replicaCount: 2
    # Allocate sufficient memory for caching query results
    resources:
      requests:
        memory: "1Gi"
      limits:
        memory: "2Gi"
```

## Step 2: Deploy the Thanos Query Frontend via HelmRelease

```yaml
# clusters/my-cluster/thanos/query-frontend-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: thanos-query-frontend
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: thanos
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    # Enable only the Query Frontend component
    queryFrontend:
      enabled: true
      # Scale the frontend horizontally; Memcached ensures cache is shared
      replicaCount: 2
      # Point the frontend at the Thanos Querier service
      config: |-
        type: IN-MEMORY
        config:
          max_size: 512MB
          max_item_size: 10MB
          validity: 6h
      extraFlags:
        # Target: the Thanos Querier
        - --query-frontend.downstream-url=http://thanos-query.monitoring.svc:9090
        # Split long queries into daily chunks for parallel execution
        - --query-range.split-interval=24h
        # Maximum number of retries on query failure
        - --query-range.max-retries-per-request=3
        # Align query time range to split intervals for better cache hit rates
        - --query-range.align-range-with-step
      serviceMonitor:
        enabled: true
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"

    # Disable all other components
    query:
      enabled: false
    compactor:
      enabled: false
    storegateway:
      enabled: false
```

## Step 3: Update Grafana to Use Query Frontend

Point Grafana's Prometheus/Thanos datasource at the Query Frontend instead of directly at the Querier.

```yaml
# Update Grafana datasource to route through the Query Frontend
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-thanos-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  thanos-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Thanos
        type: prometheus
        # Point at Query Frontend, not directly at Querier
        url: http://thanos-query-frontend.monitoring.svc:9090
        jsonData:
          timeInterval: "30s"
          # Enable Thanos-specific features in the datasource
          customQueryParameters: "dedup=true&partial_response=true"
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/thanos/query-frontend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: thanos-query-frontend
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/thanos/query-frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: thanos-querier
```

## Best Practices

- Set `--query-range.split-interval=24h` for most workloads; this aligns with Thanos block boundaries and maximizes cache reuse.
- Use `--query-range.align-range-with-step` so repeated dashboard queries produce identical time ranges that cache hits can serve.
- Deploy at least 2 Query Frontend replicas with a shared Memcached backend for HA without duplicate cache misses.
- Monitor cache hit rates via the Query Frontend metrics; low hit rates indicate too-short `validity` settings or highly dynamic queries.
- Always have Grafana route through the Query Frontend; bypassing it loses all query splitting and caching benefits.

## Conclusion

The Thanos Query Frontend, managed via Flux CD, dramatically improves long-range query performance by splitting, caching, and retrying queries transparently. Adding it to your Thanos stack is a GitOps change that requires no application-side modifications and immediately benefits all Grafana dashboard users.
