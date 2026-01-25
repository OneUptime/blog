# How to Use Kubernetes Downward API for Pod Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Downward API, Pod Metadata, Configuration, DevOps

Description: A practical guide to using the Kubernetes Downward API to expose pod and container metadata to applications via environment variables and volume files, enabling dynamic configuration without hardcoding values.

---

The Downward API lets your applications access information about themselves and the cluster without calling the Kubernetes API directly. You can expose pod name, namespace, labels, annotations, resource limits, and more as environment variables or files.

## What the Downward API Provides

| Category | Available Fields |
|----------|-----------------|
| Pod | name, namespace, uid, labels, annotations |
| Container | resource limits, resource requests |
| Node | name, IP |
| Cluster | service account name |

## Environment Variables

### Pod Information

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
  labels:
    app: web
    version: v1
  annotations:
    owner: platform-team
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        # Pod name
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name

        # Pod namespace
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace

        # Pod IP
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP

        # Node name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName

        # Service account
        - name: SERVICE_ACCOUNT
          valueFrom:
            fieldRef:
              fieldPath: spec.serviceAccountName

        # Pod UID
        - name: POD_UID
          valueFrom:
            fieldRef:
              fieldPath: metadata.uid
```

### Container Resources

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-aware
spec:
  containers:
    - name: app
      image: myapp:v1
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
      env:
        # Memory limit
        - name: MEMORY_LIMIT
          valueFrom:
            resourceFieldRef:
              containerName: app
              resource: limits.memory

        # CPU limit
        - name: CPU_LIMIT
          valueFrom:
            resourceFieldRef:
              containerName: app
              resource: limits.cpu

        # Memory request
        - name: MEMORY_REQUEST
          valueFrom:
            resourceFieldRef:
              containerName: app
              resource: requests.memory

        # CPU request
        - name: CPU_REQUEST
          valueFrom:
            resourceFieldRef:
              containerName: app
              resource: requests.cpu
```

### Labels and Annotations

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: labeled-pod
  labels:
    app: web
    environment: production
  annotations:
    config-version: "2.1"
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        # Single label
        - name: APP_LABEL
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['app']

        # Single annotation
        - name: CONFIG_VERSION
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['config-version']
```

## Volume Files

For labels and annotations (which can be long), use volume mounts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: downward-volume
  labels:
    app: web
    version: v2
    component: frontend
  annotations:
    description: "Frontend web application"
    owner: platform-team
spec:
  containers:
    - name: app
      image: myapp:v1
      volumeMounts:
        - name: podinfo
          mountPath: /etc/podinfo
          readOnly: true
  volumes:
    - name: podinfo
      downwardAPI:
        items:
          # Pod labels as file
          - path: "labels"
            fieldRef:
              fieldPath: metadata.labels

          # Pod annotations as file
          - path: "annotations"
            fieldRef:
              fieldPath: metadata.annotations

          # Pod name
          - path: "name"
            fieldRef:
              fieldPath: metadata.name

          # Namespace
          - path: "namespace"
            fieldRef:
              fieldPath: metadata.namespace

          # CPU limit
          - path: "cpu_limit"
            resourceFieldRef:
              containerName: app
              resource: limits.cpu
              divisor: 1m    # Express in millicores

          # Memory limit
          - path: "mem_limit"
            resourceFieldRef:
              containerName: app
              resource: limits.memory
              divisor: 1Mi   # Express in mebibytes
```

Reading the files:

```bash
kubectl exec downward-volume -- cat /etc/podinfo/labels
# Output:
# app="web"
# component="frontend"
# version="v2"

kubectl exec downward-volume -- cat /etc/podinfo/annotations
# Output:
# description="Frontend web application"
# owner="platform-team"
```

## Common Use Cases

### Use Case 1: Logging with Pod Identity

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: logging-app
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

Application code:

```python
import os
import logging
import json

# Get pod info from environment
pod_name = os.environ.get('POD_NAME', 'unknown')
namespace = os.environ.get('POD_NAMESPACE', 'unknown')
node = os.environ.get('NODE_NAME', 'unknown')

# Configure structured logging
class PodInfoFilter(logging.Filter):
    def filter(self, record):
        record.pod_name = pod_name
        record.namespace = namespace
        record.node = node
        return True

logger = logging.getLogger(__name__)
logger.addFilter(PodInfoFilter())

# Log with pod context
logger.info("Application started", extra={
    "event": "startup",
    "pod": pod_name,
    "namespace": namespace,
    "node": node
})
```

### Use Case 2: Resource-Aware Application

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-aware-app
spec:
  containers:
    - name: java-app
      image: java-app:v1
      resources:
        limits:
          memory: "1Gi"
          cpu: "1000m"
      env:
        - name: MEMORY_LIMIT
          valueFrom:
            resourceFieldRef:
              containerName: java-app
              resource: limits.memory
      command:
        - java
        - -XX:MaxRAMPercentage=75.0    # Use 75% of container memory
        - -jar
        - app.jar
