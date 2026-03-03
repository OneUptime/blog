# How to Deploy Zipkin for Tracing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Zipkin, Distributed Tracing, Kubernetes, Observability, Microservices

Description: Step-by-step instructions for deploying Zipkin on a Talos Linux Kubernetes cluster to trace requests across microservices.

---

Zipkin is one of the original distributed tracing systems, created by Twitter based on the Google Dapper paper. It provides a straightforward way to collect timing data from your microservices and visualize request flows. If you are running a Kubernetes cluster on Talos Linux and need distributed tracing without a lot of complexity, Zipkin is a solid choice. It is simpler to set up than some alternatives, has a clean UI, and supports multiple storage backends. In this post, we will deploy Zipkin on Talos Linux with persistent storage and instrument applications to send traces.

## Why Zipkin

Zipkin has been around since 2012, which makes it one of the most mature tracing systems available. It has broad language support, a simple architecture, and a lower operational overhead compared to more feature-rich alternatives. For teams that need tracing without wanting to manage a complex observability stack, Zipkin hits a good balance.

Key features include:

- Simple architecture with minimal components
- Built-in web UI for trace visualization
- Support for Elasticsearch, Cassandra, and MySQL storage backends
- Compatible with OpenTelemetry instrumentation
- Low resource footprint

## Architecture

Zipkin's architecture is straightforward:

- **Zipkin Server**: A single service that handles collection, storage, and querying
- **Storage Backend**: Where trace data is persisted (Elasticsearch, Cassandra, or MySQL)
- **Client Libraries**: Instrument your applications to send spans to the Zipkin server

This simplicity is one of Zipkin's strengths. You do not need to deploy separate collectors, agents, and query services.

## Step 1: Set Up the Storage Backend

For production, we will use Elasticsearch. If you already have Elasticsearch running in your cluster, you can reuse it.

```bash
# Create namespace for tracing
kubectl create namespace tracing
```

Deploy Elasticsearch if you do not already have one:

```yaml
# zipkin-elasticsearch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zipkin-elasticsearch
  namespace: tracing
spec:
  serviceName: zipkin-elasticsearch
  replicas: 1
  selector:
    matchLabels:
      app: zipkin-elasticsearch
  template:
    metadata:
      labels:
        app: zipkin-elasticsearch
    spec:
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          env:
            - name: discovery.type
              value: single-node
            - name: xpack.security.enabled
              value: "false"
            - name: ES_JAVA_OPTS
              value: "-Xms1g -Xmx1g"
          ports:
            - containerPort: 9200
              name: http
            - containerPort: 9300
              name: transport
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 1000m
              memory: 3Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 30Gi
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin-elasticsearch
  namespace: tracing
spec:
  selector:
    app: zipkin-elasticsearch
  ports:
    - port: 9200
      name: http
    - port: 9300
      name: transport
  clusterIP: None
```

```bash
kubectl apply -f zipkin-elasticsearch.yaml

# Wait for Elasticsearch to be ready
kubectl wait --for=condition=Ready pod/zipkin-elasticsearch-0 -n tracing --timeout=300s
```

## Step 2: Deploy Zipkin Server

Now deploy the Zipkin server configured to use Elasticsearch:

```yaml
# zipkin-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: tracing
  labels:
    app: zipkin
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:latest
          env:
            # Use Elasticsearch as the storage backend
            - name: STORAGE_TYPE
              value: elasticsearch
            # Elasticsearch connection settings
            - name: ES_HOSTS
              value: "http://zipkin-elasticsearch.tracing.svc.cluster.local:9200"
            # Index configuration
            - name: ES_INDEX
              value: zipkin
            - name: ES_INDEX_REPLICAS
              value: "0"
            - name: ES_INDEX_SHARDS
              value: "3"
            # JVM settings
            - name: JAVA_OPTS
              value: "-Xms256m -Xmx512m"
            # Enable self-tracing for debugging Zipkin itself
            - name: SELF_TRACING_ENABLED
              value: "true"
            - name: SELF_TRACING_SAMPLE_RATE
              value: "0.001"
          ports:
            - containerPort: 9411
              name: http
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 9411
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 9411
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: tracing
  labels:
    app: zipkin
spec:
  selector:
    app: zipkin
  ports:
    - port: 9411
      targetPort: 9411
      name: http
  type: ClusterIP
```

