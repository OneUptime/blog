# How to Build Kubernetes Adapter Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Design Patterns, Microservices, Observability

Description: Implement the adapter pattern in Kubernetes with sidecar containers that transform application output to standard formats for monitoring and logging.

---

Legacy applications often produce logs and metrics in formats that monitoring systems cannot consume directly. The adapter pattern solves this problem by adding a sidecar container that transforms application output into a standard format like JSON for logs or Prometheus metrics for monitoring.

## What is the Adapter Pattern?

The adapter pattern in Kubernetes uses a sidecar container to translate, transform, or expose data from the main application container. The main application writes data in its native format, and the adapter container converts it to whatever format your infrastructure expects.

```mermaid
flowchart LR
    subgraph Pod
        App[Application Container] -->|writes| Volume[(Shared Volume)]
        Volume -->|reads| Adapter[Adapter Container]
    end
    Adapter -->|exposes| External[Monitoring/Logging System]
```

### Common Adapter Use Cases

| Use Case | Input Format | Output Format | Adapter Type |
|----------|--------------|---------------|--------------|
| Log transformation | Plain text, custom format | JSON, structured logs | Log adapter |
| Metrics exposition | Application-specific | Prometheus format | Exporter adapter |
| Protocol translation | TCP, custom protocol | HTTP, gRPC | Protocol adapter |
| Data enrichment | Raw data | Enriched with metadata | Enrichment adapter |

## Why Use Adapters Instead of Modifying Applications?

There are several reasons to use the adapter pattern instead of changing your application code:

1. **Legacy applications** - You cannot modify closed-source or legacy code
2. **Separation of concerns** - Keep observability logic separate from business logic
3. **Reusability** - Use the same adapter across multiple applications
4. **Independent scaling** - Update adapters without redeploying applications
5. **Technology flexibility** - Switch monitoring backends without touching application code

## Log Format Transformation

Many applications write logs in formats that log aggregation systems cannot parse efficiently. An adapter can transform these logs into structured JSON.

### Basic Log Adapter Architecture

The application writes logs to a shared volume. The adapter reads these logs, parses them, and outputs structured JSON to stdout where a log collector like Fluentd or Vector picks them up.

```yaml
# log-adapter-deployment.yaml
# This deployment runs a legacy application with a log transformation adapter
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app-with-adapter
  labels:
    app: legacy-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy-app
  template:
    metadata:
      labels:
        app: legacy-app
    spec:
      # Both containers share this volume for log files
      volumes:
        - name: log-volume
          emptyDir: {}

      containers:
        # Main application container writes logs in its native format
        - name: legacy-app
          image: legacy-app:v1.2.3
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/app
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"

        # Adapter container transforms logs to JSON
        - name: log-adapter
          image: log-adapter:v1.0.0
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/app
              readOnly: true
          env:
            - name: LOG_PATH
              value: "/var/log/app/application.log"
            - name: OUTPUT_FORMAT
              value: "json"
            - name: APP_NAME
              value: "legacy-app"
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

### Building a Custom Log Adapter

Here is a Python-based log adapter that transforms Apache-style logs to JSON. This adapter tails the log file and outputs structured JSON to stdout.

```python
#!/usr/bin/env python3
# log_adapter.py
# Transforms Apache-style access logs to structured JSON

import os
import re
import json
import time
import sys
from datetime import datetime

# Apache combined log format regex pattern
APACHE_LOG_PATTERN = re.compile(
    r'(?P<ip>\S+)\s+'
    r'(?P<ident>\S+)\s+'
    r'(?P<user>\S+)\s+'
    r'\[(?P<timestamp>[^\]]+)\]\s+'
    r'"(?P<method>\S+)\s+(?P<path>\S+)\s+(?P<protocol>[^"]+)"\s+'
    r'(?P<status>\d+)\s+'
    r'(?P<size>\S+)\s+'
    r'"(?P<referer>[^"]*)"\s+'
    r'"(?P<user_agent>[^"]*)"'
)

def parse_apache_log(line):
    """Parse an Apache combined log line into a structured dict."""
    match = APACHE_LOG_PATTERN.match(line.strip())
    if not match:
        return None

    data = match.groupdict()

    # Convert size to integer, handling dash for missing values
    size = data['size']
    data['size'] = int(size) if size != '-' else 0

    # Convert status to integer
    data['status'] = int(data['status'])

    # Parse and standardize timestamp
    try:
        dt = datetime.strptime(data['timestamp'], '%d/%b/%Y:%H:%M:%S %z')
        data['timestamp'] = dt.isoformat()
    except ValueError:
        pass

    return data

