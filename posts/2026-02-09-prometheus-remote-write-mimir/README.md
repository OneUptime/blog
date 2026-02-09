# How to Configure Prometheus Remote Write to Grafana Mimir for Long-Term Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Grafana Mimir, Remote Write, Monitoring, Storage

Description: Learn how to configure Prometheus remote write to send metrics to Grafana Mimir for scalable long-term storage and global query capabilities.

---

Prometheus excels at scraping and storing metrics, but its local storage has limitations for long-term retention and horizontal scaling. Grafana Mimir solves these problems by providing horizontally scalable, long-term metric storage compatible with Prometheus. By configuring remote write, you can send metrics from multiple Prometheus instances to a central Mimir cluster while maintaining local Prometheus for recent data queries.

## Understanding Remote Write and Mimir

Prometheus remote write is a protocol that sends collected metrics to external systems. Grafana Mimir is an open-source, horizontally scalable time series database designed for Prometheus metrics. It provides:

- Long-term storage without Prometheus storage limitations
- Global view across multiple Prometheus instances
- Multi-tenancy with data isolation
- High availability and durability
- Fast queries across large datasets

The typical architecture involves Prometheus instances scraping metrics locally and forwarding them to Mimir for long-term storage.

## Setting Up Grafana Mimir

Before configuring remote write, deploy Mimir. Here's a basic Kubernetes deployment:

```yaml
# mimir-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mimir

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mimir-config
  namespace: mimir
data:
  mimir.yaml: |
    multitenancy_enabled: true

    server:
      http_listen_port: 8080
      grpc_listen_port: 9095

    distributor:
      pool:
        health_check_ingesters: true
      ring:
        kvstore:
          store: memberlist

    ingester:
      ring:
        kvstore:
          store: memberlist
        replication_factor: 3

    blocks_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: mimir-metrics
        region: us-east-1

    limits:
      max_global_series_per_user: 1000000
      ingestion_rate: 100000
      ingestion_burst_size: 200000

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mimir-ingester
  namespace: mimir
spec:
  serviceName: mimir-ingester
  replicas: 3
  selector:
    matchLabels:
      app: mimir-ingester
  template:
    metadata:
      labels:
        app: mimir-ingester
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:latest
          args:
            - -config.file=/etc/mimir/mimir.yaml
            - -target=ingester
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9095
              name: grpc
          volumeMounts:
            - name: config
              mountPath: /etc/mimir
            - name: storage
              mountPath: /data
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi
      volumes:
        - name: config
          configMap:
            name: mimir-config
  volumeClaimTemplates:
    - metadata:
        name: storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-distributor
  namespace: mimir
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mimir-distributor
  template:
    metadata:
      labels:
        app: mimir-distributor
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:latest
          args:
            - -config.file=/etc/mimir/mimir.yaml
            - -target=distributor
          ports:
            - containerPort: 8080
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/mimir
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
      volumes:
        - name: config
          configMap:
            name: mimir-config

---
apiVersion: v1
kind: Service
metadata:
  name: mimir-distributor
  namespace: mimir
spec:
  selector:
    app: mimir-distributor
  ports:
    - port: 8080
      targetPort: 8080
      name: http
```

Apply the Mimir deployment:

```bash
kubectl apply -f mimir-deployment.yaml
```

## Basic Remote Write Configuration

Configure Prometheus to send metrics to Mimir using remote write. For kube-prometheus-stack:

```yaml
# prometheus-remote-write-values.yaml
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: http://mimir-distributor.mimir.svc.cluster.local:8080/api/v1/push

        # Tenant ID header for multi-tenancy
        headers:
          X-Scope-OrgID: "tenant-1"

        # Queue configuration
        queueConfig:
          capacity: 10000
          maxShards: 50
          minShards: 1
          maxSamplesPerSend: 5000
          batchSendDeadline: 5s
          minBackoff: 30ms
          maxBackoff: 5s
```

Apply the configuration:

```bash
helm upgrade prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-remote-write-values.yaml
```

## Advanced Remote Write Configuration

### Write Relabeling

Filter which metrics to send to reduce costs and storage:

