# How to Use Podman with Kubernetes YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Kubernetes, YAML, Containers, DevOps, Container Orchestration, Docker Alternative, Local Development

Description: A practical guide to using Podman's Kubernetes YAML support for local development and production deployments. Learn to import, export, and manage Kubernetes manifests directly with Podman.

---

> "Develop locally, deploy globally." - Cloud Native Proverb

Podman's native Kubernetes YAML support bridges the gap between local container development and production Kubernetes deployments. Instead of maintaining separate configurations for development and production, you can use the same Kubernetes manifests everywhere. Let me walk you through how to leverage Podman's `play kube` and `generate kube` commands effectively.

## Why Use Kubernetes YAML with Podman?

Running Kubernetes clusters locally for development can be resource-intensive and complex. Minikube, Kind, and K3s all require significant setup and resources. Podman offers an alternative approach: run your Kubernetes YAML manifests directly without needing a full cluster.

```mermaid
flowchart LR
    subgraph DEV["Local Development"]
        YAML["Kubernetes YAML"]
        PODMAN["Podman"]
        CONTAINERS["Containers"]

        YAML -->|"podman play kube"| PODMAN
        PODMAN -->|creates| CONTAINERS
    end

    subgraph PROD["Production"]
        K8S["Kubernetes Cluster"]
        PODS["Production Pods"]

        YAML -->|"kubectl apply"| K8S
        K8S -->|deploys| PODS
    end
```

### Benefits of Podman's Kubernetes YAML Support

- **Same manifests everywhere**: Use identical YAML files for development and production
- **No cluster overhead**: Run containers without Kubernetes control plane components
- **Rootless execution**: Run everything without root privileges for better security
- **Quick iteration**: Faster startup compared to full Kubernetes clusters
- **Resource efficiency**: Lower memory and CPU footprint than running minikube or kind

## Getting Started with podman play kube

The `podman play kube` command reads Kubernetes YAML files and creates equivalent Podman containers and pods. Podman supports Pod, Deployment, DaemonSet, and ConfigMap resource types.

### Running Your First Kubernetes Pod

Create a simple pod manifest and run it with Podman.

```yaml
# pod.yaml
# Define a basic Kubernetes Pod with an nginx container
# Podman will create a pod with the same structure
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  labels:
    app: web
    environment: development
spec:
  containers:
    # Main nginx container serving static content
    - name: nginx
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
      resources:
        limits:
          memory: "128Mi"
          cpu: "500m"
```

Run the manifest with Podman.

```bash
# Execute the Kubernetes YAML file with Podman
# Creates a pod named web-server with an nginx container
podman play kube pod.yaml

# Verify the pod is running
# Shows pod status including container count and state
podman pod ps

# Check container status within the pod
podman ps --pod

# Access the nginx server
curl http://localhost:8080
```

### Understanding the Output

```bash
# Sample output from podman play kube
Pod:
  web-server
Container:
  nginx

# Podman creates an infra container automatically
# The infra container maintains shared namespaces for the pod
podman ps -a --format "{{.Names}} {{.Status}}"
# web-server-nginx    Up 30 seconds ago
# web-server-infra    Up 30 seconds ago
```

## Working with Deployments

Podman can also process Kubernetes Deployment manifests. While Podman does not implement a full controller, it creates the specified number of pod replicas.

### Creating a Multi-Container Deployment

```yaml
# deployment.yaml
# Kubernetes Deployment with multiple containers per pod
# Podman will create the specified number of replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  labels:
    app: api
spec:
  # Number of pod replicas to create
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        # Main API container
        - name: api
          image: docker.io/library/python:3.11-slim
          command: ["python", "-m", "http.server", "8000"]
          ports:
            - containerPort: 8000
          env:
            - name: ENVIRONMENT
              value: "development"
            - name: LOG_LEVEL
              value: "debug"
        # Redis sidecar for caching
        - name: cache
          image: docker.io/library/redis:7-alpine
          ports:
            - containerPort: 6379
```

Deploy and manage the deployment.