def tail_file(filepath, poll_interval=0.1):
    """Generator that yields new lines from a file, similar to tail -f."""
    with open(filepath, 'r') as f:
        # Go to end of file
        f.seek(0, 2)

        while True:
            line = f.readline()
            if line:
                yield line
            else:
                time.sleep(poll_interval)

def main():
    log_path = os.environ.get('LOG_PATH', '/var/log/app/access.log')
    app_name = os.environ.get('APP_NAME', 'unknown')
    pod_name = os.environ.get('POD_NAME', 'unknown')
    namespace = os.environ.get('NAMESPACE', 'default')

    # Wait for log file to exist
    while not os.path.exists(log_path):
        print(json.dumps({
            'level': 'info',
            'message': f'Waiting for log file: {log_path}',
            'app': app_name
        }), flush=True)
        time.sleep(1)

    print(json.dumps({
        'level': 'info',
        'message': f'Starting log adapter for {log_path}',
        'app': app_name
    }), flush=True)

    for line in tail_file(log_path):
        parsed = parse_apache_log(line)

        if parsed:
            # Add Kubernetes metadata
            output = {
                'app': app_name,
                'pod': pod_name,
                'namespace': namespace,
                'type': 'access_log',
                **parsed
            }
        else:
            # Output unparseable lines as raw messages
            output = {
                'app': app_name,
                'pod': pod_name,
                'namespace': namespace,
                'type': 'raw',
                'message': line.strip(),
                'timestamp': datetime.utcnow().isoformat()
            }

        print(json.dumps(output), flush=True)

if __name__ == '__main__':
    main()
```

### Dockerfile for the Log Adapter

```dockerfile
# Dockerfile for log adapter
FROM python:3.11-slim

WORKDIR /app

# Copy the adapter script
COPY log_adapter.py /app/

# Make it executable
RUN chmod +x /app/log_adapter.py

# Run as non-root user
RUN useradd -r -u 1000 adapter
USER adapter

ENTRYPOINT ["python3", "/app/log_adapter.py"]
```

### Multi-Format Log Adapter

Applications often produce different log formats in different files. This adapter configuration handles multiple log sources.

```yaml
# multi-log-adapter-configmap.yaml
# Configuration for handling multiple log formats
apiVersion: v1
kind: ConfigMap
metadata:
  name: log-adapter-config
data:
  config.yaml: |
    sources:
      - path: /var/log/app/access.log
        format: apache_combined
        type: access_log
      - path: /var/log/app/error.log
        format: syslog
        type: error_log
      - path: /var/log/app/application.log
        format: java_log4j
        type: application_log

    output:
      format: json
      add_kubernetes_metadata: true
      fields:
        service: legacy-app
        environment: production

    parsing:
      multiline:
        enabled: true
        pattern: "^\\d{4}-\\d{2}-\\d{2}"
        timeout_ms: 3000
```

```yaml
# multi-log-adapter-deployment.yaml
# Deployment with multiple log sources and a single adapter
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-log-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: multi-log-app
  template:
    metadata:
      labels:
        app: multi-log-app
    spec:
      volumes:
        - name: log-volume
          emptyDir: {}
        - name: adapter-config
          configMap:
            name: log-adapter-config

      containers:
        - name: application
          image: complex-legacy-app:v2.0.0
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/app

        - name: log-adapter
          image: multi-format-log-adapter:v1.0.0
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/app
              readOnly: true
            - name: adapter-config
              mountPath: /etc/adapter
          env:
            - name: CONFIG_PATH
              value: "/etc/adapter/config.yaml"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
