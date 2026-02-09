# How to Configure Liveness Probes to Restart Unhealthy Containers Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Liveness Probes

Description: Configure Kubernetes liveness probes to automatically detect and restart unhealthy containers, recovering from deadlocks, memory leaks, and application crashes without manual intervention.

---

Liveness probes tell Kubernetes whether your application is running properly. When a liveness probe fails, Kubernetes automatically restarts the container, helping your applications recover from errors that leave them in a broken state but still technically running.

This guide shows you how to configure liveness probes effectively to catch real problems while avoiding false positives that cause unnecessary restarts.

## Understanding Liveness Probes

A liveness probe answers one question: "Is this container alive?" If the probe fails repeatedly, Kubernetes kills the container and starts a new one according to the pod's restart policy.

Liveness probes are different from readiness probes. Liveness checks if the container should be restarted, while readiness checks if the container should receive traffic. A container can be alive but not ready, but if it's not alive, Kubernetes restarts it.

## Basic Liveness Probe Configuration

Configure a simple HTTP liveness probe:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
        httpHeaders:
        - name: X-Health-Check
          value: liveness
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
      successThreshold: 1
```

This configuration checks the `/healthz` endpoint every 10 seconds. After 3 consecutive failures, Kubernetes restarts the container.

## Implementing a Health Check Endpoint

Create a liveness endpoint in your application:

```go
// Go example
package main

import (
    "net/http"
    "sync/atomic"
)

var healthy int32 = 1

func main() {
    http.HandleFunc("/healthz", livenessHandler)
    http.HandleFunc("/ready", readinessHandler)
    http.ListenAndServe(":8080", nil)
}

func livenessHandler(w http.ResponseWriter, r *http.Request) {
    if atomic.LoadInt32(&healthy) == 1 {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
        return
    }
    w.WriteHeader(http.StatusServiceUnavailable)
    w.Write([]byte("Unhealthy"))
}

// Application can set itself as unhealthy when it detects problems
func setUnhealthy() {
    atomic.StoreInt32(&healthy, 0)
}
```

Here's a Node.js version:

```javascript
// Node.js example
const express = require('express');
const app = express();

let isHealthy = true;

app.get('/healthz', (req, res) => {
  if (isHealthy) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Unhealthy');
  }
});

// Your application can set isHealthy to false when problems detected
function detectProblems() {
  // Check for resource exhaustion, deadlocks, etc.
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > memUsage.heapTotal * 0.95) {
    console.log('Memory exhausted, marking unhealthy');
    isHealthy = false;
  }
}

setInterval(detectProblems, 5000);

app.listen(8080);
```

## What Liveness Probes Should Check

Good liveness checks verify critical functionality:

```python
# Python Flask example
from flask import Flask, jsonify
import threading
import time

app = Flask(__name__)
last_heartbeat = time.time()
lock = threading.Lock()

@app.route('/healthz')
def liveness():
    """Check if core processing loop is alive"""
    with lock:
        # If heartbeat hasn't updated in 60 seconds, we're probably deadlocked
        if time.time() - last_heartbeat > 60:
            return jsonify({"status": "unhealthy", "reason": "processing_stalled"}), 503

        return jsonify({"status": "healthy"}), 200

def processing_loop():
    """Main application loop that should update heartbeat"""
    global last_heartbeat
    while True:
        try:
            # Do work here
            process_data()

            # Update heartbeat
            with lock:
                last_heartbeat = time.time()

            time.sleep(1)
        except Exception as e:
            # Log error but keep trying
            print(f"Error in processing loop: {e}")

# Start background processing
threading.Thread(target=processing_loop, daemon=True).start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

This pattern detects when the main processing loop has stalled.

## TCP Socket Liveness Probe

For applications without HTTP endpoints, use TCP probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 15
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

TCP probes verify that the port accepts connections without checking application logic.

## Exec Command Liveness Probe

Use exec probes for custom health check logic:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: secret
    livenessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - pg_isready -U postgres
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

The command must exit with status code 0 for success, non-zero for failure.

## Detecting Memory Leaks with Liveness Probes

Configure liveness probes to restart containers before memory exhaustion:

```go
// Go health check that monitors memory usage
package main

import (
    "net/http"
    "runtime"
)

func livenessHandler(w http.ResponseWriter, r *http.Request) {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    // Restart if memory usage exceeds 1GB
    if m.Alloc > 1024*1024*1024 {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Memory limit exceeded"))
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

Set resource limits to ensure the probe fails before the OOM killer runs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: my-app:latest
    resources:
      limits:
        memory: 1.5Gi
      requests:
        memory: 512Mi
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
```