```bash
# Create pods from the deployment manifest
# Podman creates 2 replicas as specified
podman play kube deployment.yaml

# List all created pods
# Each replica gets a unique pod name
podman pod ps

# Expected output:
# POD ID        NAME                  STATUS   # OF CONTAINERS
# abc123def456  api-deployment-pod-0  Running  3
# 789ghi012jkl  api-deployment-pod-1  Running  3

# Scale down by tearing down and redeploying
# Modify replicas in YAML then reapply
podman play kube --down deployment.yaml
podman play kube deployment.yaml
```

## Using ConfigMaps and Secrets

Podman supports Kubernetes ConfigMaps for externalizing configuration. Secrets are also supported for sensitive data.

### ConfigMap Example

```yaml
# configmap.yaml
# Store application configuration separately from the pod spec
# Podman mounts ConfigMap data as files or environment variables
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # Configuration file content
  config.json: |
    {
      "database": {
        "host": "localhost",
        "port": 5432,
        "name": "appdb"
      },
      "cache": {
        "enabled": true,
        "ttl": 3600
      }
    }
  # Simple key-value entries
  LOG_FORMAT: "json"
  MAX_CONNECTIONS: "100"
---
apiVersion: v1
kind: Pod
metadata:
  name: configured-app
spec:
  containers:
    - name: app
      image: docker.io/library/alpine:latest
      command: ["sh", "-c", "cat /etc/config/config.json && sleep infinity"]
      # Mount ConfigMap as a volume
      volumeMounts:
        - name: config-volume
          mountPath: /etc/config
      # Inject ConfigMap values as environment variables
      env:
        - name: LOG_FORMAT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_FORMAT
  volumes:
    - name: config-volume
      configMap:
        name: app-config
```

Apply the ConfigMap and Pod together.

```bash
# Apply ConfigMap and Pod from the same file
# Podman processes multiple documents in a single YAML
podman play kube configmap.yaml

# Verify ConfigMap was created
podman volume ls

# Check that configuration was mounted correctly
podman exec configured-app cat /etc/config/config.json

# Verify environment variable was set
podman exec configured-app printenv LOG_FORMAT
```

### Working with Secrets

```yaml
# secret.yaml
# Store sensitive data as Kubernetes Secrets
# Values must be base64 encoded
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  # base64 encoded values
  # echo -n 'admin' | base64 = YWRtaW4=
  username: YWRtaW4=
  # echo -n 'supersecret123' | base64 = c3VwZXJzZWNyZXQxMjM=
  password: c3VwZXJzZWNyZXQxMjM=
---
apiVersion: v1
kind: Pod
metadata:
  name: db-client
spec:
  containers:
    - name: client
      image: docker.io/library/postgres:15-alpine
      env:
        # Inject secrets as environment variables
        - name: PGUSER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
      command: ["sleep", "infinity"]
```

## Generating Kubernetes YAML from Running Containers

Podman can export running containers and pods to Kubernetes YAML format. Use the `podman generate kube` command to create deployment-ready manifests.

```mermaid
flowchart TB
    subgraph LOCAL["Podman Environment"]
        C1["Container 1<br/>nginx"]
        C2["Container 2<br/>redis"]
        POD["Pod: myapp"]

        C1 --> POD
        C2 --> POD
    end

    GEN["podman generate kube"]
    YAML["Kubernetes YAML<br/>Manifest"]

    POD -->|export| GEN
    GEN --> YAML

    subgraph TARGETS["Deployment Targets"]
        K8S["Kubernetes"]
        OPENSHIFT["OpenShift"]
        OTHER["Other Podman<br/>Instances"]
    end

    YAML -->|kubectl apply| K8S
    YAML -->|oc apply| OPENSHIFT
    YAML -->|podman play kube| OTHER
```

### Exporting a Pod to YAML

