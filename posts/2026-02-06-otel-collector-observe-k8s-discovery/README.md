# How to Configure the OpenTelemetry Collector to Export Metrics and Traces to Observe Inc with Kubernetes Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Observe Inc, Kubernetes

Description: Configure the OpenTelemetry Collector with Kubernetes service discovery to automatically collect and export telemetry to Observe Inc.

Running the OpenTelemetry Collector in Kubernetes with service discovery means you can automatically scrape metrics from new pods as they appear. Combined with Observe Inc as the backend, you get full cluster observability without manually configuring each service.

## Collector DaemonSet Configuration

Deploy the Collector as a DaemonSet so every node has a collector instance:

```yaml
# otel-collector-observe-k8s.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Automatically discover and scrape Prometheus endpoints from pods
  prometheus:
    config:
      scrape_configs:
        - job_name: "kubernetes-pods"
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            # Only scrape pods with the annotation prometheus.io/scrape=true
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: true
            # Use the port from the annotation
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
              action: replace
              target_label: __address__
              regex: (.+)
              replacement: "${1}:${2}"
            # Use the path from the annotation (default /metrics)
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
              action: replace
              target_label: __metrics_path__
              regex: (.+)
            # Add Kubernetes labels as metric labels
            - action: labelmap
              regex: __meta_kubernetes_pod_label_(.+)
            - source_labels: [__meta_kubernetes_namespace]
              target_label: k8s_namespace
            - source_labels: [__meta_kubernetes_pod_name]
              target_label: k8s_pod_name

  # Collect Kubernetes node and cluster metrics
  k8s_cluster:
    collection_interval: 30s
    node_conditions_to_report: [Ready, MemoryPressure, DiskPressure]

  # Collect kubelet metrics
  kubeletstats:
    collection_interval: 30s
    auth_type: serviceAccount
    endpoint: "${K8S_NODE_NAME}:10250"
    insecure_skip_verify: true

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

  # Add Kubernetes metadata to all telemetry
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - k8s.replicaset.name
        - k8s.statefulset.name
      labels:
        - tag_name: app
          key: app
        - tag_name: version
          key: version
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

  resource:
    attributes:
      - key: observe.customer_id
        value: "${OBSERVE_CUSTOMER_ID}"
        action: upsert

exporters:
  otlp/observe:
    endpoint: "collect.observeinc.com:4317"
    headers:
      Authorization: "Bearer ${OBSERVE_CUSTOMER_ID}:${OBSERVE_TOKEN}"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
    sending_queue:
      enabled: true
      queue_size: 5000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, resource, batch]
      exporters: [otlp/observe]

    metrics:
      receivers: [otlp, prometheus, kubeletstats]
      processors: [k8sattributes, resource, batch]
      exporters: [otlp/observe]

    logs:
      receivers: [otlp]
      processors: [k8sattributes, resource, batch]
      exporters: [otlp/observe]
```

## Kubernetes DaemonSet Manifest

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          env:
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: OBSERVE_CUSTOMER_ID
              valueFrom:
                secretKeyRef:
                  name: observe-credentials
                  key: customer-id
            - name: OBSERVE_TOKEN
              valueFrom:
                secretKeyRef:
                  name: observe-credentials
                  key: token
          ports:
            - containerPort: 4317
              hostPort: 4317
            - containerPort: 4318
              hostPort: 4318
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
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
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "nodes/stats", "services", "endpoints"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: observability
```

## Pod Annotations for Auto-Discovery

Annotate your application pods to enable automatic Prometheus scraping:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: api
          image: my-api:latest
          ports:
            - containerPort: 8080
```

This setup gives you automatic discovery and collection of metrics from every annotated pod in your cluster, Kubernetes infrastructure metrics from kubelet, and application traces and logs through OTLP. All of it flows to Observe Inc where you can build dashboards that correlate application performance with infrastructure health.
