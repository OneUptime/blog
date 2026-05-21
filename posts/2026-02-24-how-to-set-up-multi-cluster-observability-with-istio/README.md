# How to Set Up Multi-Cluster Observability with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Multi-Cluster, Tracing, Kiali

Description: How to configure distributed tracing, logging, and service graph visualization across a multi-cluster Istio mesh for full observability.

---

Observability in a single Istio cluster is well-documented. You deploy Prometheus, Grafana, Jaeger, and Kiali, and you get metrics, traces, and a service graph. But when traffic spans multiple clusters, you need to think about how to correlate data across cluster boundaries so you can see the full picture.

This post covers setting up distributed tracing, centralized logging, and multi-cluster Kiali for a unified view of your service mesh.

## The Multi-Cluster Observability Challenge

In a multi-cluster mesh, a single user request might traverse services in multiple clusters:

```text
User -> Frontend (cluster1) -> Reviews (cluster2) -> Ratings (cluster1)
```

If each cluster has its own isolated observability stack, you see three separate pieces of the puzzle but never the complete trace. You need to:

1. Propagate trace context headers across cluster boundaries
2. Send all traces to a single backend
3. Aggregate metrics from all clusters
4. Build a unified service graph

## Distributed Tracing Across Clusters

Istio sidecars automatically generate trace spans and forward trace headers (B3, W3C Trace Context) to the proxied application. Applications still need to propagate those headers from inbound requests to outbound requests so spans can be stitched into a complete trace. For cross-cluster tracing, you also need to make sure all clusters send spans to the same tracing backend.

### Deploy a Central Jaeger Instance

Instead of running Jaeger in each cluster, deploy a single Jaeger instance (or use a managed service like Grafana Tempo or AWS X-Ray):

```yaml
# Deploy Jaeger with persistent storage

apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.76
        env:
        - name: SPAN_STORAGE_TYPE
          value: elasticsearch
        - name: ES_SERVER_URLS
          value: http://elasticsearch:9200
        ports:
        - containerPort: 16686
          name: query
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 14268
          name: collector
```

Expose the Jaeger collector so all clusters can send spans:

```bash
kubectl expose deployment jaeger -n observability --type=LoadBalancer --port=4317 --target-port=4317 --name=jaeger-collector
```

### Configure Istio to Send Traces to Central Jaeger

In each cluster, configure the tracing provider in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: jaeger
      opentelemetry:
        service: jaeger-collector.observability.example.com
        port: 4317
    defaultProviders:
      tracing:
      - jaeger
```

If you are using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 10.0
```

Apply this to both clusters:

```bash
kubectl apply -f telemetry.yaml --context="${CTX_CLUSTER1}"
kubectl apply -f telemetry.yaml --context="${CTX_CLUSTER2}"
```

### Verify Cross-Cluster Traces

Send some traffic that spans clusters, then check Jaeger:

```bash
kubectl port-forward deployment/jaeger 16686:16686 -n observability
```

Open http://localhost:16686 and search for traces. You should see complete traces that show spans from both clusters. Add a cluster tag, such as `cluster_id`, to each span if you want to filter traces by cluster in Jaeger.

## Centralized Logging

### Using Loki for Multi-Cluster Logs

Deploy Grafana Loki as a central log aggregation backend:

```yaml
# loki-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: observability
data:
  loki.yaml: |
    auth_enabled: true
    server:
      http_listen_port: 3100
    common:
      storage:
        s3:
          bucketnames: loki-logs
          endpoint: s3.amazonaws.com
          region: us-east-1
    schema_config:
      configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h
```

In each cluster, deploy Grafana Alloy to ship logs:

```yaml
# alloy-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-config
  namespace: observability
data:
  config.alloy: |
    discovery.kubernetes "pods" {
      role = "pod"
    }

    loki.source.kubernetes "pods" {
      targets    = discovery.kubernetes.pods.targets
      forward_to = [loki.process.cluster_labels.receiver]
    }

    loki.process "cluster_labels" {
      stage.static_labels {
        values = {
          cluster = "cluster1"
        }
      }

      forward_to = [loki.write.central.receiver]
    }

    loki.write "central" {
      endpoint {
        url       = "https://loki.observability.example.com/loki/api/v1/push"
        tenant_id = "cluster1"
      }
    }
```

