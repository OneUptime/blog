# How to Use Sidecar Containers for Distributed Tracing Agent Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar, Distributed Tracing

Description: Learn how to inject distributed tracing agents using sidecar containers in Kubernetes pods to capture trace data without modifying application code.

---

Distributed tracing is essential for understanding request flows across microservices, but instrumenting applications can be complex. Sidecar containers offer a powerful pattern for injecting tracing agents alongside your application, enabling automatic trace collection without modifying your application code.

This approach decouples tracing infrastructure from application logic, making it easier to manage, update, and standardize across multiple services. By using sidecars, you can inject tracing agents like OpenTelemetry Collector, Jaeger Agent, or Datadog Agent directly into pods.

## Why Use Sidecars for Tracing Agent Injection

Traditional approaches require embedding tracing libraries directly into application code, which creates several challenges. You need to maintain instrumentation across multiple codebases, coordinate library updates, and ensure consistent configuration. Sidecar injection solves these problems by externalizing the tracing infrastructure.

The sidecar pattern provides several advantages. First, it enables centralized management of tracing configuration. Second, it allows you to update tracing agents without rebuilding application containers. Third, it reduces the burden on development teams who can focus on business logic rather than observability infrastructure.

Sidecars run in the same pod as your application, sharing the network namespace. This means the tracing agent can intercept traffic on localhost, making it transparent to the application. Your services simply send traces to localhost, and the sidecar handles forwarding to backend systems.

## Implementing OpenTelemetry Collector Sidecar

The OpenTelemetry Collector is an excellent choice for sidecar-based tracing because it supports multiple protocols and can export to various backends. Here's how to configure an OpenTelemetry Collector sidecar with your application.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: default
data:
  collector-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      # Receive Jaeger traces for backward compatibility
      jaeger:
        protocols:
          thrift_compact:
            endpoint: 0.0.0.0:6831

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      # Add resource attributes for better filtering
      resource:
        attributes:
          - key: deployment.environment
            value: production
            action: upsert

    exporters:
      otlp:
        endpoint: "tracing-backend.monitoring:4317"
        tls:
          insecure: false
      logging:
        loglevel: info

    service:
      pipelines:
        traces:
          receivers: [otlp, jaeger]
          processors: [batch, resource]
          exporters: [otlp, logging]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-application
  template:
    metadata:
      labels:
        app: web-application
    spec:
      containers:
      # Main application container
      - name: app
        image: myorg/web-app:v1.2.0
        ports:
        - containerPort: 8080
          name: http
        env:
        # Configure app to send traces to sidecar
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://localhost:4318"
        - name: OTEL_SERVICE_NAME
          value: "web-application"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      # OpenTelemetry Collector sidecar
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.91.0
        args:
        - "--config=/conf/collector-config.yaml"
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 6831
          name: jaeger-compact
          protocol: UDP
        volumeMounts:
        - name: collector-config
          mountPath: /conf
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      volumes:
      - name: collector-config
        configMap:
          name: otel-collector-config
```

This configuration creates a deployment where each pod runs your application alongside an OpenTelemetry Collector. The collector receives traces on multiple protocols and forwards them to your tracing backend.

## Configuring Auto-Instrumentation with Java Agent Sidecar

For Java applications, you can use a sidecar pattern to inject the OpenTelemetry Java agent without modifying your application container. This uses an init container to copy the agent and a shared volume.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: java-service
  template:
    metadata:
      labels:
        app: java-service
    spec:
      # Init container to download Java agent
      initContainers:
      - name: agent-download
        image: alpine:3.18
        command:
        - sh
        - -c
        - |
          wget -O /agents/opentelemetry-javaagent.jar \
            https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v1.32.0/opentelemetry-javaagent.jar
        volumeMounts:
        - name: agent-volume
          mountPath: /agents

      containers:
      # Main Java application
      - name: app
        image: myorg/java-service:v2.1.0
        ports:
        - containerPort: 8080
        env:
        # Attach Java agent at runtime
        - name: JAVA_TOOL_OPTIONS
          value: "-javaagent:/agents/opentelemetry-javaagent.jar"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://localhost:4318"
        - name: OTEL_SERVICE_NAME
          value: "java-service"
        - name: OTEL_TRACES_EXPORTER
          value: "otlp"
        volumeMounts:
        - name: agent-volume
          mountPath: /agents
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

      # OpenTelemetry Collector sidecar
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.91.0
        args:
        - "--config=/conf/collector-config.yaml"
        ports:
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: collector-config
          mountPath: /conf
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      volumes:
      - name: agent-volume
        emptyDir: {}
      - name: collector-config
        configMap:
          name: otel-collector-config
```