## Configuring Probe Timing Parameters

Balance responsiveness with stability:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080

  # Wait 60 seconds before first check (application startup time)
  initialDelaySeconds: 60

  # Check every 15 seconds
  periodSeconds: 15

  # Each check can take up to 5 seconds
  timeoutSeconds: 5

  # Must fail 3 times in a row before restart
  failureThreshold: 3

  # Must succeed 1 time to be considered healthy again
  successThreshold: 1
```

Time until restart after first failure:
```
periodSeconds * failureThreshold = 15 * 3 = 45 seconds
```

## Avoiding False Positives

Don't restart for temporary issues:

```yaml
# BAD: Too aggressive
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5  # Too short
  periodSeconds: 3        # Too frequent
  failureThreshold: 1     # Restart on first failure

# GOOD: Tolerates transient issues
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30  # Allow startup time
  periodSeconds: 10        # Reasonable interval
  failureThreshold: 3      # Multiple failures required
  timeoutSeconds: 5        # Generous timeout
```

## What Not to Check in Liveness Probes

Liveness probes should NOT check:

```python
# DON'T do this in liveness probes
@app.route('/healthz')
def bad_liveness():
    # Don't check external dependencies
    if not check_database_connection():
        return "unhealthy", 503  # BAD

    # Don't check downstream services
    if not call_external_api():
        return "unhealthy", 503  # BAD

    # Don't perform expensive operations
    if not run_complex_validation():
        return "unhealthy", 503  # BAD

    return "ok", 200

# DO this instead
@app.route('/healthz')
def good_liveness():
    # Only check if the application itself is alive
    # Can it process requests?
    # Is the main thread running?
    # Are critical goroutines/threads alive?

    if is_main_loop_alive() and not is_deadlocked():
        return "ok", 200
    return "unhealthy", 503
```

Check external dependencies in readiness probes, not liveness probes.

## Monitoring Liveness Probe Failures

Create alerts for excessive restarts:

```yaml
# prometheus-rules.yml
groups:
  - name: liveness
    rules:
      - alert: HighPodRestartRate
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} restarting frequently"
          description: "Container {{ $labels.container }} has restarted {{ $value }} times in 15 minutes"

      - alert: CrashLoopBackOff
        expr: kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} in CrashLoopBackOff"
          description: "Container {{ $labels.container }} is crash looping"
```

## Debugging Liveness Probe Failures

Check why containers are restarting:

```bash
# View pod events
kubectl describe pod my-app

# Check restart count
kubectl get pod my-app -o jsonpath='{.status.containerStatuses[0].restartCount}'

# View logs from previous container instance
kubectl logs my-app --previous

# Watch liveness probe in real-time
kubectl get pod my-app -w

# Check probe configuration
kubectl get pod my-app -o yaml | grep -A 10 livenessProbe
```

## Liveness Probes with Startup Probes

Use startup probes for slow-starting applications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: slow-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080

    # Startup probe: allows up to 5 minutes for startup
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 0
      periodSeconds: 10
      failureThreshold: 30  # 30 * 10s = 5 minutes

    # Liveness probe: takes over after startup succeeds
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10
      failureThreshold: 3
```

Startup probes disable liveness and readiness probes until the startup probe succeeds.

## Real-World Example: Java Application

Configure liveness probes for JVM applications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spring-boot-app
  template:
    metadata:
      labels:
        app: spring-boot-app
    spec:
      containers:
      - name: app
        image: my-spring-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: JAVA_OPTS
          value: "-Xmx1g -Xms512m"
        resources:
          limits:
            memory: 1.5Gi
            cpu: 1000m
          requests:
            memory: 512Mi
            cpu: 500m

        # Long startup time for JVM
        startupProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 24  # 2 minutes

        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
```

Spring Boot Actuator provides built-in health endpoints.

## Conclusion

Liveness probes are your first line of defense against application failures that leave containers in a broken state. By configuring them to detect genuine problems like deadlocks and resource exhaustion while avoiding false positives, you enable Kubernetes to automatically recover your applications without manual intervention.

Keep liveness checks simple and fast, check only the container's internal state, and combine them with startup probes for applications with long initialization times. Monitor restart patterns to identify recurring issues that need fixing at the application level.