```

## Metrics Exposition with Prometheus Exporters

Many applications expose metrics in custom formats or require specific endpoints to extract performance data. Prometheus exporter adapters convert these metrics to the Prometheus exposition format.

### Exporter Adapter Architecture

| Component | Responsibility |
|-----------|----------------|
| Main application | Exposes metrics in native format |
| Exporter adapter | Scrapes application, transforms to Prometheus format |
| Prometheus | Scrapes the exporter endpoint |

### Redis Exporter Example

This example shows how to add a Prometheus exporter for a Redis instance.

```yaml
# redis-with-exporter.yaml
# Redis deployment with Prometheus exporter sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
      annotations:
        # Prometheus will discover this pod via these annotations
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        # Main Redis container
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
              name: redis
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            tcpSocket:
              port: redis
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5

        # Prometheus exporter sidecar
        - name: redis-exporter
          image: oliver006/redis_exporter:v1.55.0
          ports:
            - containerPort: 9121
              name: metrics
          env:
            - name: REDIS_ADDR
              value: "localhost:6379"
          resources:
            requests:
              memory: "32Mi"
              cpu: "25m"
            limits:
              memory: "64Mi"
              cpu: "50m"
          livenessProbe:
            httpGet:
              path: /health
              port: metrics
            initialDelaySeconds: 10
            periodSeconds: 10
---
# Service exposes both Redis and metrics ports
apiVersion: v1
kind: Service
metadata:
  name: redis
  labels:
    app: redis
spec:
  ports:
    - port: 6379
      targetPort: 6379
      name: redis
    - port: 9121
      targetPort: 9121
      name: metrics
  selector:
    app: redis
```

### Custom Application Metrics Exporter

When your application exposes metrics in a custom format, you need a custom exporter. Here is an example for an application that exposes JSON metrics.

```python
#!/usr/bin/env python3
# custom_exporter.py
# Converts JSON metrics to Prometheus format

import os
import time
import requests
from prometheus_client import start_http_server, Gauge, Counter, Histogram
from prometheus_client.core import GaugeMetricFamily, CounterMetricFamily, REGISTRY

class CustomMetricsCollector:
    """Collects metrics from a JSON endpoint and exposes them for Prometheus."""

    def __init__(self, metrics_url, app_name):
        self.metrics_url = metrics_url
        self.app_name = app_name

    def collect(self):
        """Fetch and convert metrics on each scrape."""
        try:
            response = requests.get(self.metrics_url, timeout=5)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            # Expose a metric indicating scrape failure
            error_metric = GaugeMetricFamily(
                'custom_exporter_scrape_error',
                'Indicates a scrape error occurred',
                labels=['app', 'error']
            )
            error_metric.add_metric([self.app_name, str(e)], 1)
            yield error_metric
            return

        # Convert request counts to Prometheus counters
        if 'request_count' in data:
            request_counter = CounterMetricFamily(
                'app_requests_total',
                'Total number of requests',
                labels=['app', 'endpoint']
            )
            for endpoint, count in data['request_count'].items():
                request_counter.add_metric([self.app_name, endpoint], count)
            yield request_counter

        # Convert response times to Prometheus gauges
        if 'response_times' in data:
            for stat in ['avg', 'p50', 'p95', 'p99']:
                if stat in data['response_times']:
                    gauge = GaugeMetricFamily(
                        f'app_response_time_{stat}_seconds',
                        f'{stat.upper()} response time in seconds',
                        labels=['app']
                    )
                    gauge.add_metric([self.app_name], data['response_times'][stat] / 1000)
                    yield gauge

        # Convert active connections to gauge
        if 'active_connections' in data:
            connections = GaugeMetricFamily(
                'app_active_connections',
                'Number of active connections',
                labels=['app']
            )
            connections.add_metric([self.app_name], data['active_connections'])
            yield connections

        # Convert error counts by type
        if 'errors' in data:
            errors = CounterMetricFamily(
                'app_errors_total',
                'Total number of errors by type',
                labels=['app', 'error_type']
            )
            for error_type, count in data['errors'].items():
                errors.add_metric([self.app_name, error_type], count)
            yield errors

        # Convert memory and CPU usage
        if 'resources' in data:
            res = data['resources']
            if 'memory_bytes' in res:
                mem = GaugeMetricFamily(
                    'app_memory_usage_bytes',
                    'Memory usage in bytes',
                    labels=['app']
                )
                mem.add_metric([self.app_name], res['memory_bytes'])
                yield mem

            if 'cpu_percent' in res:
                cpu = GaugeMetricFamily(
                    'app_cpu_usage_ratio',
                    'CPU usage as a ratio',
                    labels=['app']
                )
                cpu.add_metric([self.app_name], res['cpu_percent'] / 100)
                yield cpu

