# How to implement OpenTelemetry with Tempo for scalable trace storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tempo, Grafana, Distributed Tracing, Scalability

Description: Learn how to configure OpenTelemetry to send traces to Grafana Tempo for cost-effective and scalable trace storage with S3-compatible backends and efficient compression.

---

Grafana Tempo provides scalable trace storage designed specifically for OpenTelemetry traces. Tempo stores traces in object storage like S3, making it cost-effective for high-volume tracing while providing fast query performance.

## Deploying Tempo

Deploy Tempo using Docker or Kubernetes.

```yaml
# tempo-config.yaml
stream_over_http_enabled: true
server:
  http_listen_port: 3200
  grpc_listen_port: 9096

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/blocks
    wal:
      path: /tmp/tempo/wal

querier:
  frontend_worker:
    frontend_address: tempo:9095
```

Run Tempo with Docker.

```bash
docker run -d --name tempo \
  -v $(pwd)/tempo-config.yaml:/etc/tempo.yaml \
  -p 3200:3200 \
  -p 4317:4317 \
  -p 4318:4318 \
  grafana/tempo:latest \
  -config.file=/etc/tempo.yaml
```

## Collector Configuration for Tempo

Configure the OpenTelemetry Collector to export traces to Tempo.

```yaml
# collector-tempo.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
```

## Kubernetes Deployment

Deploy Tempo in Kubernetes with persistent storage.

```yaml
# tempo-k8s.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tempo
  namespace: observability
spec:
  serviceName: tempo
  replicas: 1
  selector:
    matchLabels:
      app: tempo
  template:
    metadata:
      labels:
        app: tempo
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:latest
        args:
          - -config.file=/etc/tempo.yaml
        ports:
        - containerPort: 3200
          name: http
        - containerPort: 4317
          name: otlp-grpc
        volumeMounts:
        - name: config
          mountPath: /etc
        - name: storage
          mountPath: /tmp/tempo
      volumes:
      - name: config
        configMap:
          name: tempo-config
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## S3 Storage Backend

Configure Tempo to use S3 for scalable storage.

```yaml
storage:
  trace:
    backend: s3
    s3:
      bucket: tempo-traces
      endpoint: s3.amazonaws.com
      region: us-east-1
      access_key: ${S3_ACCESS_KEY}
      secret_key: ${S3_SECRET_KEY}
    wal:
      path: /tmp/tempo/wal
    block:
      bloom_filter_false_positive: 0.05
      index_downsample_bytes: 1000
      encoding: zstd
```

## Grafana Integration

Configure Grafana to query traces from Tempo.

```yaml
# grafana-datasource.yaml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      httpMethod: GET
      tracesToLogs:
        datasourceUid: loki
        tags: ['job', 'instance', 'pod', 'namespace']
        mappedTags: [{ key: 'service.name', value: 'service' }]
        mapTagNamesEnabled: true
        spanStartTimeShift: '1m'
        spanEndTimeShift: '1m'
        filterByTraceID: true
        filterBySpanID: false
      serviceMap:
        datasourceUid: prometheus
      nodeGraph:
        enabled: true
```

## Best Practices

First, use S3 or compatible object storage for production deployments to handle scale cost-effectively.

Second, configure appropriate retention policies based on compliance and troubleshooting needs.

Third, enable service graphs and metrics generation in Tempo for additional insights.

Fourth, integrate Tempo with Loki for unified logs and traces navigation in Grafana.

Fifth, use TraceQL for advanced trace queries and filtering.

OpenTelemetry integration with Grafana Tempo provides scalable and cost-effective trace storage. Tempo's object storage backend and efficient compression make it ideal for high-volume tracing scenarios.
