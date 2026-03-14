# How to Deploy Vector as a Log Pipeline with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Vector, Log Pipeline, Observability

Description: Deploy Vector log pipeline for high-performance log collection and transformation on Kubernetes using Flux CD GitOps workflows.

---

## Introduction

Vector is a high-performance observability data pipeline written in Rust. It can run as both a lightweight agent on every node (replacing Fluent Bit) and as a stateful aggregator (replacing Logstash or Fluentd). Its topology model — sources, transforms, and sinks connected in a directed acyclic graph — makes pipelines explicit, testable, and easy to reason about. Vector also handles metrics and traces, making it a unified observability pipeline tool.

Deploying Vector via Flux CD is straightforward: the official Helm chart exposes the entire Vector configuration through its `values.yaml`, which means your pipeline topology lives as a versioned YAML file in Git. Changes to transforms or sinks go through code review and are automatically reconciled by Flux.

This guide deploys Vector as a DaemonSet agent collecting Kubernetes logs, enriching them with pod metadata, and shipping to Elasticsearch with structured output.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Elasticsearch or another sink accessible from the cluster
- `kubectl` and `flux` CLIs installed
- Vector Helm repository access

## Step 1: Add the Vector HelmRepository

```yaml
# infrastructure/sources/vector-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: vector
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.vector.dev
```

## Step 2: Create the Namespace

```yaml
# infrastructure/logging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
```

## Step 3: Deploy Vector Agent as DaemonSet

Vector's pipeline is defined inline in the `customConfig` block. This example configures a source (Kubernetes logs), a transform (metadata enrichment + JSON parsing), and a sink (Elasticsearch).

```yaml
# infrastructure/logging/vector-agent.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: vector-agent
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: vector
      version: "0.36.1"
      sourceRef:
        kind: HelmRepository
        name: vector
        namespace: flux-system
  values:
    role: Agent   # DaemonSet mode

    resources:
      requests:
        cpu: "50m"
        memory: "128Mi"
      limits:
        cpu: "250m"
        memory: "256Mi"

    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule

    customConfig:
      # Data directory for disk buffers
      data_dir: /vector-data-dir

      sources:
        # Read logs from all Kubernetes containers on this node
        kubernetes_logs:
          type: kubernetes_logs
          auto_partial_merge: true

        # Collect Vector's own internal metrics
        vector_metrics:
          type: internal_metrics

      transforms:
        # Parse JSON application logs
        parse_json:
          type: remap
          inputs:
            - kubernetes_logs
          source: |
            if is_string(.message) {
              parsed, err = parse_json(.message)
              if err == null {
                . = merge(., parsed)
              }
            }
            # Add cluster identifier label
            .cluster = "production"

        # Route logs by namespace
        route_by_namespace:
          type: route
          inputs:
            - parse_json
          route:
            system: '.kubernetes.pod_namespace == "kube-system"'
            application: '.kubernetes.pod_namespace != "kube-system"'

      sinks:
        # Ship application logs to Elasticsearch
        elasticsearch_app:
          type: elasticsearch
          inputs:
            - route_by_namespace.application
          endpoints:
            - "http://elasticsearch-master.logging.svc.cluster.local:9200"
          mode: bulk
          bulk:
            index: "vector-app-%Y.%m.%d"
          encoding:
            codec: json
          buffer:
            type: disk
            max_size: 268435456  # 256 MiB

        # Ship system logs to a separate index
        elasticsearch_system:
          type: elasticsearch
          inputs:
            - route_by_namespace.system
          endpoints:
            - "http://elasticsearch-master.logging.svc.cluster.local:9200"
          mode: bulk
          bulk:
            index: "vector-system-%Y.%m.%d"
          encoding:
            codec: json

        # Expose Vector metrics to Prometheus
        prometheus_metrics:
          type: prometheus_exporter
          inputs:
            - vector_metrics
          address: "0.0.0.0:9090"
```

## Step 4: Deploy Vector Aggregator (Optional)

For large clusters, run a separate Vector aggregator that agents forward to, reducing Elasticsearch connection overhead.

```yaml
# infrastructure/logging/vector-aggregator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: vector-aggregator
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: vector
      version: "0.36.1"
      sourceRef:
        kind: HelmRepository
        name: vector
        namespace: flux-system
  values:
    role: Aggregator   # StatefulSet mode
    replicas: 2

    customConfig:
      data_dir: /vector-data-dir

      sources:
        # Accept logs from Vector agents
        vector_agent_input:
          type: vector
          address: "0.0.0.0:6000"

      sinks:
        elasticsearch_out:
          type: elasticsearch
          inputs:
            - vector_agent_input
          endpoints:
            - "http://elasticsearch-master.logging.svc.cluster.local:9200"
          mode: bulk
          bulk:
            index: "aggregated-%Y.%m.%d"
          encoding:
            codec: json
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/vector-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vector-pipeline
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: vector-agent
      namespace: logging
```

## Step 6: Verify the Pipeline

```bash
# Check Vector agent is running on all nodes
kubectl get daemonset vector-agent -n logging

# View Vector logs for pipeline activity
kubectl logs -l app.kubernetes.io/name=vector -n logging --tail=30

# Query Elasticsearch to confirm data
kubectl exec -n logging -it \
  $(kubectl get pod -n logging -l app=elasticsearch -o name | head -1) -- \
  curl -s "http://localhost:9200/vector-app-*/_count" | jq .
```

## Best Practices

- Use disk-based buffers (`type: disk`) in Vector sinks to survive pod restarts without losing events.
- Use the `route` transform to send different log streams to different sinks, keeping indexes lean and query performance high.
- Test Vector configurations locally using `vector validate --config vector.yaml` before committing to Git.
- Enable Vector's `acknowledgements` setting on sinks so the source waits for delivery confirmation before advancing the read offset.
- Scrape Vector's Prometheus metrics endpoint to monitor pipeline throughput and error rates.

## Conclusion

Vector deployed through Flux CD delivers a high-performance, unified observability pipeline that is fully described in Git. Its Rust implementation handles far higher throughput than JVM-based alternatives at a fraction of the memory cost. By expressing the entire topology — sources, transforms, sinks, and routing logic — in the HelmRelease values, you get a single, reviewable diff for every pipeline change, making your logging infrastructure as well-governed as your application code.