def main():
    metrics_url = os.environ.get('METRICS_URL', 'http://localhost:8080/stats')
    app_name = os.environ.get('APP_NAME', 'unknown')
    exporter_port = int(os.environ.get('EXPORTER_PORT', '9090'))

    # Register custom collector
    REGISTRY.register(CustomMetricsCollector(metrics_url, app_name))

    # Start HTTP server for Prometheus to scrape
    start_http_server(exporter_port)
    print(f'Exporter listening on port {exporter_port}')

    # Keep running
    while True:
        time.sleep(60)

if __name__ == '__main__':
    main()
```

### Deployment with Custom Exporter

```yaml
# custom-exporter-deployment.yaml
# Application with custom metrics exporter sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-custom-exporter
spec:
  replicas: 3
  selector:
    matchLabels:
      app: custom-metrics-app
  template:
    metadata:
      labels:
        app: custom-metrics-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
        - name: application
          image: my-app:v1.0.0
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: ENABLE_METRICS
              value: "true"

        - name: metrics-exporter
          image: custom-exporter:v1.0.0
          ports:
            - containerPort: 9090
              name: metrics
          env:
            - name: METRICS_URL
              value: "http://localhost:8080/stats"
            - name: APP_NAME
              value: "my-app"
            - name: EXPORTER_PORT
              value: "9090"
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

## Shared Volumes for Log Collection

Proper volume configuration is critical for adapter patterns. The main application writes data, and the adapter reads it. Here are different volume strategies.

### EmptyDir Volume

Best for ephemeral logs that do not need to persist across pod restarts.

```yaml
# emptydir-volume-example.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ephemeral-logs
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ephemeral-logs
  template:
    metadata:
      labels:
        app: ephemeral-logs
    spec:
      volumes:
        # EmptyDir is created when pod starts, deleted when pod stops
        - name: logs
          emptyDir:
            # Use memory-backed storage for better performance
            # medium: Memory
            # Limit size to prevent filling node disk
            sizeLimit: 500Mi

      containers:
        - name: app
          image: my-app:v1.0.0
          volumeMounts:
            - name: logs
              mountPath: /var/log/app

        - name: log-adapter
          image: log-adapter:v1.0.0
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
              readOnly: true
```

### PersistentVolumeClaim for Log Retention

Use when you need logs to survive pod restarts for debugging or compliance.

```yaml
# persistent-logs.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-logs-pvc
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
  name: persistent-logs-app
spec:
  replicas: 1  # Must be 1 with ReadWriteOnce
  selector:
    matchLabels:
      app: persistent-logs-app
  template:
    metadata:
      labels:
        app: persistent-logs-app
    spec:
      volumes:
        - name: logs
          persistentVolumeClaim:
            claimName: app-logs-pvc

      # Init container to set permissions
      initContainers:
        - name: fix-permissions
          image: busybox:1.36
          command: ['sh', '-c', 'chmod -R 755 /var/log/app && chown -R 1000:1000 /var/log/app']
          volumeMounts:
            - name: logs
              mountPath: /var/log/app

      containers:
        - name: app
          image: my-app:v1.0.0
          securityContext:
            runAsUser: 1000
          volumeMounts:
            - name: logs
              mountPath: /var/log/app

        - name: log-adapter
          image: log-adapter:v1.0.0
          securityContext:
            runAsUser: 1000
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
              readOnly: true
```

### Volume Mount Strategies

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| EmptyDir | Ephemeral logs | Fast, simple | Lost on pod restart |
| EmptyDir (Memory) | High-throughput logs | Very fast | Uses RAM, limited size |
| PVC | Persistent logs | Survives restarts | Slower, single pod (RWO) |
| HostPath | Debug/testing | Direct node access | Not portable |

## Database Exporter Adapters

Databases often need specialized exporters. Here are examples for common databases.

### PostgreSQL Exporter

```yaml
# postgres-with-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9187"
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data

        - name: postgres-exporter
          image: prometheuscommunity/postgres-exporter:v0.15.0
          ports:
            - containerPort: 9187
              name: metrics
          env:
            - name: DATA_SOURCE_NAME
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: datasource
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"

      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
stringData:
  password: "your-secure-password"
  datasource: "postgresql://postgres:your-secure-password@localhost:5432/postgres?sslmode=disable"
```

### MySQL Exporter

