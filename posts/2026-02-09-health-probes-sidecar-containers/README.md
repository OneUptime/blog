# How to Configure Health Probes for Sidecar Containers in Multi-Container Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Probes, Sidecar Containers, Multi-Container Pods, Service Mesh

Description: Learn how to properly configure health probes for sidecar containers in multi-container pods, ensuring coordinated startup and graceful shutdown across all containers in your Kubernetes workloads.

---

Multi-container pods are a powerful pattern in Kubernetes, allowing you to co-locate tightly coupled processes. When you add sidecar containers for logging, proxying, or monitoring, health probe configuration becomes more complex. Each container needs its own health checks, and they need to coordinate properly.

Improperly configured health probes in multi-container pods can lead to race conditions during startup, premature container restarts, or traffic being routed before sidecars are ready. This guide shows you how to avoid these pitfalls.

## Understanding Multi-Container Health Dynamics

In a multi-container pod, Kubernetes checks each container independently. The pod is only marked ready when all containers pass their readiness probes. This creates coordination challenges when containers depend on each other.

Consider a web application with an Envoy proxy sidecar. The application container shouldn't receive traffic until both the application and Envoy are ready. If the application becomes ready first but Envoy is still initializing, incoming requests will fail.

Similarly, during shutdown, you want to drain the proxy before stopping the application. Health probes help orchestrate this sequence.

## Basic Multi-Container Pod with Health Probes

Let's start with a simple example showing an application with a logging sidecar:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app-with-sidecar
  labels:
    app: web-app
spec:
  containers:
  # Main application container
  - name: app
    image: myapp:1.0
    ports:
    - containerPort: 8080
      name: http
    livenessProbe:
      httpGet:
        path: /healthz/live
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /healthz/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 2

  # Logging sidecar container
  - name: log-shipper
    image: fluentd:latest
    ports:
    - containerPort: 24224
      name: fluentd
    livenessProbe:
      tcpSocket:
        port: 24224
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:
      tcpSocket:
        port: 24224
      initialDelaySeconds: 5
      periodSeconds: 5
    volumeMounts:
    - name: logs
      mountPath: /var/log/app

  volumes:
  - name: logs
    emptyDir: {}
```

Both containers have their own probes. The pod won't be marked ready until both pass their readiness checks.

## Service Mesh Sidecar Health Configuration

Service mesh sidecars require careful probe configuration. Here's an example with Istio's Envoy sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-service
  template:
    metadata:
      labels:
        app: web-service
      annotations:
        # Enable Istio sidecar injection
        sidecar.istio.io/inject: "true"
        # Configure probe rewrite
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
      - name: app
        image: web-service:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics

        # Application health probes
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        # Startup probe for slow initialization
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # 30 * 5s = 150s max startup time

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      # Istio proxy sidecar (auto-injected, but shown for clarity)
      # Has its own built-in health checks
```

The annotation `sidecar.istio.io/rewriteAppHTTPProbers: "true"` tells Istio to intercept health probes and ensure they work correctly through the proxy.

## Implementing Coordinated Health Checks

For complex sidecar coordination, implement health checks that verify both containers are working together:

