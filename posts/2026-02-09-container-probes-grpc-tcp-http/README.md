# How to Use Container Probes with gRPC, TCP, and HTTP Check Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Reliability

Description: Learn how to configure liveness, readiness, and startup probes in Kubernetes using HTTP, TCP, gRPC, and exec probe types to ensure application reliability and availability.

---

Kubernetes probes are health checks that determine if containers are ready to serve traffic, need to be restarted, or require additional startup time. The probe type (HTTP, TCP, gRPC, or exec) should match your application's architecture and communication protocol. Proper probe configuration prevents traffic from reaching unhealthy containers and ensures applications recover from failures automatically.

Understanding how to configure each probe type is fundamental to building resilient applications in Kubernetes.

## Understanding Probe Types

Kubernetes supports three probe purposes and four check types:

**Probe Purposes:**
- Liveness: Should the container be restarted?
- Readiness: Should the container receive traffic?
- Startup: Has the container finished starting up?

**Check Types:**
- HTTP GET: Make HTTP request to specified path
- TCP Socket: Open TCP connection to specified port
- gRPC: Make gRPC health check call
- Exec: Run command inside container

## HTTP Probe Configuration

HTTP probes are most common for web applications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    ports:
    - containerPort: 8080
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
        httpHeaders:
        - name: Custom-Header
          value: "health-check"
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
      successThreshold: 1

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
        scheme: HTTP  # or HTTPS
      initialDelaySeconds: 5
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
      successThreshold: 1

    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      initialDelaySeconds: 0
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 30  # 30 * 10s = 5 minutes max startup time
```

Implement health endpoints in your application:

```python
# Python Flask example
from flask import Flask, jsonify
import psutil
import time

app = Flask(__name__)
start_time = time.time()
is_ready = False

@app.route('/healthz')
def healthz():
    """Liveness probe - check if app is alive."""
    # Check critical resources
    if psutil.cpu_percent() > 95:
        return jsonify({"status": "unhealthy", "reason": "CPU overload"}), 503

    return jsonify({"status": "ok"}), 200

@app.route('/ready')
def ready():
    """Readiness probe - check if app can handle traffic."""
    global is_ready

    # Check dependencies (database, cache, etc.)
    if not is_ready:
        return jsonify({"status": "not ready"}), 503

    return jsonify({"status": "ready"}), 200

@app.route('/startup')
def startup():
    """Startup probe - check if app has finished starting."""
    global is_ready
    uptime = time.time() - start_time

    # Complete initialization
    if uptime > 30 and not is_ready:
        # Initialize connections, load data, etc.
        is_ready = True

    if is_ready:
        return jsonify({"status": "started"}), 200
    else:
        return jsonify({"status": "starting", "uptime": uptime}), 503
```

## TCP Probe Configuration

TCP probes check if a port is accepting connections:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-pod
spec:
  containers:
  - name: postgres
    image: postgres:15
    ports:
    - containerPort: 5432
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password

    livenessProbe:
      tcpSocket:
        port: 5432
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      tcpSocket:
        port: 5432
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 3

    startupProbe:
      tcpSocket:
        port: 5432
      initialDelaySeconds: 0
      periodSeconds: 5
      failureThreshold: 60  # 5 minutes max startup
```

TCP probes are simpler than HTTP but less informative. Use for databases, message queues, or services without HTTP endpoints.

## gRPC Probe Configuration

gRPC probes use the gRPC health checking protocol:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: grpc-service
spec:
  containers:
  - name: api
    image: grpc-api:1.0
    ports:
    - containerPort: 9090
      protocol: TCP

    livenessProbe:
      grpc:
        port: 9090
        service: api.v1.HealthService  # Optional service name
      initialDelaySeconds: 10
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      grpc:
        port: 9090
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 2

    startupProbe:
      grpc:
        port: 9090
      periodSeconds: 10
      failureThreshold: 30
```

Implement gRPC health service:

```go
// Go gRPC health service example
package main

import (
    "context"
    "google.golang.org/grpc"
    "google.golang.org/grpc/health/grpc_health_v1"
)

type healthServer struct {
    grpc_health_v1.UnimplementedHealthServer
}

func (s *healthServer) Check(ctx context.Context, req *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
    // Perform health checks here
    // Check database connection, cache availability, etc.

    return &grpc_health_v1.HealthCheckResponse{
        Status: grpc_health_v1.HealthCheckResponse_SERVING,
    }, nil
}

func (s *healthServer) Watch(req *grpc_health_v1.HealthCheckRequest, stream grpc_health_v1.Health_WatchServer) error {
    // Stream health status updates
    return stream.Send(&grpc_health_v1.HealthCheckResponse{
        Status: grpc_health_v1.HealthCheckResponse_SERVING,
    })
}