```yaml
# mysql-with-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9104"
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: root-password
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql

        - name: mysql-exporter
          image: prom/mysqld-exporter:v0.15.1
          ports:
            - containerPort: 9104
              name: metrics
          env:
            - name: MYSQLD_EXPORTER_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: exporter-password
            - name: DATA_SOURCE_NAME
              value: "exporter:$(MYSQLD_EXPORTER_PASSWORD)@(localhost:3306)/"
          args:
            - "--collect.info_schema.tables"
            - "--collect.info_schema.innodb_metrics"
            - "--collect.global_status"
            - "--collect.global_variables"
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"

      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mysql-data
```

## ServiceMonitor for Prometheus Operator

If you use the Prometheus Operator, create ServiceMonitors to automatically discover your exporters.

```yaml
# servicemonitor-redis.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-monitor
  labels:
    release: prometheus  # Match your Prometheus Operator labels
spec:
  selector:
    matchLabels:
      app: redis
  endpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
  namespaceSelector:
    matchNames:
      - default
```

```yaml
# servicemonitor-generic.yaml
# Generic ServiceMonitor for any app with Prometheus annotations
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: annotated-services
spec:
  selector:
    matchExpressions:
      - key: prometheus.io/scrape
        operator: Exists
  endpoints:
    - port: metrics
      interval: 30s
  namespaceSelector:
    any: true
```

## Log Rotation in Adapter Patterns

Without log rotation, volumes can fill up and crash your application. Here is how to handle log rotation with adapters.

### Using Logrotate Sidecar

```yaml
# logrotate-adapter.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logrotate-config
data:
  app.conf: |
    /var/log/app/*.log {
        size 100M
        rotate 5
        missingok
        notifempty
        compress
        delaycompress
        copytruncate
        dateext
        dateformat -%Y%m%d-%s
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-logrotate
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app-with-logrotate
  template:
    metadata:
      labels:
        app: app-with-logrotate
    spec:
      volumes:
        - name: logs
          emptyDir:
            sizeLimit: 1Gi
        - name: logrotate-config
          configMap:
            name: logrotate-config

      containers:
        - name: app
          image: my-app:v1.0.0
          volumeMounts:
            - name: logs
              mountPath: /var/log/app

        - name: log-adapter
          image: log-adapter:v1.0.0
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
              readOnly: true

        # Logrotate sidecar runs periodically
        - name: logrotate
          image: blacklabelops/logrotate:1.3
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
            - name: logrotate-config
              mountPath: /etc/logrotate.d
          env:
            - name: LOGS_DIRECTORIES
              value: "/var/log/app"
            - name: LOGROTATE_INTERVAL
              value: "hourly"
          resources:
            requests:
              memory: "32Mi"
              cpu: "25m"
            limits:
              memory: "64Mi"
              cpu: "50m"
```

## Network Policies for Adapter Pods

Secure your adapter pods by limiting network access. Adapters should only communicate with their main container and the monitoring system.

```yaml
# network-policy-adapter.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: adapter-pod-policy
spec:
  podSelector:
    matchLabels:
      app: app-with-exporter
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow Prometheus to scrape metrics
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
  egress:
    # Allow DNS lookups
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow communication within the pod (localhost)
    - to:
        - podSelector:
            matchLabels:
              app: app-with-exporter
```

## Resource Limits for Adapters

Adapters should use minimal resources. Here are guidelines for sizing adapter containers.

| Adapter Type | CPU Request | CPU Limit | Memory Request | Memory Limit |
|--------------|-------------|-----------|----------------|--------------|
| Log adapter (simple) | 25m | 100m | 32Mi | 64Mi |
| Log adapter (parsing) | 50m | 200m | 64Mi | 128Mi |
| Prometheus exporter | 25m | 100m | 32Mi | 64Mi |
| Custom exporter | 50m | 200m | 64Mi | 128Mi |

```yaml
# resource-limits-example.yaml
containers:
  - name: log-adapter
    image: log-adapter:v1.0.0
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
    # Prevent adapter from being OOMKilled before main app
    # by setting a lower priority
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
```

## Health Checks for Adapters

Adapters need their own health checks to restart if they fail.