Apply the deployment:

```bash
kubectl apply -f zipkin-deployment.yaml

# Verify pods are running
kubectl get pods -n tracing -l app=zipkin
```

## Step 3: Access the Zipkin UI

Port-forward to access the web interface:

```bash
kubectl port-forward -n tracing svc/zipkin 9411:9411
```

Open http://localhost:9411 in your browser. You will see the Zipkin search interface where you can query traces by service name, operation, duration, and tags.

## Step 4: Instrument Applications

Zipkin supports instrumentation through OpenTelemetry or native Zipkin client libraries. Here are examples for common languages.

### Python with OpenTelemetry

```python
# Install: pip install opentelemetry-sdk opentelemetry-exporter-zipkin

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.zipkin.json import ZipkinExporter
from opentelemetry.sdk.resources import Resource

def setup_zipkin_tracing(service_name):
    """Set up tracing with Zipkin exporter."""
    resource = Resource.create({"service.name": service_name})

    # Configure the Zipkin exporter
    zipkin_exporter = ZipkinExporter(
        endpoint="http://zipkin.tracing.svc.cluster.local:9411/api/v2/spans"
    )

    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(zipkin_exporter))
    trace.set_tracer_provider(provider)

    return trace.get_tracer(service_name)

# Usage
tracer = setup_zipkin_tracing("my-service")

with tracer.start_as_current_span("process-request") as span:
    span.set_attribute("http.method", "GET")
    span.set_attribute("http.url", "/api/users")
    # Your application logic here
    result = process_request()
```

### Java with Spring Boot

Spring Boot has built-in Zipkin support through Micrometer Tracing:

```xml
<!-- pom.xml dependencies -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  tracing:
    sampling:
      probability: 0.1  # Sample 10% of requests
  zipkin:
    tracing:
      endpoint: http://zipkin.tracing.svc.cluster.local:9411/api/v2/spans
spring:
  application:
    name: my-java-service
```

### Go Application

```go
// Install: go get go.opentelemetry.io/otel/exporters/zipkin

package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/zipkin"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func initZipkinTracer(serviceName string) (*sdktrace.TracerProvider, error) {
    // Create the Zipkin exporter
    exporter, err := zipkin.New(
        "http://zipkin.tracing.svc.cluster.local:9411/api/v2/spans",
    )
    if err != nil {
        return nil, err
    }

    // Build the tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
        )),
        sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

## Step 5: Configure Index Lifecycle Management

For production, set up automatic cleanup of old trace data:

```yaml
# zipkin-index-cleanup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: zipkin-index-cleanup
  namespace: tracing
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Delete indices older than 7 days
                  CUTOFF_DATE=$(date -d "-7 days" +%Y.%m.%d 2>/dev/null || date -v-7d +%Y.%m.%d)
                  curl -X DELETE "http://zipkin-elasticsearch.tracing.svc.cluster.local:9200/zipkin:span-*,-zipkin:span-${CUTOFF_DATE}*"
          restartPolicy: OnFailure
```

```bash
kubectl apply -f zipkin-index-cleanup.yaml
```

## Step 6: Expose Zipkin with an Ingress

To make Zipkin accessible outside the cluster:

```yaml
# zipkin-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zipkin
  namespace: tracing
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: zipkin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: zipkin
                port:
                  number: 9411
```

## Monitoring Zipkin Health

Keep an eye on Zipkin's own health metrics:

```bash
# Check Zipkin health endpoint
kubectl exec -n tracing deploy/zipkin -- wget -qO- http://localhost:9411/health

# Check Elasticsearch index sizes
kubectl exec -n tracing zipkin-elasticsearch-0 -- curl -s 'localhost:9200/_cat/indices/zipkin*?v&s=index'
```

## Conclusion

Zipkin provides a straightforward path to distributed tracing on Talos Linux. Its simple architecture means fewer moving parts to manage, which aligns well with the Talos philosophy of minimalism and reliability. Deploy Zipkin with Elasticsearch for persistent storage, instrument your applications using OpenTelemetry SDKs, and you will have end-to-end visibility into request flows across your microservices. For teams that want tracing without the operational complexity of larger observability platforms, Zipkin is a pragmatic choice.