func main() {
    server := grpc.NewServer()
    grpc_health_v1.RegisterHealthServer(server, &healthServer{})
    // Start server...
}
```

## Exec Probe Configuration

Exec probes run commands inside the container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-health-check
spec:
  containers:
  - name: app
    image: myapp:1.0

    livenessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - |
          # Custom health check logic
          if [ -f /tmp/healthy ]; then
            exit 0
          else
            exit 1
          fi
      initialDelaySeconds: 30
      periodSeconds: 10

    readinessProbe:
      exec:
        command:
        - cat
        - /tmp/ready
      initialDelaySeconds: 5
      periodSeconds: 5

    startupProbe:
      exec:
        command:
        - /app/check-startup.sh
      periodSeconds: 10
      failureThreshold: 30
```

Complex exec probe example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: redis-pod
spec:
  containers:
  - name: redis
    image: redis:7.2
    ports:
    - containerPort: 6379

    livenessProbe:
      exec:
        command:
        - sh
        - -c
        - redis-cli ping | grep PONG
      initialDelaySeconds: 30
      periodSeconds: 10

    readinessProbe:
      exec:
        command:
        - sh
        - -c
        - |
          # Check if Redis is ready and not loading data
          redis-cli ping | grep PONG && \
          redis-cli info | grep loading:0
      initialDelaySeconds: 5
      periodSeconds: 5
```

## Combining Probe Types

Use different probe types for different purposes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-probe-app
spec:
  containers:
  - name: app
    image: complex-app:1.0
    ports:
    - containerPort: 8080
    - containerPort: 9090

    # HTTP for application-level health
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10

    # gRPC for service readiness
    readinessProbe:
      grpc:
        port: 9090
      initialDelaySeconds: 5
      periodSeconds: 5

    # Exec for complex startup checks
    startupProbe:
      exec:
        command:
        - /app/startup-check.sh
      periodSeconds: 10
      failureThreshold: 60
```

## Advanced Probe Configuration

Fine-tune probe behavior:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tuned-probes
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tuned-app
  template:
    metadata:
      labels:
        app: tuned-app
    spec:
      containers:
      - name: app
        image: myapp:1.0

        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 60      # Wait 1 minute after start
          periodSeconds: 10             # Check every 10 seconds
          timeoutSeconds: 5             # Timeout after 5 seconds
          failureThreshold: 3           # Restart after 3 failures
          successThreshold: 1           # Consider healthy after 1 success

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10       # Start checking quickly
          periodSeconds: 5              # Check frequently
          timeoutSeconds: 3             # Fast timeout
          failureThreshold: 2           # Remove from service quickly
          successThreshold: 1           # Add back after 1 success

        startupProbe:
          httpGet:
            path: /startup
            port: 8080
          initialDelaySeconds: 0        # Start immediately
          periodSeconds: 10             # Check every 10 seconds
          failureThreshold: 30          # Allow 5 minutes total
          # Disables liveness/readiness until startup succeeds
```

## Monitoring Probe Failures

Track probe failures with events:

```bash
# Watch for probe failures
kubectl get events --watch | grep -i "probe failed"

# Check specific pod probe status
kubectl describe pod <pod-name> | grep -A 10 "Liveness\|Readiness\|Startup"
```

Set up alerts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: probe-alerts
data:
  alerts.yaml: |
    groups:
    - name: probes
      rules:
      - alert: PodLivenessProbeFailures
        expr: rate(prober_probe_total{probe_type="Liveness", result="failed"}[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} liveness probe failing"

      - alert: PodReadinessProbeFailures
        expr: kube_pod_status_ready{condition="false"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} not ready for 5min"
```

## Best Practices

Use startup probes for slow-starting applications. They prevent liveness probes from killing containers during initialization.

Set appropriate timeouts. Don't make them too short or network latency will cause false failures.

Configure different thresholds for different probes. Readiness can be more sensitive than liveness.

Implement health check endpoints efficiently. Don't perform expensive operations in probe handlers.

Use HTTP probes for web services, gRPC for gRPC services, and TCP for databases or simple port checks.

Log probe failures in your application. This helps debug intermittent health issues.

Test probe behavior under load. Ensure health checks remain reliable when the application is busy.

Don't check external dependencies in liveness probes. If an external service is down, you don't want to restart your container.

Proper probe configuration ensures Kubernetes can detect and respond to application failures automatically, maintaining high availability and preventing traffic from reaching unhealthy instances.
