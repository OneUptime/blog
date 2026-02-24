# How to Configure Telemetry for Multi-Cluster Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Telemetry, Observability, Kubernetes

Description: How to set up unified telemetry collection across multiple Kubernetes clusters running Istio for consistent observability.

---

Running Istio across multiple clusters is increasingly common for high availability, geographic distribution, and organizational separation. But multi-cluster setups create a real challenge for observability. Traces that span clusters, metrics that need to be aggregated across clusters, and logs that need to be correlated - all of this requires careful telemetry configuration.

Here is how to set up telemetry that works across a multi-cluster Istio mesh.

## Multi-Cluster Telemetry Challenges

When your mesh spans multiple clusters, you run into several problems that single-cluster setups do not have:

1. **Distributed traces break at cluster boundaries** - If a request goes from Cluster A to Cluster B, the trace needs to be stitched together
2. **Metrics need cluster identification** - You need to know which cluster a metric came from
3. **Centralized vs. distributed collection** - Do you collect telemetry in each cluster or centralize everything?
4. **Network connectivity** - The telemetry infrastructure in one cluster needs to reach backends that might be in another cluster

## Architecture Options

There are two main approaches:

**Centralized Collection** - All clusters send telemetry to a single backend cluster:

```
Cluster A (workloads) --> Central Collector --> Backends
Cluster B (workloads) --> Central Collector --> Backends
Cluster C (workloads) --> Central Collector --> Backends
```

**Federated Collection** - Each cluster has its own collector and backend, with a federation layer:

```
Cluster A --> Local Collector --> Local Backend --> Federation
Cluster B --> Local Collector --> Local Backend --> Federation
Cluster C --> Local Collector --> Local Backend --> Federation
```

Centralized is simpler but requires cross-cluster network connectivity. Federated is more resilient but more complex to set up.

## Adding Cluster Identity to Telemetry

The first and most important step is adding a cluster identifier to all telemetry data. Without this, you cannot tell which cluster a metric or trace came from.

In each cluster's Istio installation:

```yaml
# Cluster A
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster-a
spec:
  meshConfig:
    defaultConfig:
      extraStatTags:
        - "cluster_name"
      proxyMetadata:
        ISTIO_META_CLUSTER_ID: "cluster-a"
  values:
    global:
      meshID: "my-mesh"
      multiCluster:
        clusterName: "cluster-a"
      network: "network-a"
```

```yaml
# Cluster B
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster-b
spec:
  meshConfig:
    defaultConfig:
      extraStatTags:
        - "cluster_name"
      proxyMetadata:
        ISTIO_META_CLUSTER_ID: "cluster-b"
  values:
    global:
      meshID: "my-mesh"
      multiCluster:
        clusterName: "cluster-b"
      network: "network-b"
```

Then use the Telemetry API to include the cluster name in metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: cluster-identity
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            cluster_name:
              operation: UPSERT
              value: "node.metadata['CLUSTER_ID']"
```

## Centralized Collection Setup

For centralized collection, deploy the OTel Collector in a central cluster and configure each cluster to send data to it.

In the central cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: central-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 10s
        send_batch_size: 2048
      memory_limiter:
        check_interval: 1s
        limit_mib: 4096

    exporters:
      otlp/tempo:
        endpoint: tempo.observability:4317
        tls:
          insecure: true
      prometheusremotewrite:
        endpoint: http://thanos-receive.observability:19291/api/v1/receive

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp/tempo]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
```

Expose the Collector via a LoadBalancer or ingress:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: central-collector
  namespace: observability
spec:
  type: LoadBalancer
  selector:
    app: central-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
```

In each workload cluster, configure Istio to send traces to the central collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: central-otel
        opentelemetry:
          service: central-collector.observability.central-cluster.example.com
          port: 4317
```

## Cross-Cluster Trace Propagation

For distributed traces to work across clusters, the trace context headers must be propagated through the entire call chain. Istio handles this automatically for mesh traffic, but your applications need to propagate headers for intra-service calls.

The critical headers to propagate:

```
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
traceparent
tracestate
```

In your application code, forward these headers on any outgoing HTTP requests:

```python
import requests

def handle_request(incoming_request):
    headers_to_propagate = [
        'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
        'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
        'traceparent', 'tracestate'
    ]

    outgoing_headers = {
        h: incoming_request.headers[h]
        for h in headers_to_propagate
        if h in incoming_request.headers
    }

    response = requests.get(
        'http://next-service:8080/api',
        headers=outgoing_headers
    )
    return response
```

## Federated Prometheus for Multi-Cluster Metrics

For metrics, Thanos or Cortex provides federation across clusters. Each cluster runs its own Prometheus that scrapes local proxies:

```yaml
# In each cluster - Prometheus with Thanos sidecar
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: observability
spec:
  template:
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:v2.48.0
          args:
            - --storage.tsdb.path=/data
            - --config.file=/etc/prometheus/prometheus.yml
            - --storage.tsdb.min-block-duration=2h
            - --storage.tsdb.max-block-duration=2h
        - name: thanos-sidecar
          image: thanosio/thanos:v0.34.0
          args:
            - sidecar
            - --tsdb.path=/data
            - --prometheus.url=http://localhost:9090
            - --objstore.config-file=/etc/thanos/bucket.yml
```

Add external labels to identify the cluster:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  external_labels:
    cluster: "cluster-a"
    region: "us-east-1"
```

Then deploy Thanos Query in the central cluster to query across all Prometheus instances:

```bash
helm install thanos bitnami/thanos -n observability \
  --set query.stores=["cluster-a-thanos-sidecar:10901","cluster-b-thanos-sidecar:10901"]
```

## Consistent Sampling Across Clusters

Set the same sampling rate in all clusters to get consistent trace coverage:

```yaml
# Apply in every cluster
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: unified-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: central-otel
      randomSamplingPercentage: 5.0
      customTags:
        cluster:
          literal:
            value: "cluster-a"  # Change per cluster
        region:
          literal:
            value: "us-east-1"  # Change per cluster
```

The custom tags on traces are essential for filtering traces by cluster in your trace UI.

## Verifying Cross-Cluster Telemetry

Test the full pipeline by generating cross-cluster traffic:

```bash
# From cluster A, call a service in cluster B
kubectl exec deploy/sleep -c sleep -- curl -s http://remote-service.default.svc.cluster.local:8080/status/200
```

Then verify:

```bash
# Check local metrics have cluster labels
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats/prometheus | grep cluster_name

# Check traces in the central backend
# Look for traces that span multiple cluster values

# Check Thanos Query can see metrics from all clusters
kubectl port-forward svc/thanos-query -n observability 10902:10902
```

Multi-cluster telemetry takes more upfront work than single-cluster, but it is essential for running a reliable multi-cluster mesh. The cluster identity labels and centralized collection pattern will save you when you need to debug a cross-cluster issue at 2 AM.
