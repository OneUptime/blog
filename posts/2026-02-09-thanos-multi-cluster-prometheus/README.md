# How to Use Thanos for Multi-Cluster Prometheus Metric Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Thanos, Monitoring, Multi-Cluster, Observability

Description: Learn how to implement Thanos for unified metric collection and long-term storage across multiple Kubernetes clusters with global query capabilities.

---

Prometheus provides excellent monitoring within a single Kubernetes cluster, but running multiple clusters creates fragmentation. You end up with separate Prometheus instances, each with its own data store, making it difficult to query metrics across your entire infrastructure or maintain long-term historical data.

Thanos solves these challenges by extending Prometheus with global query capabilities, unlimited metric retention using object storage, and high availability features. In this guide, you'll learn how to deploy and configure Thanos for multi-cluster Prometheus aggregation.

## Understanding Thanos Architecture

Thanos consists of several components that work together to extend Prometheus capabilities. The Sidecar runs alongside each Prometheus instance, uploading metrics to object storage and providing a gRPC interface for queries. The Store Gateway serves metrics from object storage. The Querier provides a unified query interface across all Prometheus instances and historical data. The Compactor downsamples and compacts metrics in object storage.

This architecture allows you to query metrics from multiple clusters as if they were a single data source while keeping unlimited historical data in cheap object storage.

## Installing Thanos Sidecar with Prometheus

Start by deploying Prometheus with the Thanos sidecar in each cluster. The sidecar handles uploading metrics to object storage and exposing them for querying.

Create an object storage configuration for Thanos:

```yaml
# thanos-storage-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
type: Opaque
stringData:
  objstore.yml: |
    type: S3
    config:
      bucket: thanos-metrics
      endpoint: s3.amazonaws.com
      region: us-east-1
      access_key: ${AWS_ACCESS_KEY}
      secret_key: ${AWS_SECRET_KEY}
```

Deploy Prometheus with Thanos sidecar using the Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
  labels:
    cluster: cluster-1
spec:
  replicas: 2
  retention: 24h  # Keep local data for 1 day
  externalLabels:
    cluster: cluster-1
    region: us-east-1
  storageSpec:
    volumeClaimTemplate:
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 50Gi
  thanos:
    image: quay.io/thanos/thanos:v0.34.0
    version: v0.34.0
    objectStorageConfig:
      name: thanos-objstore-config
      key: objstore.yml
    resources:
      requests:
        memory: 512Mi
        cpu: 500m
      limits:
        memory: 1Gi
        cpu: 1000m
```

The `externalLabels` field adds cluster and region labels to all metrics, making it easy to filter by cluster in global queries. The Thanos sidecar automatically uploads blocks to S3 every 2 hours.

## Deploying Thanos Query

The Thanos Query component provides a unified query interface across all your Prometheus instances and historical data in object storage.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-query
  template:
    metadata:
      labels:
        app: thanos-query
    spec:
      containers:
      - name: thanos-query
        image: quay.io/thanos/thanos:v0.34.0
        args:
        - query
        - --http-address=0.0.0.0:9090
        - --grpc-address=0.0.0.0:10901
        - --store=dnssrv+_grpc._tcp.prometheus-operated.monitoring.svc.cluster.local
        - --store=dnssrv+_grpc._tcp.thanos-store.monitoring.svc.cluster.local
        - --query.replica-label=replica
        - --query.replica-label=prometheus_replica
        ports:
        - containerPort: 9090
          name: http
        - containerPort: 10901
          name: grpc
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: http
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /-/ready
            port: http
          initialDelaySeconds: 15

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  selector:
    app: thanos-query
  ports:
  - port: 9090
    targetPort: http
    name: http
  - port: 10901
    targetPort: grpc
    name: grpc
```

The `--store` flags tell Thanos Query where to find metric sources. The DNS-based service discovery automatically finds all Prometheus sidecars and Store Gateways in the cluster.

## Connecting Multiple Clusters

To query metrics across multiple clusters, you need to make Thanos sidecars from each cluster accessible to your central Thanos Query instance.

Option 1 is using a shared Thanos Query deployment in a management cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query-global
  namespace: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: thanos-query-global
  template:
    metadata:
      labels:
        app: thanos-query-global
    spec:
      containers:
      - name: thanos-query
        image: quay.io/thanos/thanos:v0.34.0
        args:
        - query
        - --http-address=0.0.0.0:9090
        - --grpc-address=0.0.0.0:10901
        # Cluster 1 Prometheus
        - --store=cluster1-prometheus-sidecar.monitoring.svc.cluster1.local:10901
        # Cluster 2 Prometheus
        - --store=cluster2-prometheus-sidecar.monitoring.svc.cluster2.local:10901
        # Store Gateway (historical data)
        - --store=thanos-store.monitoring.svc.cluster.local:10901
        - --query.replica-label=replica
        - --query.auto-downsampling
```

Option 2 is exposing each cluster's Thanos sidecar via ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: thanos-sidecar-ingress
  namespace: monitoring
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - thanos-cluster1.example.com
    secretName: thanos-tls
  rules:
  - host: thanos-cluster1.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus-operated
            port:
              number: 10901
```

Then configure the global query to use the public endpoints:

```yaml
args:
- query
- --store=thanos-cluster1.example.com:443
- --store=thanos-cluster2.example.com:443
- --store=thanos-cluster3.example.com:443
```

## Deploying Thanos Store Gateway