```

Or read memory limit in application:

```python
import os

# Get memory limit in bytes
memory_bytes = int(os.environ.get('MEMORY_LIMIT', '536870912'))
memory_mb = memory_bytes / (1024 * 1024)

# Configure application based on available memory
if memory_mb >= 1024:
    cache_size = 256  # MB
    worker_count = 4
else:
    cache_size = 64   # MB
    worker_count = 2

print(f"Configuring with {cache_size}MB cache and {worker_count} workers")
```

### Use Case 3: Service Discovery

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: service-pod
  labels:
    app: api
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: HOST_IP
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
```

Register with service registry:

```python
import os
import requests

pod_ip = os.environ.get('POD_IP')
pod_name = os.environ.get('POD_NAME')

# Register with Consul or similar
requests.put(
    'http://consul:8500/v1/agent/service/register',
    json={
        'Name': 'api-service',
        'ID': pod_name,
        'Address': pod_ip,
        'Port': 8080,
        'Check': {
            'HTTP': f'http://{pod_ip}:8080/health',
            'Interval': '10s'
        }
    }
)
```

### Use Case 4: Prometheus Metrics with Labels

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: metrics-app
  labels:
    app: web
    version: v2
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: APP_VERSION
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['version']
```

Add labels to metrics:

```python
from prometheus_client import Counter, Info

# Create info metric with pod details
pod_info = Info('app', 'Application information')
pod_info.info({
    'pod_name': os.environ.get('POD_NAME'),
    'namespace': os.environ.get('POD_NAMESPACE'),
    'version': os.environ.get('APP_VERSION')
})

# Counter with pod label
requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['pod', 'method', 'status']
)

# Usage
requests_total.labels(
    pod=os.environ.get('POD_NAME'),
    method='GET',
    status='200'
).inc()
```

### Use Case 5: Configuration Based on Environment

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: env-aware-app
  labels:
    environment: production
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        - name: ENVIRONMENT
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['environment']
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
```

Configure based on environment:

```python
import os

environment = os.environ.get('ENVIRONMENT', 'development')
namespace = os.environ.get('NAMESPACE', 'default')

# Environment-specific configuration
config = {
    'production': {
        'log_level': 'INFO',
        'debug': False,
        'cache_ttl': 3600
    },
    'staging': {
        'log_level': 'DEBUG',
        'debug': True,
        'cache_ttl': 300
    },
    'development': {
        'log_level': 'DEBUG',
        'debug': True,
        'cache_ttl': 60
    }
}

app_config = config.get(environment, config['development'])
print(f"Running in {environment} ({namespace})")
print(f"Config: {app_config}")
```

## Available Fields Reference

### fieldRef Fields

| Field | Description |
|-------|-------------|
| metadata.name | Pod name |
| metadata.namespace | Pod namespace |
| metadata.uid | Pod UID |
| metadata.labels | All labels (volume only) |
| metadata.annotations | All annotations (volume only) |
| metadata.labels['key'] | Specific label |
| metadata.annotations['key'] | Specific annotation |
| spec.nodeName | Node name |
| spec.serviceAccountName | Service account |
| status.hostIP | Node IP |
| status.podIP | Pod IP |
| status.podIPs | Pod IPs (volume only) |

### resourceFieldRef Fields

| Field | Description |
|-------|-------------|
| limits.cpu | CPU limit |
| limits.memory | Memory limit |
| limits.ephemeral-storage | Ephemeral storage limit |
| requests.cpu | CPU request |
| requests.memory | Memory request |
| requests.ephemeral-storage | Ephemeral storage request |

## Best Practices

### 1. Use Environment Variables for Simple Values

```yaml
env:
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
```

### 2. Use Volumes for Labels/Annotations

```yaml
# Labels and annotations can be large and change
volumes:
  - name: podinfo
    downwardAPI:
      items:
        - path: labels
          fieldRef:
            fieldPath: metadata.labels
```

### 3. Set Divisors for Resource Values

```yaml
# Get CPU in millicores instead of nanocores
resourceFieldRef:
  resource: limits.cpu
  divisor: 1m    # 1 millicore

# Get memory in mebibytes instead of bytes
resourceFieldRef:
  resource: limits.memory
  divisor: 1Mi   # 1 mebibyte
```

### 4. Always Provide Defaults

```python
# Handle missing environment variables
pod_name = os.environ.get('POD_NAME', 'unknown-pod')
memory_limit = int(os.environ.get('MEMORY_LIMIT', '536870912'))
```

### 5. Combine with ConfigMaps for Complete Configuration

```yaml
env:
  # From Downward API
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  # From ConfigMap
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: log_level
```

---

The Downward API provides a clean way to inject pod metadata into your applications without needing Kubernetes API access. Use environment variables for simple values like pod name and namespace, and volume files for labels and annotations. This enables dynamic configuration, better logging, and resource-aware applications without hardcoding cluster-specific values.
