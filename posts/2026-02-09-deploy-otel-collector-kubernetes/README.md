# How to deploy OpenTelemetry Collector in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Observability, Monitoring, Deployment

Description: Deploy OpenTelemetry Collector in Kubernetes with DaemonSet and Deployment patterns including configuration management, resource tuning, high availability setup, and integration with observability backends.

---

The OpenTelemetry Collector is a vendor-agnostic proxy for receiving, processing, and exporting telemetry data. Deploying it in Kubernetes requires choosing the right deployment pattern, configuring receivers and exporters, and tuning resources for your workload. This guide walks through production-ready collector deployments with real-world configuration examples.

## Understanding Collector Deployment Patterns

The collector supports three main deployment patterns in Kubernetes. The agent pattern deploys collectors as a DaemonSet, running one collector pod per node. This works well for collecting node-level metrics and logs. The gateway pattern deploys collectors as a Deployment with multiple replicas, serving as a central aggregation point for telemetry from multiple sources.

The sidecar pattern runs a collector container alongside your application pods. This provides strong isolation and allows per-application configuration, but increases resource usage. Most production deployments combine agent and gateway patterns: agents collect local telemetry and forward to gateway collectors that perform processing and export to backends.

## Deploying Collector as DaemonSet

Start with a DaemonSet deployment for node-level collection:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-agent-config
  namespace: observability
data:
  otel-agent-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      hostmetrics:
        collection_interval: 30s
        scrapers:
          cpu:
          memory:
          disk:
          filesystem:
          network:
      kubeletstats:
        collection_interval: 30s
        auth_type: "serviceAccount"
        endpoint: "https://${env:K8S_NODE_NAME}:10250"
        insecure_skip_verify: true

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
      resourcedetection:
        detectors: [env, system]

    exporters:
      otlp:
        endpoint: otel-collector-gateway:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
        metrics:
          receivers: [otlp, hostmetrics, kubeletstats]
          processors: [memory_limiter, batch, resourcedetection]
          exporters: [otlp]
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-agent
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-agent
  template:
    metadata:
      labels:
        app: otel-agent
    spec:
      serviceAccountName: otel-agent
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-k8s:0.91.0
        args:
        - --config=/conf/otel-agent-config.yaml
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: K8S_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: K8S_POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        ports:
        - containerPort: 4317
          name: otlp-grpc
          protocol: TCP
        - containerPort: 4318
          name: otlp-http
          protocol: TCP
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-agent-config
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-agent
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-agent
rules:
- apiGroups: [""]
  resources: ["nodes", "nodes/stats", "pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["nodes/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-agent
subjects:
- kind: ServiceAccount
  name: otel-agent
  namespace: observability
```

Apply the configuration:

```bash
kubectl create namespace observability
kubectl apply -f otel-agent-daemonset.yaml

# Verify deployment
kubectl get daemonset -n observability
kubectl get pods -n observability -l app=otel-agent

# Check logs
kubectl logs -n observability -l app=otel-agent --tail=50
```

## Deploying Gateway Collector

Deploy gateway collectors as a Deployment for centralized processing:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-gateway-config
  namespace: observability
data:
  otel-gateway-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 30s
        send_batch_size: 10000
      memory_limiter:
        check_interval: 1s
        limit_mib: 2048
      resource:
        attributes:
        - key: cluster.name
          value: production-k8s
          action: insert
      k8sattributes:
        auth_type: "serviceAccount"
        passthrough: false
        extract:
          metadata:
          - k8s.namespace.name
          - k8s.deployment.name
          - k8s.pod.name
          - k8s.node.name

    exporters:
      otlp/jaeger:
        endpoint: jaeger-collector:4317
        tls:
          insecure: true
      prometheusremotewrite:
        endpoint: http://prometheus:9090/api/v1/write
      otlp/oneuptime:
        endpoint: oneuptime.com:443
        headers:
          "x-oneuptime-api-key": "${env:ONEUPTIME_API_KEY}"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch, resource]
          exporters: [otlp/jaeger, otlp/oneuptime]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch, resource]
          exporters: [prometheusremotewrite, otlp/oneuptime]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-gateway
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
    spec:
      serviceAccountName: otel-gateway
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.91.0
        args:
        - --config=/conf/otel-gateway-config.yaml
        env:
        - name: ONEUPTIME_API_KEY
          valueFrom:
            secretKeyRef:
              name: otel-secrets
              key: oneuptime-api-key
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 8888
          name: metrics
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector-gateway
  namespace: observability
spec:
  type: ClusterIP
  selector:
    app: otel-gateway
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
    protocol: TCP
  - name: otlp-http
    port: 4318
    targetPort: 4318
    protocol: TCP
  - name: metrics
    port: 8888
    targetPort: 8888
    protocol: TCP
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-gateway
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-gateway
rules:
- apiGroups: [""]
  resources: ["pods", "namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["replicasets", "deployments"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-gateway
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-gateway
subjects:
- kind: ServiceAccount
  name: otel-gateway
  namespace: observability
```

Create secrets for API keys:

```bash
kubectl create secret generic otel-secrets -n observability \
  --from-literal=oneuptime-api-key='your-api-key-here'

kubectl apply -f otel-gateway-deployment.yaml
```

## Configuring Autoscaling

Enable HPA for gateway collectors:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-collector-gateway
  namespace: observability
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-collector-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

## Monitoring Collector Health

Deploy ServiceMonitor for Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-gateway
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Check collector metrics:

```bash
# Port-forward to collector
kubectl port-forward -n observability svc/otel-collector-gateway 8888:8888

# Query metrics
curl http://localhost:8888/metrics | grep otelcol

# Key metrics:
# otelcol_receiver_accepted_spans
# otelcol_receiver_refused_spans
# otelcol_processor_batch_batch_send_size
# otelcol_exporter_sent_spans
```

## Troubleshooting Deployments

Common issues:

```bash
# Check collector logs
kubectl logs -n observability -l app=otel-gateway --tail=100

# Verify configuration is valid
kubectl exec -n observability deployment/otel-collector-gateway -- \
  otelcol validate --config=/conf/otel-gateway-config.yaml

# Test connectivity to backends
kubectl exec -n observability deployment/otel-collector-gateway -- \
  curl -v http://prometheus:9090/-/healthy

# Check resource usage
kubectl top pods -n observability
```

Deploying OpenTelemetry Collector in Kubernetes with proper agent and gateway patterns ensures efficient telemetry collection and processing at scale. By configuring appropriate resources, enabling autoscaling, and monitoring collector health, you build a robust observability pipeline that can handle production workloads.