```python
# health_coordinator.py
from flask import Flask, jsonify
import requests
import socket
import time
from typing import Dict, Any, Tuple

app = Flask(__name__)

class HealthCoordinator:
    def __init__(self):
        self.sidecar_port = 24224
        self.sidecar_host = "localhost"
        self.startup_complete = False
        self.dependencies_ready = False

    def check_sidecar_health(self) -> Tuple[bool, str]:
        """Check if sidecar is healthy"""
        try:
            # Try TCP connection to sidecar
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((self.sidecar_host, self.sidecar_port))
            sock.close()

            if result == 0:
                return True, "Sidecar is reachable"
            else:
                return False, f"Sidecar connection failed: {result}"
        except Exception as e:
            return False, f"Sidecar check error: {str(e)}"

    def check_sidecar_ready(self) -> Tuple[bool, str]:
        """Check if sidecar is ready to accept logs"""
        try:
            # Some sidecars expose health endpoints
            response = requests.get(
                f"http://{self.sidecar_host}:{self.sidecar_port}/health",
                timeout=2
            )
            if response.status_code == 200:
                return True, "Sidecar is ready"
            else:
                return False, f"Sidecar not ready: {response.status_code}"
        except requests.exceptions.ConnectionError:
            # If no health endpoint, use TCP check
            return self.check_sidecar_health()
        except Exception as e:
            return False, f"Sidecar readiness check failed: {str(e)}"

    def liveness_check(self) -> Dict[str, Any]:
        """
        Liveness check for main application
        Only checks critical application state
        """
        # Basic application health
        memory_ok = self.check_memory()
        process_ok = True  # Check critical process state

        healthy = memory_ok and process_ok

        return {
            "status": "healthy" if healthy else "unhealthy",
            "checks": {
                "memory": memory_ok,
                "process": process_ok
            }
        }

    def readiness_check(self) -> Dict[str, Any]:
        """
        Readiness check that includes sidecar coordination
        Application should not receive traffic until sidecar is ready
        """
        # Check application readiness
        app_ready = self.startup_complete and self.dependencies_ready

        # Check sidecar readiness
        sidecar_ready, sidecar_msg = self.check_sidecar_ready()

        # Both must be ready
        ready = app_ready and sidecar_ready

        return {
            "status": "ready" if ready else "not_ready",
            "checks": {
                "application": app_ready,
                "sidecar": {
                    "ready": sidecar_ready,
                    "message": sidecar_msg
                }
            }
        }

    def startup_check(self) -> Dict[str, Any]:
        """
        Startup probe to handle slow initialization
        """
        if self.startup_complete:
            return {"status": "started"}

        # Simulate startup tasks
        # In real implementation, check if all initialization is done
        self.dependencies_ready = True
        self.startup_complete = True

        return {"status": "started"}

    def check_memory(self) -> bool:
        """Check if memory usage is acceptable"""
        import psutil
        memory = psutil.virtual_memory()
        return memory.percent < 90

coordinator = HealthCoordinator()

@app.route('/health/live', methods=['GET'])
def liveness():
    """Liveness endpoint"""
    status = coordinator.liveness_check()
    code = 200 if status["status"] == "healthy" else 503
    return jsonify(status), code

@app.route('/health/ready', methods=['GET'])
def readiness():
    """Readiness endpoint with sidecar coordination"""
    status = coordinator.readiness_check()
    code = 200 if status["status"] == "ready" else 503
    return jsonify(status), code

@app.route('/health/startup', methods=['GET'])
def startup():
    """Startup endpoint"""
    status = coordinator.startup_check()
    code = 200 if status["status"] == "started" else 503
    return jsonify(status), code

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Advanced Sidecar Pattern with Init Container

For sidecars that must be fully initialized before the main app starts, use init containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init-and-sidecar
spec:
  # Init container waits for sidecar prerequisites
  initContainers:
  - name: wait-for-config
    image: busybox:1.36
    command:
    - sh
    - -c
    - |
      echo "Waiting for configuration to be ready..."
      until [ -f /config/ready ]; do
        sleep 2
      done
      echo "Configuration ready"
    volumeMounts:
    - name: config
      mountPath: /config

  containers:
  # Sidecar that prepares configuration
  - name: config-sync
    image: config-syncer:latest
    command:
    - sh
    - -c
    - |
      # Fetch config from external source
      /sync-config.sh
      # Signal that config is ready
      touch /config/ready
      # Keep running and periodically sync
      while true; do
        sleep 300
        /sync-config.sh
      done
    livenessProbe:
      exec:
        command:
        - pgrep
        - -f
        - sync-config
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:
      exec:
        command:
        - test
        - -f
        - /config/ready
      initialDelaySeconds: 5
      periodSeconds: 5
    volumeMounts:
    - name: config
      mountPath: /config

  # Main application
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    volumeMounts:
    - name: config
      mountPath: /config
      readOnly: true

  volumes:
  - name: config
    emptyDir: {}
```

## Native Sidecar Containers (Kubernetes 1.29+)

Kubernetes 1.29 introduced native sidecar support with the `restartPolicy` field:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-native-sidecar
spec:
  initContainers:
  # Native sidecar - starts before main container and stays running
  - name: istio-proxy
    image: istio/proxyv2:1.20
    restartPolicy: Always  # This makes it a native sidecar
    ports:
    - containerPort: 15001
      name: envoy-admin
    livenessProbe:
      httpGet:
        path: /healthz/ready
        port: 15021
      initialDelaySeconds: 10
      periodSeconds: 5
    readinessProbe:
      httpGet:
        path: /healthz/ready
        port: 15021
      initialDelaySeconds: 1
      periodSeconds: 2

  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 20
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

Native sidecars start before main containers and can have their own health probes that Kubernetes respects.

## Monitoring Multi-Container Pod Health

Create alerts for multi-container pod health issues:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: multi-container-health
  namespace: monitoring
spec:
  groups:
  - name: sidecar-health
    interval: 30s
    rules:
    - alert: SidecarContainerNotReady
      expr: |
        kube_pod_container_status_ready{container=~".*-sidecar|istio-proxy|envoy"} == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar container not ready"
        description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} has sidecar {{ $labels.container }} not ready for 5 minutes"

    - alert: MainContainerReadyButSidecarNot
      expr: |
        (kube_pod_container_status_ready{container!~".*-sidecar|istio-proxy|envoy"} == 1)
        and on(pod, namespace)
        (kube_pod_container_status_ready{container=~".*-sidecar|istio-proxy|envoy"} == 0)
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Container ready but sidecar not ready"
        description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} main container ready but sidecar not ready"

    - alert: PodRestartingFrequently
      expr: |
        rate(kube_pod_container_status_restarts_total[15m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Container restarting frequently"
        description: "Container {{ $labels.container }} in pod {{ $labels.namespace }}/{{ $labels.pod }} restarting frequently"
```

## Best Practices for Sidecar Health Probes

Set appropriate initial delay seconds for each container. Sidecars often need less time to start than main applications. Use startup probes for slow-starting main containers.

Configure independent health checks for each container. Don't try to check sidecar health from the main container's probe endpoint unless you have a specific coordination requirement.

Use TCP probes for sidecars that don't expose HTTP endpoints. Many logging and monitoring sidecars only listen on TCP ports.

Consider using native sidecars (Kubernetes 1.29+) for better lifecycle management. They start before main containers and are shut down after them.

Monitor the health of both containers independently. Track restart counts, probe failures, and readiness status for each container separately.

Test failure scenarios thoroughly. Verify that sidecar failures don't cascade to the main container unnecessarily, and that main container failures are handled appropriately.

Properly configured health probes for multi-container pods ensure that your applications and their sidecars work together seamlessly, providing reliable service delivery and graceful handling of failures.