```bash
# Create a pod with multiple containers interactively
# First, create the pod structure
podman pod create --name export-demo --publish 8080:80 --publish 6379:6379

# Add an nginx container to the pod
podman run -d --pod export-demo \
    --name export-demo-nginx \
    nginx:alpine

# Add a redis container to the same pod
podman run -d --pod export-demo \
    --name export-demo-redis \
    redis:alpine

# Export the entire pod to Kubernetes YAML
# Output includes all containers, volumes, and configurations
podman generate kube export-demo > export-demo.yaml

# View the generated YAML
cat export-demo.yaml
```

### Generated YAML Structure

```yaml
# Generated by: podman generate kube export-demo
# Save the output of podman generate kube command:
apiVersion: v1
kind: Pod
metadata:
  annotations:
    io.podman.annotations.autoremove/export-demo-nginx: "FALSE"
    io.podman.annotations.autoremove/export-demo-redis: "FALSE"
  creationTimestamp: "2026-02-02T10:30:00Z"
  labels:
    app: export-demo
  name: export-demo
spec:
  containers:
    - image: docker.io/library/nginx:alpine
      name: export-demo-nginx
      ports:
        - containerPort: 80
          hostPort: 8080
      resources: {}
      securityContext:
        capabilities:
          drop:
            - CAP_MKNOD
            - CAP_NET_RAW
            - CAP_AUDIT_WRITE
    - image: docker.io/library/redis:alpine
      name: export-demo-redis
      ports:
        - containerPort: 6379
          hostPort: 6379
      resources: {}
  restartPolicy: Never
```

### Export Options

```bash
# Generate YAML with service definition included
# Adds a Kubernetes Service for load balancing
podman generate kube --service export-demo > with-service.yaml

# Generate YAML for a specific container instead of pod
podman generate kube export-demo-nginx > single-container.yaml

# Output YAML to stdout for piping
podman generate kube export-demo | kubectl apply -f -
```

## Advanced Usage Patterns

### Development Workflow with Live Reloading

Mount source code into containers for live development.

```yaml
# dev-pod.yaml
# Development pod with source code mounted from host
# Changes to local files are immediately visible in the container
apiVersion: v1
kind: Pod
metadata:
  name: dev-server
spec:
  containers:
    - name: node-app
      image: docker.io/library/node:20-alpine
      command: ["npm", "run", "dev"]
      workingDir: /app
      ports:
        - containerPort: 3000
          hostPort: 3000
      # Mount local source directory
      volumeMounts:
        - name: source-code
          mountPath: /app
      env:
        - name: NODE_ENV
          value: "development"
  volumes:
    - name: source-code
      hostPath:
        path: /home/developer/projects/myapp
        type: Directory
```

Run the development environment.

```bash
# Start the development pod
podman play kube dev-pod.yaml

# Follow application logs in real-time
podman logs -f dev-server-node-app

# Execute commands inside the container
podman exec -it dev-server-node-app sh

# Tear down when done
podman play kube --down dev-pod.yaml
```

### Multi-Pod Application Stack

```yaml
# stack.yaml
# Complete application stack with multiple pods
# Demonstrates pod-to-pod communication
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-init
data:
  init.sql: |
    CREATE DATABASE IF NOT EXISTS appdb;
    CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppass';
    GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'%';
    FLUSH PRIVILEGES;
---
apiVersion: v1
kind: Pod
metadata:
  name: database
  labels:
    app: database
spec:
  containers:
    - name: mysql
      image: docker.io/library/mysql:8
      ports:
        - containerPort: 3306
          hostPort: 3306
      env:
        - name: MYSQL_ROOT_PASSWORD
          value: "rootsecret"
      volumeMounts:
        - name: db-init
          mountPath: /docker-entrypoint-initdb.d
        - name: mysql-data
          mountPath: /var/lib/mysql
  volumes:
    - name: db-init
      configMap:
        name: db-init
    - name: mysql-data
      persistentVolumeClaim:
        claimName: mysql-pvc
---
apiVersion: v1
kind: Pod
metadata:
  name: backend
  labels:
    app: backend
spec:
  containers:
    - name: api
      image: docker.io/library/python:3.11-slim
      ports:
        - containerPort: 5000
          hostPort: 5000
      env:
        # Use host.containers.internal to reach other pods
        - name: DATABASE_URL
          value: "mysql://appuser:apppass@host.containers.internal:3306/appdb"
      command:
        - python
        - -c
        - |
          from http.server import HTTPServer, BaseHTTPRequestHandler
          class Handler(BaseHTTPRequestHandler):
              def do_GET(self):
                  self.send_response(200)
                  self.end_headers()
                  self.wfile.write(b'API Response')
          HTTPServer(('', 5000), Handler).serve_forever()
---
apiVersion: v1
kind: Pod
metadata:
  name: frontend
  labels:
    app: frontend
spec:
  containers:
    - name: nginx
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
      volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d/default.conf
          subPath: default.conf
  volumes:
    - name: nginx-config
      configMap:
        name: nginx-config
```