```yaml
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: http://mimir-distributor.mimir.svc.cluster.local:8080/api/v1/push
        headers:
          X-Scope-OrgID: "tenant-1"

        # Only send specific metrics
        writeRelabelConfigs:
          # Keep only important metrics
          - sourceLabels: [__name__]
            regex: '(http_requests_total|http_request_duration_seconds.*|process_.*|up)'
            action: keep

          # Drop debug metrics
          - sourceLabels: [__name__]
            regex: 'debug_.*'
            action: drop

          # Drop high-cardinality labels
          - regex: 'user_id|session_id|request_id'
            action: labeldrop

          # Add environment label
          - targetLabel: environment
            replacement: production
            action: replace
```

### Multiple Remote Write Endpoints

Send different metrics to different destinations:

```yaml
prometheus:
  prometheusSpec:
    remoteWrite:
      # Send all metrics to primary Mimir cluster
      - url: http://mimir-distributor.mimir.svc.cluster.local:8080/api/v1/push
        headers:
          X-Scope-OrgID: "tenant-1"
        queueConfig:
          capacity: 10000
          maxShards: 50

      # Send only critical metrics to backup cluster
      - url: https://mimir-backup.example.com/api/v1/push
        headers:
          X-Scope-OrgID: "tenant-1"
        writeRelabelConfigs:
          - sourceLabels: [__name__]
            regex: '(up|kube_pod_status_phase|node_.*)'
            action: keep
        queueConfig:
          capacity: 5000
          maxShards: 20

        # Authentication
        basicAuth:
          username:
            name: mimir-backup-auth
            key: username
          password:
            name: mimir-backup-auth
            key: password
```

### TLS and Authentication

Secure remote write with TLS and authentication:

```yaml
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: https://mimir.example.com/api/v1/push
        headers:
          X-Scope-OrgID: "tenant-1"

        # TLS configuration
        tlsConfig:
          insecureSkipVerify: false
          ca:
            secret:
              name: mimir-ca-cert
              key: ca.crt
          cert:
            secret:
              name: mimir-client-cert
              key: tls.crt
          keySecret:
            name: mimir-client-cert
            key: tls.key

        # Bearer token authentication
        bearerToken: "your-bearer-token"

        # Or use basic auth
        basicAuth:
          username:
            name: mimir-auth
            key: username
          password:
            name: mimir-auth
            key: password
```

Create the authentication secret:

```bash
kubectl create secret generic mimir-auth \
  --from-literal=username=prometheus \
  --from-literal=password=secure-password \
  -n monitoring
```

## Optimizing Remote Write Performance

### Queue Configuration

Tune queue settings for your workload:

```yaml
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: http://mimir-distributor.mimir.svc.cluster.local:8080/api/v1/push
        headers:
          X-Scope-OrgID: "tenant-1"

        queueConfig:
          # Maximum samples in memory before blocking
          capacity: 50000

          # Maximum concurrent shards (parallel connections)
          maxShards: 100

          # Minimum shards to maintain
          minShards: 5

          # Samples per batch
          maxSamplesPerSend: 10000

          # Send batch after this duration even if not full
          batchSendDeadline: 10s

          # Backoff on errors
          minBackoff: 30ms
          maxBackoff: 100s

          # Retry on 5xx errors
          retryOnRateLimit: true

        # Timeout for each request
        remoteTimeout: 30s
```

### Resource Limits

Ensure Prometheus has sufficient resources for remote write:

```yaml
prometheus:
  prometheusSpec:
    resources:
      requests:
        cpu: 1000m
        memory: 4Gi
      limits:
        cpu: 4000m
        memory: 8Gi

    # Increase WAL size for buffering
    walCompression: true
```

## Querying Data from Mimir

Configure Grafana to query from Mimir:

```yaml
# grafana-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  mimir-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Mimir Long-Term
        type: prometheus
        access: proxy
        url: http://mimir-query-frontend.mimir.svc.cluster.local:8080/prometheus
        jsonData:
          httpHeaderName1: X-Scope-OrgID
          timeInterval: 30s
        secureJsonData:
          httpHeaderValue1: tenant-1
        isDefault: false

      - name: Prometheus Recent
        type: prometheus
        access: proxy
        url: http://prometheus-operated.monitoring.svc.cluster.local:9090
        isDefault: true
```

