# How to Configure Jaeger All-In-One with Persistent Storage for Kubernetes Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jaeger, Kubernetes, Tracing

Description: Set up Jaeger all-in-one with persistent storage in Kubernetes development environments to retain traces across pod restarts and enable debugging.

---

Jaeger all-in-one is perfect for development environments, combining collector, query service, and UI in a single container. However, the default in-memory storage loses all traces when the pod restarts. Adding persistent storage retains traces across restarts, enabling historical analysis and debugging without the complexity of production Jaeger deployments.

## Understanding Jaeger All-In-One

Jaeger all-in-one includes:
- **Collector**: Receives spans from applications
- **Agent**: Optional sidecar for span batching
- **Query**: API for retrieving traces
- **UI**: Web interface for visualization
- **Storage**: Badger (filesystem) or memory backend

It's suitable for:
- Development and testing
- Demo environments
- Small-scale deployments
- Learning and experimentation

## Basic Jaeger All-In-One Deployment

Start with the simplest deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: tracing
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
        image: jaegertracing/all-in-one:latest
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        - name: SPAN_STORAGE_TYPE
          value: "memory"
        ports:
        - containerPort: 5775
          protocol: UDP
          name: zipkin-compact
        - containerPort: 6831
          protocol: UDP
          name: jaeger-compact
        - containerPort: 6832
          protocol: UDP
          name: jaeger-binary
        - containerPort: 5778
          protocol: TCP
          name: config-rest
        - containerPort: 16686
          protocol: TCP
          name: query
        - containerPort: 14268
          protocol: TCP
          name: collector
        - containerPort: 4317
          protocol: TCP
          name: otlp-grpc
        - containerPort: 4318
          protocol: TCP
          name: otlp-http
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: tracing
spec:
  selector:
    app: jaeger
  ports:
  - name: query
    port: 16686
    targetPort: 16686
  - name: collector
    port: 14268
    targetPort: 14268
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

## Adding Persistent Storage with Badger

Configure Badger storage backend with persistent volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jaeger-badger-pvc
  namespace: tracing
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-persistent
  namespace: tracing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger-persistent
  template:
    metadata:
      labels:
        app: jaeger-persistent
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        env:
        - name: SPAN_STORAGE_TYPE
          value: "badger"
        - name: BADGER_EPHEMERAL
          value: "false"
        - name: BADGER_DIRECTORY_VALUE
          value: "/badger/data"
        - name: BADGER_DIRECTORY_KEY
          value: "/badger/key"
        # Configure data retention
        - name: BADGER_SPAN_STORE_TTL
          value: "168h"  # 7 days
        # Enable OTLP receiver
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        # Configure sampling
        - name: SAMPLING_STRATEGIES_FILE
          value: "/etc/jaeger/sampling.json"
        ports:
        - containerPort: 16686
          name: query
        - containerPort: 14268
          name: collector
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: badger-data
          mountPath: /badger
        - name: sampling-config
          mountPath: /etc/jaeger
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: badger-data
        persistentVolumeClaim:
          claimName: jaeger-badger-pvc
      - name: sampling-config
        configMap:
          name: jaeger-sampling-config
```

## Configuring Sampling Strategies

Create sampling configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-sampling-config
  namespace: tracing
data:
  sampling.json: |
    {
      "default_strategy": {
        "type": "probabilistic",
        "param": 0.1
      },
      "service_strategies": [
        {
          "service": "frontend",
          "type": "probabilistic",
          "param": 0.5
        },
        {
          "service": "backend-api",
          "type": "probabilistic",
          "param": 0.3
        },
        {
          "service": "worker",
          "type": "probabilistic",
          "param": 0.05
        }
      ]
    }
```

## Exposing Jaeger UI

Create Ingress for the UI:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jaeger-ingress
  namespace: tracing
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: jaeger.dev.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: jaeger
            port:
              number: 16686
```

## Instrumenting Applications

Send traces to Jaeger from applications:

**Go Application**:
```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() (*trace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(
        context.Background(),
        otlptracegrpc.WithEndpoint("jaeger.tracing.svc.cluster.local:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}
```

**Python Application**:
```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

def init_tracer():
    trace.set_tracer_provider(TracerProvider())
    tracer_provider = trace.get_tracer_provider()

    otlp_exporter = OTLPSpanExporter(
        endpoint="jaeger.tracing.svc.cluster.local:4317",
        insecure=True
    )

    span_processor = BatchSpanProcessor(otlp_exporter)
    tracer_provider.add_span_processor(span_processor)

    return trace.get_tracer(__name__)
```

## Configuring Resource Limits

Tune resources based on trace volume:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

# For high-volume development environments
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "4000m"
```

## Monitoring Jaeger Health

Add health checks:

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 14269
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /
    port: 14269
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Backing Up Badger Data

Create backup CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: jaeger-backup
  namespace: tracing
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: busybox
            command:
            - /bin/sh
            - -c
            - |
              tar czf /backup/jaeger-badger-$(date +%Y%m%d).tar.gz -C /badger .
              find /backup -name "jaeger-badger-*.tar.gz" -mtime +7 -delete
            volumeMounts:
            - name: badger-data
              mountPath: /badger
              readOnly: true
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: badger-data
            persistentVolumeClaim:
              claimName: jaeger-badger-pvc
          - name: backup-storage
            persistentVolumeClaim:
              claimName: jaeger-backup-pvc
```

## Upgrading to Production Setup

When ready for production, migrate to distributed Jaeger:

```yaml
# Use Jaeger Operator for production
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: tracing
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
  collector:
    replicas: 3
    resources:
      limits:
        memory: 2Gi
      requests:
        memory: 1Gi
  query:
    replicas: 2
```

## Best Practices

1. **Use Badger for persistence**: Enable durable storage in development
2. **Set appropriate TTL**: Balance storage space with retention needs
3. **Configure sampling**: Avoid overwhelming storage with high volumes
4. **Monitor disk usage**: Badger can grow large with long retention
5. **Back up regularly**: Protect important trace data
6. **Limit resources**: Prevent Jaeger from consuming all cluster resources
7. **Use production setup for staging**: Test with distributed architecture

## Troubleshooting

**High memory usage**:
- Reduce BADGER_SPAN_STORE_TTL
- Lower sampling rates
- Increase BADGER_TRUNCATION_INTERVAL

**Slow queries**:
- Check Badger compaction settings
- Ensure sufficient storage I/O
- Consider shorter retention periods

**Pod crashes**:
- Increase memory limits
- Check disk space availability
- Review Badger logs for corruption

## Conclusion

Jaeger all-in-one with persistent storage provides a practical tracing solution for Kubernetes development environments. It offers the simplicity of a single deployment while retaining traces across restarts. Configure appropriate retention periods and sampling rates to balance functionality with resource usage. When your needs grow, the migration path to production Jaeger with Elasticsearch or other backends is straightforward.