Deploy the entire stack.

```bash
# Deploy all resources from the stack file
podman play kube stack.yaml

# Verify all pods are running
podman pod ps

# Check logs from specific containers
podman logs database-mysql
podman logs backend-api
podman logs frontend-nginx

# Tear down the entire stack
podman play kube --down stack.yaml
```

## Persistent Volumes with Podman

Podman handles Kubernetes PersistentVolumeClaim resources by creating local volumes.

```yaml
# persistent.yaml
# Pod with persistent storage
# Data survives pod restarts
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: data-pod
spec:
  containers:
    - name: writer
      image: docker.io/library/alpine:latest
      command: ["sh", "-c", "while true; do date >> /data/log.txt; sleep 10; done"]
      volumeMounts:
        - name: data-volume
          mountPath: /data
  volumes:
    - name: data-volume
      persistentVolumeClaim:
        claimName: data-pvc
```

```bash
# Create the pod with persistent volume
podman play kube persistent.yaml

# Verify the volume was created
podman volume ls

# Expected output:
# DRIVER      VOLUME NAME
# local       data-pvc

# Inspect the volume
podman volume inspect data-pvc

# Tear down and recreate - data persists
podman play kube --down persistent.yaml
podman play kube persistent.yaml

# Verify data survived the restart
podman exec data-pod cat /data/log.txt
```

## Comparing Podman and kubectl Workflows

```mermaid
flowchart TB
    subgraph PODMAN["Podman Workflow"]
        direction TB
        P1["Write Kubernetes YAML"]
        P2["podman play kube"]
        P3["Local Containers"]
        P4["Test & Iterate"]
        P5["podman generate kube"]

        P1 --> P2
        P2 --> P3
        P3 --> P4
        P4 -->|modify| P1
        P3 -->|export changes| P5
    end

    subgraph K8S["Kubernetes Workflow"]
        direction TB
        K1["Kubernetes YAML"]
        K2["kubectl apply"]
        K3["Cluster Pods"]
        K4["Production"]

        K1 --> K2
        K2 --> K3
        K3 --> K4
    end

    P5 -->|same manifest| K1
```

### Command Comparison Table

| Operation | Podman | kubectl |
|-----------|--------|---------|
| Apply YAML | `podman play kube file.yaml` | `kubectl apply -f file.yaml` |
| Delete resources | `podman play kube --down file.yaml` | `kubectl delete -f file.yaml` |
| Generate YAML | `podman generate kube pod-name` | `kubectl get pod -o yaml` |
| List pods | `podman pod ps` | `kubectl get pods` |
| View logs | `podman logs container-name` | `kubectl logs pod-name` |
| Exec into container | `podman exec -it container sh` | `kubectl exec -it pod -- sh` |

## Troubleshooting Common Issues

### Image Pull Errors

```bash
# Specify full image path including registry
# Podman defaults to different registries than Docker
podman play kube --help | grep -A5 "image"

# Use fully qualified image names in your YAML
# Instead of: image: nginx:alpine
# Use: image: docker.io/library/nginx:alpine

# Or configure default registries in /etc/containers/registries.conf
# unqualified-search-registries = ["docker.io", "quay.io"]
```

