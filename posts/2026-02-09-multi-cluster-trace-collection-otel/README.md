# How to Set Up Multi-Cluster Trace Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Distributed Tracing, Multi-Cluster, Federation

Description: Learn how to implement multi-cluster trace collection using OpenTelemetry Collector federation to aggregate traces from multiple Kubernetes clusters into a centralized observability platform.

---

Organizations running applications across multiple Kubernetes clusters need unified trace visibility. A tiered OpenTelemetry Collector deployment creates a hierarchical trace collection architecture where cluster-local collectors aggregate traces and forward them to central collectors, providing global observability while maintaining cluster isolation.

A tiered deployment enables you to query traces across all clusters from a single interface. Cluster-specific collectors handle local processing, sampling, and enrichment. Central collectors aggregate data, apply global policies, and export to backends. This architecture can scale to many clusters while keeping network costs manageable when the central tier is sized and load-balanced for the trace volume.

## Understanding Tiered Collector Architecture

A tiered Collector deployment uses a two-tier architecture. Tier-1 collectors run in each Kubernetes cluster as gateways, receiving traces from applications and performing cluster-specific processing. Tier-2 collectors run in a central location, receiving traces from all tier-1 collectors and exporting to observability backends.

Each tier has distinct responsibilities. Tier-1 collectors add cluster identifiers, perform local sampling, and buffer traces during network issues. Tier-2 collectors aggregate traces across clusters, apply global sampling policies, and handle backend authentication. This separation simplifies operations and improves reliability.

## Deploying Tier-1 Collectors in Each Cluster

Deploy gateway collectors in each application cluster:

The central DNS name in the exporter should resolve to the tier-2 Collector endpoints, not to a generic L4 load balancer, so the load-balancing exporter can route all spans for a trace to the same tier-2 Collector.

```yaml
# tier1-collector.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-tier1
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

      resource:
        attributes:
          - key: k8s.cluster.name
            value: ${env:CLUSTER_NAME}
            action: upsert
          - key: k8s.cluster.region
            value: ${env:CLUSTER_REGION}
            action: upsert

      k8sattributes:
        auth_type: "serviceAccount"
        passthrough: false
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.deployment.name

    exporters:
      loadbalancing/tier2:
        routing_key: traceID
        protocol:
          otlp:
            tls:
              insecure: false
              cert_file: /certs/client.crt
              key_file: /certs/client.key
              ca_file: /certs/ca.crt
        retry_on_failure:
          enabled: true
          max_elapsed_time: 300s
        sending_queue:
          enabled: true
          num_consumers: 10
          queue_size: 5000
          storage: file_storage
        resolver:
          dns:
            hostname: central-otel-collector.observability.example.com
            port: "4317"

    extensions:
      file_storage:
        directory: /var/otel/storage
        create_directory: true

    service:
      extensions: [file_storage]
      pipelines:
        traces:
          receivers: [otlp]
          processors: [k8sattributes, resource, batch]
          exporters: [loadbalancing/tier2]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector-k8sattributes
rules:
- apiGroups: [""]
  resources: ["pods", "namespaces"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["apps"]
  resources: ["replicasets"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector-k8sattributes
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector-k8sattributes
subjects:
- kind: ServiceAccount
  name: otel-collector
  namespace: observability
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-tier1
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector-tier1
  template:
    metadata:
      labels:
        app: otel-collector-tier1
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.153.0
        args:
          - "--config=/conf/config.yaml"
        env:
        - name: CLUSTER_NAME
          value: "production-us-east-1"
        - name: CLUSTER_REGION
          value: "us-east-1"
        volumeMounts:
        - name: config
          mountPath: /conf
        - name: certs
          mountPath: /certs
          readOnly: true
        - name: storage
          mountPath: /var/otel/storage
      volumes:
      - name: config
        configMap:
          name: otel-collector-tier1
      - name: certs
        secret:
          secretName: otel-client-certs
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector-tier1
  ports:
  - port: 4317
    name: otlp-grpc
```

## Deploying Tier-2 Central Collectors

Deploy central aggregation collectors:

```yaml
# tier2-collector.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-tier2
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
            tls:
              cert_file: /certs/server.crt
              key_file: /certs/server.key
              client_ca_file: /certs/ca.crt

    processors:
      batch:
        timeout: 30s
        send_batch_size: 5000

      # Global sampling across all clusters
      tail_sampling:
        decision_wait: 30s
        num_traces: 100000
        expected_new_traces_per_sec: 10000
        policies:
          - name: errors-all-clusters
            type: status_code
            status_code:
              status_codes: [ERROR]
          - name: slow-all-clusters
            type: latency
            latency:
              threshold_ms: 2000
          - name: probabilistic-sample
            type: probabilistic
            probabilistic:
              sampling_percentage: 5

    exporters:
      otlp/tempo:
        endpoint: tempo-distributor:4317
        tls:
          insecure: true

      otlp/jaeger:
        endpoint: jaeger-collector:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, tail_sampling]
          exporters: [otlp/tempo, otlp/jaeger]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-tier2
  namespace: observability
spec:
  replicas: 5
  selector:
    matchLabels:
      app: otel-collector-tier2
  template:
    metadata:
      labels:
        app: otel-collector-tier2
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.153.0
        args:
          - "--config=/conf/config.yaml"
        volumeMounts:
        - name: config
          mountPath: /conf
        - name: certs
          mountPath: /certs
          readOnly: true
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
      volumes:
      - name: config
        configMap:
          name: otel-collector-tier2
      - name: certs
        secret:
          secretName: otel-server-certs
---
apiVersion: v1
kind: Service
metadata:
  name: central-otel-collector
  namespace: observability
spec:
  type: LoadBalancer
  selector:
    app: otel-collector-tier2
  ports:
  - port: 4317
    name: otlp-grpc
```

## Querying Multi-Cluster Traces

Query traces with cluster context:

```bash
# Find traces from specific cluster
curl -G -s 'http://tempo:3200/api/search' \
  --data-urlencode 'tags=k8s.cluster.name=production-us-east-1'

# Find traces spanning multiple clusters
curl -G -s 'http://tempo:3200/api/search' \
  --data-urlencode 'tags=service.name=payment-service'
```

A tiered OpenTelemetry Collector deployment provides scalable multi-cluster trace collection. By implementing tiered collectors with cluster-specific processing and central aggregation, you achieve unified observability across all Kubernetes clusters.
