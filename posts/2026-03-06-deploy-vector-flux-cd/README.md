# How to Deploy Vector with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, vector, logging, metrics, observability, gitops, kubernetes, data pipeline

Description: A practical guide to deploying Vector on Kubernetes using Flux CD for high-performance observability data collection, transformation, and routing.

---

## Introduction

Vector is a high-performance observability data pipeline built by Datadog. It collects, transforms, and routes logs, metrics, and traces with exceptional efficiency. Written in Rust, Vector delivers better performance and lower resource usage compared to traditional log collectors. Deploying Vector with Flux CD brings GitOps practices to your observability pipeline, making configuration changes auditable and reproducible.

This guide covers deploying Vector in both Agent (DaemonSet) and Aggregator (StatefulSet) roles using Flux CD, configuring data transformations, and routing to multiple sinks.

## Prerequisites

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster

## Repository Structure

```
clusters/
  my-cluster/
    vector/
      namespace.yaml
      helmrepository.yaml
      vector-agent.yaml
      vector-aggregator.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/vector/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vector
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/vector/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: vector
  namespace: vector
spec:
  interval: 1h
  url: https://helm.vector.dev
```

## Step 3: Deploy Vector Agent

The Vector Agent runs as a DaemonSet on every node, collecting logs and host metrics.

```yaml
# clusters/my-cluster/vector/vector-agent.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: vector-agent
  namespace: vector
spec:
  interval: 30m
  chart:
    spec:
      chart: vector
      version: "0.35.x"
      sourceRef:
        kind: HelmRepository
        name: vector
      interval: 12h
  timeout: 10m
  values:
    # Deploy as DaemonSet for node-level collection
    role: Agent

    # Resource allocation
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi

    # Run on all nodes
    tolerations:
      - operator: Exists

    # Vector configuration using the Vector config language
    customConfig:
      # Data directory for persistence
      data_dir: /vector-data-dir

      api:
        # Enable the Vector API for monitoring
        enabled: true
        address: 0.0.0.0:8686

      sources:
        # Collect Kubernetes logs from all containers
        kubernetes_logs:
          type: kubernetes_logs
          # Automatically discover and tail container logs
          self_node_name: "${VECTOR_SELF_NODE_NAME}"
          # Exclude Vector's own logs
          exclude_paths_glob_patterns:
            - "**/vector*"

        # Collect host-level metrics
        host_metrics:
          type: host_metrics
          collectors:
            - cpu
            - disk
            - filesystem
            - load
            - memory
            - network
          # Scrape interval in seconds
          scrape_interval_secs: 30

        # Accept internal Vector metrics
        internal_metrics:
          type: internal_metrics

      transforms:
        # Parse and enrich Kubernetes logs
        parse_logs:
          type: remap
          inputs:
            - kubernetes_logs
          # VRL (Vector Remap Language) for log transformation
          source: |
            # Parse JSON log messages
            parsed, err = parse_json(.message)
            if err == null {
              . = merge(., parsed)
            }

            # Add cluster identification
            .cluster = "my-cluster"

            # Extract log level if present
            .level = .level || .severity || "info"

            # Remove unnecessary fields to reduce storage
            del(.kubernetes.pod_labels."pod-template-hash")
            del(.kubernetes.pod_labels."controller-revision-hash")

        # Filter out noisy health check logs
        filter_noise:
          type: filter
          inputs:
            - parse_logs
          condition:
            type: vrl
            source: |
              # Drop health check and readiness probe logs
              !match(string!(.message), r'GET /health') &&
              !match(string!(.message), r'GET /ready')

        # Add metrics tags for host metrics
        tag_metrics:
          type: remap
          inputs:
            - host_metrics
          source: |
            .tags.cluster = "my-cluster"

      sinks:
        # Forward logs to the Vector Aggregator
        to_aggregator:
          type: vector
          inputs:
            - filter_noise
          address: vector-aggregator.vector.svc:6000
          # Buffer configuration
          buffer:
            type: disk
            max_size: 268435488
            when_full: block

        # Forward metrics to the Aggregator
        metrics_to_aggregator:
          type: vector
          inputs:
            - tag_metrics
            - internal_metrics
          address: vector-aggregator.vector.svc:6000
```

## Step 4: Deploy Vector Aggregator

The Aggregator receives data from agents, applies additional transformations, and routes to final destinations.