```yaml
# adapter-health-checks.yaml
containers:
  - name: log-adapter
    image: log-adapter:v1.0.0
    livenessProbe:
      exec:
        # Check if the adapter process is running
        command:
          - pgrep
          - -f
          - log_adapter
      initialDelaySeconds: 10
      periodSeconds: 30
    readinessProbe:
      exec:
        # Check if log file is being read
        command:
          - sh
          - -c
          - "test -f /var/log/app/application.log"
      initialDelaySeconds: 5
      periodSeconds: 10

  - name: metrics-exporter
    image: metrics-exporter:v1.0.0
    livenessProbe:
      httpGet:
        path: /health
        port: 9090
      initialDelaySeconds: 10
      periodSeconds: 30
    readinessProbe:
      httpGet:
        path: /metrics
        port: 9090
      initialDelaySeconds: 5
      periodSeconds: 10
```

## Debugging Adapter Pods

When adapters fail, use these commands to debug.

```bash
# Check if volumes are mounted correctly
kubectl exec -it pod-name -c log-adapter -- ls -la /var/log/app/

# Check adapter logs
kubectl logs pod-name -c log-adapter

# Check if main app is writing logs
kubectl exec -it pod-name -c main-app -- tail -f /var/log/app/application.log

# Check volume permissions
kubectl exec -it pod-name -c log-adapter -- stat /var/log/app/

# Test exporter endpoint
kubectl exec -it pod-name -c metrics-exporter -- wget -qO- http://localhost:9090/metrics

# Port forward to test exporter locally
kubectl port-forward pod-name 9090:9090
curl http://localhost:9090/metrics
```

## Complete Example: Legacy Application with Full Observability

This example shows a complete setup with log transformation, metrics exposition, and proper configuration.

```yaml
# complete-adapter-example.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: legacy-app-adapter-config
data:
  log-adapter.yaml: |
    source:
      path: /var/log/app/application.log
      format: custom
      pattern: '^\[(?P<timestamp>[^\]]+)\] \[(?P<level>\w+)\] (?P<message>.*)$'
    output:
      format: json
      timestamp_format: iso8601

  exporter.yaml: |
    metrics_path: /internal/stats
    metrics_port: 8081
    mappings:
      - source: requests
        target: app_requests_total
        type: counter
      - source: latency_ms
        target: app_latency_seconds
        type: gauge
        scale: 0.001
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app-full-observability
  labels:
    app: legacy-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: legacy-app
  template:
    metadata:
      labels:
        app: legacy-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      volumes:
        - name: logs
          emptyDir:
            sizeLimit: 500Mi
        - name: adapter-config
          configMap:
            name: legacy-app-adapter-config

      containers:
        # Main application
        - name: legacy-app
          image: legacy-app:v3.2.1
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 8081
              name: internal
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
          env:
            - name: LOG_PATH
              value: "/var/log/app/application.log"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5

        # Log transformation adapter
        - name: log-adapter
          image: universal-log-adapter:v2.0.0
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
              readOnly: true
            - name: adapter-config
              mountPath: /etc/adapter
          env:
            - name: CONFIG_FILE
              value: "/etc/adapter/log-adapter.yaml"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1000

        # Metrics exporter adapter
        - name: metrics-exporter
          image: generic-metrics-exporter:v1.5.0
          ports:
            - containerPort: 9090
              name: metrics
          volumeMounts:
            - name: adapter-config
              mountPath: /etc/adapter
          env:
            - name: CONFIG_FILE
              value: "/etc/adapter/exporter.yaml"
            - name: TARGET_HOST
              value: "localhost"
            - name: EXPORTER_PORT
              value: "9090"
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          livenessProbe:
            httpGet:
              path: /health
              port: 9090
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /metrics
              port: 9090
            initialDelaySeconds: 5
            periodSeconds: 10
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1000
---
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
  labels:
    app: legacy-app
spec:
  ports:
    - port: 80
      targetPort: 8080
      name: http
    - port: 9090
      targetPort: 9090
      name: metrics
  selector:
    app: legacy-app
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: legacy-app-monitor
spec:
  selector:
    matchLabels:
      app: legacy-app
  endpoints:
    - port: metrics
      interval: 30s
```

## Summary

The adapter pattern transforms applications into observable systems without code changes. Key takeaways:

1. **Use shared volumes** to pass data between main containers and adapters
2. **Keep adapters lightweight** with minimal resource requests
3. **Add health checks** to adapters so they restart on failure
4. **Use ConfigMaps** for adapter configuration to enable updates without rebuilding images
5. **Secure adapters** with network policies and security contexts
6. **Monitor adapter health** alongside your main application

Start with simple log adapters and Prometheus exporters. As your needs grow, build custom adapters that fit your specific data formats and monitoring requirements.