### Port Binding Conflicts

```bash
# Check for port conflicts before running
ss -tulpn | grep :8080

# If a port is in use, modify the hostPort in your YAML
# Or use a different port mapping
podman play kube --publish 9090:80 pod.yaml
```

### Volume Permission Issues

```bash
# SELinux may block volume access
# Add :Z or :z suffix to volume mounts
# Z = private unshared label
# z = shared label

# In YAML, use security context
securityContext:
  seLinuxOptions:
    type: container_t
```

### Debugging Failed Pods

```bash
# Check pod status
podman pod inspect failed-pod

# View container logs
podman logs failed-pod-container

# Check events for errors
podman events --filter pod=failed-pod

# Run container interactively to debug
podman run -it --rm docker.io/library/alpine:latest sh
```

## Best Practices for Production Readiness

### Always Specify Resource Limits

```yaml
# Include resource limits in all production manifests
# Prevents runaway containers from consuming all resources
spec:
  containers:
    - name: app
      resources:
        limits:
          memory: "256Mi"
          cpu: "500m"
        requests:
          memory: "128Mi"
          cpu: "250m"
```

### Use Image Digests for Reproducibility

```yaml
# Pin images to specific digests for consistent deployments
# Prevents unexpected changes from tag updates
spec:
  containers:
    - name: app
      image: docker.io/library/nginx@sha256:abc123...
```

### Implement Health Checks

```yaml
# Add liveness and readiness probes
# Podman respects these for container health status
spec:
  containers:
    - name: app
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
```

### Security Context Configuration

```yaml
# Run containers with minimal privileges
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
```

## Integration with CI/CD Pipelines

```yaml
# .github/workflows/test.yml
# GitHub Actions workflow using Podman with Kubernetes YAML
name: Test with Podman

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Podman
        run: |
          sudo apt-get update
          sudo apt-get install -y podman

      - name: Start test infrastructure
        run: |
          podman play kube kubernetes/test-stack.yaml
          sleep 10

      - name: Run integration tests
        run: |
          curl -f http://localhost:8080/health
          npm run test:integration

      - name: Cleanup
        if: always()
        run: |
          podman play kube --down kubernetes/test-stack.yaml
```

## Monitoring Containers with OneUptime

When running containerized applications in production, monitoring becomes essential. [OneUptime](https://oneuptime.com) provides comprehensive observability for your container infrastructure.

```yaml
# monitored-app.yaml
# Application pod with OpenTelemetry instrumentation
# Sends telemetry data to OneUptime
apiVersion: v1
kind: Pod
metadata:
  name: monitored-app
spec:
  containers:
    # Main application with OTEL instrumentation
    - name: app
      image: docker.io/myapp:latest
      ports:
        - containerPort: 8080
          hostPort: 8080
      env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://localhost:4317"
        - name: OTEL_SERVICE_NAME
          value: "my-application"
    # OpenTelemetry collector sidecar
    - name: otel-collector
      image: docker.io/otel/opentelemetry-collector:latest
      ports:
        - containerPort: 4317
      env:
        - name: ONEUPTIME_ENDPOINT
          value: "https://otlp.oneuptime.com"
```

## Conclusion

Podman's Kubernetes YAML support enables a seamless development-to-production workflow. You can develop and test locally using the same manifests that will run in your Kubernetes clusters. Key points to remember:

- Use `podman play kube` to run Kubernetes YAML manifests locally
- Export running containers with `podman generate kube` for production deployment
- ConfigMaps and Secrets work the same way as in Kubernetes
- Persistent volumes are automatically handled as local Podman volumes
- Resource limits and security contexts are respected

The ability to use identical configurations across development and production reduces environment drift and catches issues earlier in the development cycle. Combine Podman's Kubernetes YAML support with [OneUptime](https://oneuptime.com) monitoring to maintain visibility into your applications from development through production.

---

*Building cloud-native applications? [OneUptime](https://oneuptime.com) provides end-to-end observability for containerized workloads, from local Podman development to production Kubernetes clusters.*
