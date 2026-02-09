# How to Use Startup Probes for Slow-Starting Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Startup Probes

Description: Configure Kubernetes startup probes to protect slow-starting applications from premature restarts while allowing aggressive liveness checking after initialization completes successfully.

---

Startup probes solve a specific problem: applications that take a long time to start up. Without startup probes, you face a difficult choice between setting a very long `initialDelaySeconds` on liveness probes or risking that Kubernetes kills your container before it finishes starting.

Startup probes give you the best of both worlds. During startup, they disable liveness and readiness probes, allowing long initialization times. Once the startup probe succeeds, normal liveness and readiness checking begins.

## Understanding Startup Probes

A startup probe answers the question: "Has this container finished starting up?" While the startup probe runs, Kubernetes disables liveness and readiness probes. Once the startup probe succeeds, it stops running and enables the other probe types.

If the startup probe fails for too long, Kubernetes restarts the container, just like a failed liveness probe. The key difference is timing: startup probes can allow much longer initialization periods.

## Basic Startup Probe Configuration

Configure a startup probe for a slow-starting application:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: java-app
spec:
  containers:
  - name: app
    image: my-java-app:latest
    ports:
    - containerPort: 8080

    # Startup probe: allows up to 10 minutes for initialization
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 10
      failureThreshold: 60  # 60 * 10s = 10 minutes

    # Liveness probe: only starts after startup succeeds
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10
      failureThreshold: 3

    # Readiness probe: also starts after startup succeeds
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
      failureThreshold: 2
```

This gives the application 10 minutes to start, but once running, liveness checks happen every 10 seconds.

## Implementing Startup Detection Endpoints

Create endpoints that track initialization progress:

```go
// Go example with startup tracking
package main

import (
    "net/http"
    "sync/atomic"
    "time"
)

var (
    started int32 = 0
    healthy int32 = 1
    ready   int32 = 0
)

func main() {
    http.HandleFunc("/healthz", healthHandler)
    http.HandleFunc("/ready", readyHandler)

    // Start initialization in background
    go initialize()

    http.ListenAndServe(":8080", nil)
}

func initialize() {
    // Simulate long initialization
    time.Sleep(2 * time.Second)
    loadConfiguration()

    time.Sleep(3 * time.Second)
    connectToDatabase()

    time.Sleep(5 * time.Second)
    warmUpCaches()

    time.Sleep(10 * time.Second)
    preloadData()

    // Mark as started and ready
    atomic.StoreInt32(&started, 1)
    atomic.StoreInt32(&ready, 1)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    // During startup, return success if we're making progress
    if atomic.LoadInt32(&started) == 0 {
        // Check if server is responding (proves we're alive)
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Starting up"))
        return
    }

    // After startup, check actual health
    if atomic.LoadInt32(&healthy) == 1 {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Healthy"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Unhealthy"))
    }
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
    if atomic.LoadInt32(&ready) == 1 {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Ready"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Not ready"))
    }
}
```

## Startup Probes for JVM Applications

Java applications often have long startup times due to JIT compilation and class loading:

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
        image: my-spring-boot-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: JAVA_OPTS
          value: "-Xms512m -Xmx2g -XX:+UseG1GC"
        resources:
          requests:
            memory: 1Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 2000m

        startupProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 20
          periodSeconds: 10
          failureThreshold: 30  # 5 minutes total

        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

Spring Boot Actuator provides built-in health endpoints that work perfectly with Kubernetes probes.

## Startup Probes for Database-Heavy Applications

Applications that load large datasets at startup benefit from startup probes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: analytics-app
spec:
  containers:
  - name: app
    image: analytics-app:latest
    env:
    - name: PRELOAD_DATA
      value: "true"
    ports:
    - containerPort: 8080

    # Allow 15 minutes for data preloading
    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 15
      failureThreshold: 60  # 15 minutes

    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 30
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 10
      failureThreshold: 2
```

Implement the startup endpoint to track progress:

```python
# Python Flask example
from flask import Flask, jsonify
import threading
import time

app = Flask(__name__)
startup_complete = False
startup_progress = 0

def preload_data():
    global startup_complete, startup_progress

    # Step 1: Load reference data
    startup_progress = 25
    load_reference_data()

    # Step 2: Build indexes
    startup_progress = 50
    build_indexes()

    # Step 3: Warm up caches
    startup_progress = 75
    warmup_caches()

    # Step 4: Initialize ML models
    startup_progress = 90
    initialize_models()

    startup_progress = 100
    startup_complete = True

@app.route('/startup')
def startup_check():
    if startup_complete:
        return jsonify({
            "status": "complete",
            "progress": 100
        }), 200
    else:
        return jsonify({
            "status": "in_progress",
            "progress": startup_progress
        }), 200  # Return 200 while making progress

@app.route('/healthz')
def liveness():
    # Only used after startup complete
    if check_application_health():
        return "OK", 200
    return "Unhealthy", 503

@app.route('/ready')
def readiness():
    if startup_complete and check_dependencies():
        return "Ready", 200
    return "Not ready", 503

if __name__ == '__main__':
    # Start preloading in background
    threading.Thread(target=preload_data, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)
```

## Startup Probes with Progress Tracking

Report detailed startup progress for debugging:

```javascript
// Node.js example with progress tracking
const express = require('express');
const app = express();

let startupPhase = 'initializing';
let startupComplete = false;
let startupError = null;

async function initializeApplication() {
  try {
    startupPhase = 'connecting_to_database';
    await connectToDatabase();

    startupPhase = 'loading_configuration';
    await loadConfiguration();

    startupPhase = 'initializing_cache';
    await initializeCache();

    startupPhase = 'warming_up';
    await warmUp();

    startupPhase = 'complete';
    startupComplete = true;
  } catch (error) {
    startupError = error;
    startupPhase = 'failed';
  }
}

app.get('/startup', (req, res) => {
  if (startupComplete) {
    res.status(200).json({
      status: 'complete',
      phase: startupPhase
    });
  } else if (startupError) {
    res.status(500).json({
      status: 'failed',
      phase: startupPhase,
      error: startupError.message
    });
  } else {
    res.status(200).json({
      status: 'in_progress',
      phase: startupPhase
    });
  }
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/ready', (req, res) => {
  if (startupComplete) {
    res.status(200).send('Ready');
  } else {
    res.status(503).send('Not ready');
  }
});

initializeApplication();
app.listen(8080);
```

## Calculating Appropriate Startup Probe Settings

Determine the right values for your application:

```bash
# Measure your application's startup time
time docker run --rm my-app:latest

# Add buffer for variability (e.g., 2x the average)
# If startup takes 3 minutes on average:
# - Target: 6 minutes total (3 min * 2)
# - periodSeconds: 10
# - failureThreshold: 36 (6 min / 10 sec)
```

Configure accordingly:

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 10  # Time before first check
  periodSeconds: 10         # How often to check
  failureThreshold: 36      # Maximum checks before restart
  # Total allowed startup time: 10 + (10 * 36) = 370 seconds
```

## Startup Probes for Migration Scripts

Run database migrations before accepting traffic:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-server
spec:
  initContainers:
  - name: migrations
    image: api-server:latest
    command: ['./run-migrations.sh']
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: url

  containers:
  - name: api
    image: api-server:latest
    ports:
    - containerPort: 8080

    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 20  # 100 seconds

    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
      failureThreshold: 2
```

Migrations run in init containers before the main container starts.

## Handling Startup Failures

Detect when startup is taking too long:

```python
import time
import sys

MAX_STARTUP_TIME = 600  # 10 minutes
startup_start = time.time()

def check_startup_timeout():
    elapsed = time.time() - startup_start
    if elapsed > MAX_STARTUP_TIME:
        print(f"Startup timeout after {elapsed} seconds")
        sys.exit(1)  # Exit with error code

@app.route('/startup')
def startup_check():
    check_startup_timeout()

    if startup_complete:
        return "Complete", 200
    else:
        return jsonify({
            "status": "in_progress",
            "elapsed_seconds": int(time.time() - startup_start)
        }), 200
```

## Monitoring Startup Duration

Track how long pods take to start:

```promql
# Average startup duration
avg(kube_pod_start_time - kube_pod_created)

# Pods still in startup phase
count(kube_pod_status_phase{phase="Pending"})

# Startup probe failures
rate(prober_probe_total{probe_type="Startup",result="failed"}[5m])
```

Create alerts for startup issues:

```yaml
groups:
  - name: startup
    rules:
      - alert: PodStartupTooSlow
        expr: time() - kube_pod_start_time > 600
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} taking too long to start"

      - alert: StartupProbeFailure
        expr: kube_pod_status_container_ready_time == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} failing startup probe"
```

## TCP and Exec Startup Probes

Use non-HTTP startup probes when appropriate:

```yaml
# TCP startup probe
startupProbe:
  tcpSocket:
    port: 3306
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 60

# Exec startup probe
startupProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - test -f /tmp/startup-complete
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 120
```

Your application creates `/tmp/startup-complete` when initialization finishes.

## Best Practices for Startup Probes

Follow these guidelines:

**DO use startup probes for slow-starting apps:**
```yaml
# Apps that take > 30 seconds to start
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  failureThreshold: 30
```

**DO keep liveness probes aggressive:**
```yaml
# After startup, check frequently
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
```

**DON'T set unreasonably long startup times:**
```yaml
# BAD: 1 hour startup time indicates a problem
startupProbe:
  periodSeconds: 30
  failureThreshold: 120  # 1 hour

# GOOD: Reasonable startup time
startupProbe:
  periodSeconds: 10
  failureThreshold: 60  # 10 minutes
```

**DO optimize your application startup:**
```python
# Defer non-critical initialization
def initialize():
    # Critical: connect to database
    connect_database()

    # Critical: load configuration
    load_config()

    # Defer: warm up caches in background
    threading.Thread(target=warmup_caches).start()
```

## Debugging Startup Issues

Troubleshoot slow or failing startups:

```bash
# Check pod events
kubectl describe pod my-app-abc123

# View startup progress logs
kubectl logs my-app-abc123 -f

# Check startup probe configuration
kubectl get pod my-app-abc123 -o jsonpath='{.spec.containers[0].startupProbe}'

# Manually test startup endpoint
kubectl port-forward my-app-abc123 8080:8080
curl http://localhost:8080/startup

# Check resource constraints
kubectl top pod my-app-abc123
```

## Conclusion

Startup probes protect slow-starting applications from premature restarts while allowing aggressive liveness checking after initialization completes. They're essential for JVM applications, containers that preload data, or any workload with long initialization times.

Configure startup probes with realistic failure thresholds based on measured startup times, keep your startup endpoints lightweight, and combine them with appropriate liveness and readiness probes for comprehensive health checking. Always optimize your application's startup process to reduce initialization time when possible.