## Monitoring Remote Write

Create alerts for remote write issues:

```yaml
# remote-write-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: remote-write-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: remote-write
      interval: 30s
      rules:
        - alert: RemoteWriteBehind
          expr: |
            rate(prometheus_remote_storage_samples_failed_total[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Remote write is failing"
            description: "Prometheus is failing to send {{ $value }} samples/sec to remote storage."

        - alert: RemoteWriteQueueFull
          expr: |
            prometheus_remote_storage_samples_pending / prometheus_remote_storage_queue_capacity > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Remote write queue is filling up"
            description: "Remote write queue is {{ $value | humanizePercentage }} full."

        - alert: RemoteWriteHighLatency
          expr: |
            histogram_quantile(0.99,
              rate(prometheus_remote_storage_queue_duration_seconds_bucket[5m])
            ) > 120
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Remote write has high latency"
            description: "99th percentile remote write latency is {{ $value }}s."
```

Query remote write metrics:

```bash
# Check samples sent
prometheus_remote_storage_samples_total

# Check failed samples
prometheus_remote_storage_samples_failed_total

# Check queue size
prometheus_remote_storage_samples_pending

# Check send latency
prometheus_remote_storage_queue_duration_seconds
```

## Multi-Cluster Setup

Send metrics from multiple Prometheus instances to a central Mimir:

```yaml
# cluster-1 Prometheus
prometheus:
  prometheusSpec:
    externalLabels:
      cluster: cluster-1
      region: us-east-1

    remoteWrite:
      - url: https://central-mimir.example.com/api/v1/push
        headers:
          X-Scope-OrgID: "organization-1"

---
# cluster-2 Prometheus
prometheus:
  prometheusSpec:
    externalLabels:
      cluster: cluster-2
      region: eu-west-1

    remoteWrite:
      - url: https://central-mimir.example.com/api/v1/push
        headers:
          X-Scope-OrgID: "organization-1"
```

Query across clusters in Grafana using cluster label filtering.

## Troubleshooting Remote Write

### Check Remote Write Status

View Prometheus remote write metrics:

```bash
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Query remote write status
curl -s http://localhost:9090/api/v1/query?query=prometheus_remote_storage_samples_total | jq
```

Check Prometheus logs:

```bash
PROM_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n monitoring $PROM_POD | grep -i "remote"
```

### Test Mimir Endpoint

Verify Mimir is accessible:

```bash
# From within the cluster
kubectl run curl --image=curlimages/curl -it --rm -- \
  curl -X POST http://mimir-distributor.mimir.svc.cluster.local:8080/api/v1/push \
  -H "X-Scope-OrgID: tenant-1"
```

### Check Queue Metrics

Monitor queue health:

```bash
# Queue capacity utilization
prometheus_remote_storage_samples_pending / prometheus_remote_storage_queue_capacity

# Shards in use
prometheus_remote_storage_shards

# Dropped samples
rate(prometheus_remote_storage_samples_dropped_total[5m])
```

## Best Practices

1. Use write relabeling to reduce costs by filtering unnecessary metrics
2. Set appropriate queue sizes based on your metric volume
3. Monitor remote write health with alerts
4. Use external labels to identify metric sources in multi-cluster setups
5. Test remote write configuration in non-production first
6. Configure authentication and TLS for production deployments
7. Set resource limits on Prometheus to handle remote write overhead
8. Keep local retention for recent queries, use Mimir for historical data
9. Use tenant IDs for multi-team environments
10. Regularly review which metrics are being sent and optimize

## Conclusion

Prometheus remote write to Grafana Mimir provides scalable, long-term metric storage while maintaining Prometheus's strengths for real-time monitoring. By configuring remote write properly, you can centralize metrics from multiple clusters, retain data for extended periods, and query across your entire infrastructure. Combined with write relabeling and proper queue tuning, remote write becomes a powerful tool for building enterprise-scale observability platforms.