The Store Gateway serves historical metrics from object storage, enabling queries across your entire metric history:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  serviceName: thanos-store
  replicas: 2
  selector:
    matchLabels:
      app: thanos-store
  template:
    metadata:
      labels:
        app: thanos-store
    spec:
      containers:
      - name: thanos-store
        image: quay.io/thanos/thanos:v0.34.0
        args:
        - store
        - --data-dir=/var/thanos/store
        - --objstore.config-file=/etc/thanos/objstore.yml
        - --index-cache-size=500MB
        - --chunk-pool-size=500MB
        volumeMounts:
        - name: data
          mountPath: /var/thanos/store
        - name: objstore-config
          mountPath: /etc/thanos
        ports:
        - containerPort: 10901
          name: grpc
        - containerPort: 10902
          name: http
        resources:
          requests:
            memory: 2Gi
            cpu: 500m
          limits:
            memory: 8Gi
            cpu: 2000m
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 50Gi

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  clusterIP: None
  selector:
    app: thanos-store
  ports:
  - port: 10901
    targetPort: grpc
    name: grpc
```

The Store Gateway caches index information locally to speed up queries against object storage.

## Configuring Thanos Compactor

The Compactor performs downsampling and compaction on metrics in object storage, reducing storage costs and improving query performance for historical data:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-compact
  namespace: monitoring
spec:
  serviceName: thanos-compact
  replicas: 1  # Only run one compactor
  selector:
    matchLabels:
      app: thanos-compact
  template:
    metadata:
      labels:
        app: thanos-compact
    spec:
      containers:
      - name: thanos-compact
        image: quay.io/thanos/thanos:v0.34.0
        args:
        - compact
        - --data-dir=/var/thanos/compact
        - --objstore.config-file=/etc/thanos/objstore.yml
        - --retention.resolution-raw=30d
        - --retention.resolution-5m=180d
        - --retention.resolution-1h=365d
        - --delete-delay=48h
        - --wait
        volumeMounts:
        - name: data
          mountPath: /var/thanos/compact
        - name: objstore-config
          mountPath: /etc/thanos
        ports:
        - containerPort: 10902
          name: http
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
      volumes:
      - name: objstore-config
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 100Gi
```

This configuration keeps raw metrics for 30 days, 5-minute downsampled data for 180 days, and 1-hour downsampled data for a year.

## Querying Multi-Cluster Metrics

With Thanos deployed, you can now query metrics across all clusters using PromQL:

```promql
# Total request rate across all clusters
sum(rate(http_requests_total[5m]))

# Request rate by cluster
sum(rate(http_requests_total[5m])) by (cluster)

# Compare error rates between clusters
sum(rate(http_requests_total{status=~"5.."}[5m])) by (cluster)
/
sum(rate(http_requests_total[5m])) by (cluster)

# Query historical data from 6 months ago
http_requests_total{cluster="cluster-1"}[5m] offset 180d
```

The queries work identically to standard Prometheus queries, but Thanos automatically aggregates data from all clusters and historical storage.

## Setting Up Grafana with Thanos

Configure Grafana to use Thanos Query as a data source:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Thanos
      type: prometheus
      access: proxy
      url: http://thanos-query.monitoring.svc:9090
      isDefault: true
      editable: false
      jsonData:
        timeInterval: 30s
        queryTimeout: 300s
```

Create dashboards that visualize metrics across all clusters:

```json
{
  "dashboard": {
    "title": "Multi-Cluster Overview",
    "panels": [
      {
        "title": "Request Rate by Cluster",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (cluster)",
            "legendFormat": "{{ cluster }}"
          }
        ]
      },
      {
        "title": "CPU Usage by Cluster",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total[5m])) by (cluster)",
            "legendFormat": "{{ cluster }}"
          }
        ]
      }
    ]
  }
}
```

## Monitoring Thanos Components

Monitor Thanos itself to ensure reliable metric collection:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: thanos-query
  endpoints:
  - port: http
    interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: thanos-alerts
  namespace: monitoring
spec:
  groups:
  - name: thanos
    rules:
    - alert: ThanosQueryHighLatency
      expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{handler="query"}[5m])) > 10
      for: 5m
      annotations:
        summary: "Thanos Query high latency"

    - alert: ThanosStoreGrpcErrors
      expr: rate(grpc_server_handled_total{grpc_code!="OK",job="thanos-store"}[5m]) > 0.01
      for: 5m
      annotations:
        summary: "Thanos Store experiencing gRPC errors"

    - alert: ThanosCompactFailed
      expr: thanos_compact_iterations_failed_total > 0
      for: 1m
      annotations:
        summary: "Thanos Compact failed"
```

## Best Practices

Use consistent external labels across all Prometheus instances to ensure proper metric aggregation and filtering. Include cluster, region, and environment labels.

Configure appropriate retention policies balancing storage costs with query requirements. Most applications don't need raw metrics beyond 30 days.

Deploy multiple replicas of Thanos Query for high availability. Use a load balancer to distribute query load across replicas.

Monitor object storage costs carefully. Thanos stores a lot of data, and costs can grow unexpectedly if compaction isn't working properly.

Use downsampling aggressively for historical data. Querying year-old metrics at 5-second resolution is rarely necessary and wastes storage and query resources.

## Conclusion

Thanos transforms Prometheus from a single-cluster monitoring solution into a global observability platform. By aggregating metrics from multiple clusters and providing unlimited retention using object storage, Thanos enables you to maintain comprehensive monitoring across your entire infrastructure.

The key to success is understanding each Thanos component's role and configuring them appropriately for your scale and retention requirements. Start with basic setup and gradually add components like the Compactor and Ruler as your needs grow.