```yaml
# clusters/my-cluster/vector/vector-aggregator.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: vector-aggregator
  namespace: vector
spec:
  interval: 30m
  chart:
    spec:
      chart: vector
      version: "0.35.x"
      sourceRef:
        kind: HelmRepository
        name: vector
      interval: 12h
  timeout: 10m
  values:
    # Deploy as StatefulSet for the aggregator role
    role: Stateless-Aggregator

    # Scale the aggregator for throughput
    replicas: 2

    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: "1"
        memory: 1Gi

    customConfig:
      data_dir: /vector-data-dir

      api:
        enabled: true
        address: 0.0.0.0:8686

      sources:
        # Receive data from Vector Agents
        vector_agents:
          type: vector
          address: 0.0.0.0:6000

      transforms:
        # Route logs by namespace for different handling
        route_by_namespace:
          type: route
          inputs:
            - vector_agents
          route:
            # Production namespace logs get special treatment
            production: '.kubernetes.pod_namespace == "production"'
            # System namespace logs
            system: '.kubernetes.pod_namespace == "kube-system"'
            # Everything else
            default: 'exists(.kubernetes)'

        # Enrich production logs with additional context
        enrich_production:
          type: remap
          inputs:
            - route_by_namespace.production
          source: |
            .environment = "production"
            .retention_days = 90
            # Redact sensitive data patterns
            .message = redact(string!(.message), filters: ["pattern"], redactor: {"type": "text", "replacement": "[REDACTED]"}, patterns: [r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'])

        # Reduce system log verbosity
        reduce_system:
          type: filter
          inputs:
            - route_by_namespace.system
          condition:
            type: vrl
            source: |
              .level != "debug" && .level != "trace"

      sinks:
        # Send production logs to Elasticsearch
        elasticsearch_prod:
          type: elasticsearch
          inputs:
            - enrich_production
          endpoints:
            - "http://elasticsearch-master.elastic-stack.svc:9200"
          mode: bulk
          bulk:
            index: "prod-logs-%Y-%m-%d"
          # Batch settings for throughput
          batch:
            max_bytes: 10485760
            timeout_secs: 5

        # Send system logs to a separate index
        elasticsearch_system:
          type: elasticsearch
          inputs:
            - reduce_system
          endpoints:
            - "http://elasticsearch-master.elastic-stack.svc:9200"
          mode: bulk
          bulk:
            index: "system-logs-%Y-%m-%d"

        # Send all other logs to Loki
        loki_default:
          type: loki
          inputs:
            - route_by_namespace.default
          endpoint: "http://loki-gateway.loki.svc:80"
          labels:
            cluster: "my-cluster"
            namespace: "{{ kubernetes.pod_namespace }}"
            app: "{{ kubernetes.pod_labels.app }}"
          encoding:
            codec: json

        # Send metrics to Prometheus Remote Write
        prometheus:
          type: prometheus_remote_write
          inputs:
            - vector_agents
          endpoint: "http://victoriametrics.victoriametrics.svc:8428/api/v1/write"
          # Only forward metric events
          healthcheck:
            enabled: true

    # Persistent storage for the aggregator buffer
    persistence:
      enabled: true
      size: 20Gi
      storageClass: standard
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/vector/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - vector-aggregator.yaml
  - vector-agent.yaml
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/vector-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vector
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: vector
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/vector
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: vector-agent
      namespace: vector
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: vector-aggregator
      namespace: vector
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations vector

# Check HelmReleases
flux get helmreleases -n vector

# Verify agent pods running on all nodes
kubectl get pods -n vector -l app.kubernetes.io/instance=vector-agent -o wide

# Verify aggregator pods
kubectl get pods -n vector -l app.kubernetes.io/instance=vector-aggregator

# Check Vector API for component topology
kubectl exec -n vector $(kubectl get pods -n vector -l app.kubernetes.io/instance=vector-agent -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:8686/api/health

# View Vector internal metrics
kubectl exec -n vector $(kubectl get pods -n vector -l app.kubernetes.io/instance=vector-agent -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:8686/api/graphql -d '{"query": "{ componentErrors { totalCount } }"}'
```

## Troubleshooting

- **Agent not collecting logs**: Check if the kubernetes_logs source has the correct permissions. Verify the ServiceAccount has RBAC access to list and watch pods.
- **Aggregator not receiving data**: Verify the agent sink address matches the aggregator service DNS. Check network policies between namespaces.
- **VRL transformation errors**: Use the `vector vrl` CLI tool to test transformations locally before deploying. Check Vector logs for VRL compilation errors.
- **High disk buffer usage**: Increase the `max_size` for disk buffers or check if the downstream sink is healthy and accepting data.
- **Data loss during restarts**: Ensure disk buffers are configured with persistent volumes. Memory buffers lose data on pod restart.

## Conclusion

You have deployed Vector in a two-tier architecture on Kubernetes using Flux CD. The Agent tier collects logs and metrics from every node, while the Aggregator tier handles routing, transformation, and delivery to multiple backends. Vector's VRL language provides powerful data transformation without the overhead of plugin ecosystems. All configuration is managed through Git, enabling teams to propose pipeline changes via pull requests and safely roll back if issues arise.
