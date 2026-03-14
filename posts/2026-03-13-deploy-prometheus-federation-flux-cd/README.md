# Deploy Prometheus Federation with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Prometheus, Federation, Multi-Cluster, Observability

Description: Set up Prometheus federation on Kubernetes using Flux CD to aggregate metrics from multiple cluster-level Prometheus instances into a single global Prometheus.

---

## Introduction

Prometheus federation allows a global Prometheus server to scrape aggregated metrics from multiple leaf Prometheus servers. This pattern is essential in multi-cluster or multi-team environments where each cluster or team runs its own Prometheus instance but a centralized view is needed for global dashboards, cross-team alerts, and long-term retention.

Managing federation configuration via Flux CD ensures that as new clusters are onboarded or removed, the scrape configuration is updated through a pull request rather than manual edits to the global Prometheus config.

This guide deploys a global Prometheus using kube-prometheus-stack and configures it to federate from two leaf Prometheus instances.

## Prerequisites

- A Kubernetes cluster for the global Prometheus (can be the same cluster for testing)
- Two or more leaf Prometheus instances accessible over the network
- Flux CD bootstrapped on the global cluster
- `flux` and `kubectl` CLIs installed

## Step 1: Deploy the Global Prometheus via HelmRelease

Deploy a global Prometheus with an extended retention period using kube-prometheus-stack.

```yaml
# clusters/global/monitoring/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 12h
  url: https://prometheus-community.github.io/helm-charts
---
# clusters/global/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: ">=55.0.0 <56.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    prometheus:
      prometheusSpec:
        # Retain global metrics for 1 year
        retention: 365d
        # External labels identify this as the global aggregation instance
        externalLabels:
          cluster: global
          environment: production
        # Additional scrape configuration for federation targets
        additionalScrapeConfigs:
          - job_name: "federate-cluster-a"
            # Use the /federate endpoint to pull aggregated metrics
            honor_labels: true
            metrics_path: "/federate"
            params:
              # Match metric families to federate - keep high-value aggregated metrics
              "match[]":
                - '{__name__=~"job:.*"}'
                - '{__name__=~"node_.*"}'
                - '{__name__=~"kube_.*"}'
                - '{__name__=~"container_.*"}'
            static_configs:
              - targets:
                  # Leaf Prometheus endpoint for cluster-a
                  - "prometheus-operated.monitoring.svc.cluster-a.local:9090"
                labels:
                  cluster: cluster-a

          - job_name: "federate-cluster-b"
            honor_labels: true
            metrics_path: "/federate"
            params:
              "match[]":
                - '{__name__=~"job:.*"}'
                - '{__name__=~"node_.*"}'
                - '{__name__=~"kube_.*"}'
            static_configs:
              - targets:
                  - "prometheus-operated.monitoring.svc.cluster-b.local:9090"
                labels:
                  cluster: cluster-b
```

## Step 2: Expose Leaf Prometheus Instances

On each leaf cluster, ensure the Prometheus service is accessible. Use a Kubernetes Service with appropriate network policies or an Ingress.

```yaml
# On leaf cluster: expose Prometheus for federation scraping
apiVersion: v1
kind: Service
metadata:
  name: prometheus-federation
  namespace: monitoring
spec:
  selector:
    # Match the Prometheus Operator-managed Prometheus pods
    app.kubernetes.io/name: prometheus
    prometheus: kube-prometheus-stack-prometheus
  ports:
    # Expose Prometheus HTTP API including /federate endpoint
    - name: http
      port: 9090
      targetPort: 9090
  type: ClusterIP
```

## Step 3: Create the PrometheusRule for Cross-Cluster Alerts

Define recording rules on the global Prometheus that aggregate metrics across clusters.

```yaml
# clusters/global/monitoring/global-recording-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: global-federation-rules
  namespace: monitoring
  labels:
    # Label required for Prometheus Operator to pick up this rule
    release: kube-prometheus-stack
spec:
  groups:
    - name: global.federation
      interval: 1m
      rules:
        # Aggregate CPU usage across all clusters
        - record: global:cluster_cpu_usage:ratio
          expr: |
            avg by (cluster) (
              1 - rate(node_cpu_seconds_total{mode="idle"}[5m])
            )
        # Aggregate pod count per cluster
        - record: global:kube_running_pods:count
          expr: |
            sum by (cluster, namespace) (
              kube_pod_status_phase{phase="Running"}
            )
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/global/monitoring/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: global-prometheus
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/global/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Best Practices

- Use `honor_labels: true` in federation scrape configs to preserve the original job and instance labels from leaf Prometheus instances.
- Apply `match[]` filters to only federate the metrics you actually query on the global instance; federating all metrics creates unnecessary load.
- Add `cluster` external labels on every leaf Prometheus so federated metrics are distinguishable in the global instance.
- Use recording rules on leaf instances to pre-aggregate high-cardinality metrics before federation; this reduces the volume of metrics the global instance needs to ingest.
- Consider Thanos or Cortex for long-term multi-cluster storage; federation is a scrape-based mechanism and doesn't replace a proper remote storage solution.

## Conclusion

Prometheus federation, managed via Flux CD, gives you a GitOps-controlled global metrics aggregation layer across multiple clusters or teams. Adding a new federation target is a pull request, and every scrape configuration change is auditable and automatically reconciled by Flux.