The init container downloads the OpenTelemetry Java agent to a shared volume. The main application mounts this volume and uses JAVA_TOOL_OPTIONS to attach the agent at startup. This provides automatic instrumentation without modifying the application image.

## Using Admission Webhooks for Automatic Injection

To avoid manually configuring sidecars in every deployment, you can implement a mutating admission webhook that automatically injects tracing sidecars. This approach is similar to how Istio injects Envoy proxies.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: tracing-injector
webhooks:
- name: tracing-injector.monitoring.svc
  clientConfig:
    service:
      name: tracing-injector
      namespace: monitoring
      path: "/inject"
    caBundle: LS0tLS1CRUdJTi... # Base64 encoded CA cert
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  namespaceSelector:
    matchLabels:
      tracing-injection: enabled
  objectSelector:
    matchExpressions:
    - key: tracing-injection
      operator: NotIn
      values: ["disabled"]
```

The webhook intercepts pod creation requests and injects the tracing sidecar container before the pod is scheduled. You enable injection by labeling namespaces or pods.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    tracing-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
      annotations:
        # Customize injection behavior
        tracing.injection/port: "4318"
        tracing.injection/protocol: "http"
    spec:
      containers:
      - name: app
        image: myorg/api-service:v1.5.0
        ports:
        - containerPort: 8080
```

When you deploy this, the webhook automatically adds the OpenTelemetry Collector sidecar. This provides a consistent tracing setup across all services without manual configuration.

## Managing Sidecar Configuration and Updates

One challenge with sidecar injection is managing configuration changes and updates. Using ConfigMaps allows you to update tracing configuration without redeploying applications.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: default
data:
  collector-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 5s
      # Sample traces to reduce volume
      probabilistic_sampler:
        sampling_percentage: 10

    exporters:
      otlp:
        endpoint: "tracing-backend.monitoring:4317"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [probabilistic_sampler, batch]
          exporters: [otlp]
```

To update the configuration, modify the ConfigMap and restart the pods. You can use a rolling restart to avoid downtime.

```bash
# Update the ConfigMap
kubectl apply -f otel-collector-config.yaml

# Trigger rolling restart
kubectl rollout restart deployment/web-application -n default
```

For more dynamic configuration, you can implement configuration reloading in your sidecar containers. The OpenTelemetry Collector supports configuration reloading through file watching.

## Monitoring Sidecar Health and Performance

Tracing sidecars need monitoring to ensure they don't become bottlenecks. Configure health checks and resource limits appropriately.

```yaml
containers:
- name: otel-collector
  image: otel/opentelemetry-collector-contrib:0.91.0
  ports:
  - containerPort: 13133
    name: health-check
  livenessProbe:
    httpGet:
      path: /
      port: health-check
    initialDelaySeconds: 10
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /
      port: health-check
    initialDelaySeconds: 5
    periodSeconds: 5
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"
```

Monitor key metrics like trace processing rate, export latency, and queue size to detect issues early. The OpenTelemetry Collector exposes Prometheus metrics on port 8888 by default.

## Conclusion

Using sidecar containers for distributed tracing agent injection provides a clean separation between application logic and observability infrastructure. This pattern enables centralized management, consistent configuration, and easier updates across your entire service mesh. By implementing automatic injection through admission webhooks, you can standardize tracing across all services without manual configuration in every deployment.

The sidecar approach works well for organizations with multiple services and teams, providing a standardized way to collect and export trace data. While it adds some resource overhead, the operational benefits and improved observability typically outweigh the costs.