The `cluster` label on logs lets you filter by cluster in Grafana.

## Multi-Cluster Access Logging

Enable Istio access logging, then add cluster identification in your log pipeline:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

The access logs include request metadata from Envoy. Add cluster labels in your log shipper or a custom access log format if you need to filter access logs by cluster.

## Multi-Cluster Kiali

Kiali is the service mesh observability dashboard for Istio. For multi-cluster visibility, Kiali needs access to all clusters in the mesh.

### Configure Kiali for Multi-Cluster

Deploy Kiali in one cluster and configure it to read from all clusters:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  clustering:
    clusters:
    - name: cluster2
      secret_name: kiali-remote-cluster2
  external_services:
    prometheus:
      url: http://prometheus.observability.example.com:9090
    tracing:
      enabled: true
      provider: jaeger
      use_grpc: false
      internal_url: http://jaeger-query.observability.example.com:16686
      external_url: http://jaeger-query.observability.example.com:16686
    grafana:
      enabled: true
      url: http://grafana.observability.example.com:3000
```

Create a remote secret for Kiali to access the remote cluster:

```bash
# Create a service account for Kiali in cluster2
kubectl create serviceaccount kiali-remote -n istio-system --context="${CTX_CLUSTER2}"
kubectl create clusterrolebinding kiali-remote --clusterrole=kiali --serviceaccount=istio-system:kiali-remote --context="${CTX_CLUSTER2}"

# Get the token
TOKEN=$(kubectl create token kiali-remote -n istio-system --context="${CTX_CLUSTER2}" --duration=8760h)
SERVER=$(kubectl config view --raw --context="${CTX_CLUSTER2}" -o jsonpath='{.clusters[0].cluster.server}')
CA_DATA=$(kubectl config view --raw --context="${CTX_CLUSTER2}" -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# Create the remote secret in cluster1. Kiali expects a kubeconfig in the secret.
cat <<EOF | kubectl apply --context="${CTX_CLUSTER1}" -f -
apiVersion: v1
kind: Secret
metadata:
  name: kiali-remote-cluster2
  namespace: istio-system
  labels:
    kiali.io/multiCluster: "true"
stringData:
  cluster2: |
    apiVersion: v1
    kind: Config
    preferences: {}
    current-context: cluster2
    contexts:
    - name: cluster2
      context:
        cluster: cluster2
        user: cluster2
    users:
    - name: cluster2
      user:
        token: ${TOKEN}
    clusters:
    - name: cluster2
      cluster:
        server: ${SERVER}
        certificate-authority-data: ${CA_DATA}
EOF
```

### Kiali Multi-Cluster Service Graph

With multi-cluster configured, Kiali's service graph shows traffic flowing between clusters. Cross-cluster edges are displayed with cluster labels, and you can filter by cluster.

## Grafana Dashboards for Cross-Cluster Visibility

Create dashboards that show cross-cluster traffic patterns. Key panels:

### Service Map by Cluster

```text
# Request rate grouped by source and destination cluster
sum(rate(istio_requests_total{reporter="source"}[5m])) by (source_cluster, destination_cluster, destination_service)
```

### Cross-Cluster Latency

```text
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="source",
    source_cluster!=destination_cluster
  }[5m])) by (le, source_cluster, destination_cluster)
)
```

### Error Rate by Cluster

```text
sum(rate(istio_requests_total{response_code=~"5..", reporter="source"}[5m])) by (destination_cluster)
/
sum(rate(istio_requests_total{reporter="source"}[5m])) by (destination_cluster)
```

## Summary

Multi-cluster observability requires centralizing your telemetry data. Send traces to a single Jaeger or Tempo instance, ship logs to centralized Loki, aggregate metrics with Prometheus federation or remote write, and configure Kiali for multi-cluster access. The critical ingredient is adding `cluster` labels to all telemetry data so you can filter and correlate across cluster boundaries. Istio's built-in `source_cluster` and `destination_cluster` metric labels make this straightforward for metrics, and the same trace context headers propagate naturally across clusters for distributed tracing.
