# How to Configure Startup Probes for Slow-Starting Applications in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Containers, Monitoring

Description: Learn how to configure Kubernetes startup probes to handle slow-starting applications, prevent premature container restarts, and optimize application initialization without sacrificing health monitoring.

---

Some applications take a long time to start. Legacy applications, JVM-based services, and applications that load large datasets might need several minutes to become ready. Standard liveness and readiness probes can mistakenly kill these containers before they finish initializing. Startup probes solve this problem.

Startup probes give slow-starting applications the time they need without disabling health monitoring entirely. Once the startup probe succeeds, normal liveness and readiness probes take over. This combination provides both patience during startup and quick failure detection during normal operation.

## The Problem with Slow-Starting Applications

Consider a Java application that takes 3 minutes to initialize. If you configure a liveness probe with a 30-second timeout and a 3-second interval, Kubernetes might kill the container before it finishes starting.

Without a startup probe, you have two bad options. You can set very long timeouts on the liveness probe, but this means waiting minutes to detect failures during normal operation. Or you can delay the initial probe for several minutes, but this risks missing early failures.

Startup probes give you the best of both worlds. During startup, Kubernetes patiently waits. After startup succeeds, fast liveness probes detect failures quickly.

## Understanding Startup Probe Behavior

Startup probes disable liveness and readiness probes until the startup probe succeeds. This prevents premature container kills during initialization.

The startup probe runs at a configured interval until it succeeds or reaches the failure threshold. If it fails too many times, Kubernetes kills the container and restarts it according to the restart policy.

Once the startup probe succeeds, it never runs again for that container. Liveness and readiness probes activate and monitor the container for the rest of its lifetime.

This sequence ensures applications get adequate initialization time while maintaining responsive health monitoring after startup.

## Basic Startup Probe Configuration

Here is a basic startup probe for an HTTP-based application:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: slow-start-app
spec:
  containers:
  - name: app
    image: java-app:latest
    ports:
    - containerPort: 8080
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      initialDelaySeconds: 0
      periodSeconds: 10
      failureThreshold: 30
```

This configuration allows up to 5 minutes for startup (30 failures * 10 seconds). The probe checks every 10 seconds. If the application responds successfully before 30 failures, startup is considered complete.

Using an exec command for startup probes:

```yaml
startupProbe:
  exec:
    command:
    - cat
    - /tmp/ready
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 60
```

This allows 5 minutes (60 * 5 seconds) for the application to create the `/tmp/ready` file.

Using a TCP socket check:

```yaml
startupProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30
```

This checks if the application is listening on port 8080.

## Calculating Probe Timing

Getting the timing right is critical. Calculate the maximum startup time you need, then configure the probe to allow slightly more.

If your application takes up to 2 minutes to start:

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 10
  failureThreshold: 18  # 3 minutes total (18 * 10s = 180s)
```

This gives a 1-minute buffer beyond the expected 2-minute startup time.

For applications with variable startup times, add more buffer:

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 60  # 5 minutes total
```

Balance patience with failure detection. Longer startup allowances mean slower detection of genuinely broken containers.

## Combining Startup, Liveness, and Readiness Probes

Use all three probe types together for comprehensive health monitoring:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: comprehensive-probes
spec:
  containers:
  - name: app
    image: slow-app:latest
    ports:
    - containerPort: 8080
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      periodSeconds: 10
      failureThreshold: 30
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      periodSeconds: 5
      failureThreshold: 2
```

This configuration:
- Allows 5 minutes for startup
- Kills the container if liveness fails for 30 seconds after startup
- Removes the pod from service if readiness fails for 10 seconds
- Checks readiness more frequently for faster traffic routing decisions

## Implementing Startup Endpoints

Your application should provide a startup endpoint that indicates when initialization is complete. This endpoint should return success only after all startup tasks finish.

Here is a Node.js example:

```javascript
const express = require('express');
const app = express();

let startupComplete = false;

// Simulate slow startup
async function initializeApplication() {
  console.log('Starting initialization...');

  // Load configuration
  await loadConfig();

  // Connect to database
  await connectDatabase();

  // Warm up caches
  await warmCaches();

  // Load ML model (slow operation)
  await loadModel();

  startupComplete = true;
  console.log('Initialization complete');
}

// Startup probe endpoint
app.get('/health/startup', (req, res) => {
  if (startupComplete) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Still starting');
  }
});

// Liveness probe endpoint
app.get('/health/live', (req, res) => {
  // Check if the application is alive
  res.status(200).send('Alive');
});

// Readiness probe endpoint
app.get('/health/ready', (req, res) => {
  // Check if ready to serve traffic
  if (startupComplete && isDatabaseConnected()) {
    res.status(200).send('Ready');
  } else {
    res.status(503).send('Not ready');
  }
});

// Start initialization in the background
initializeApplication();

app.listen(8080, () => {
  console.log('Server listening on port 8080');
});
```

The startup endpoint returns 503 until initialization completes, then returns 200.

Python example:

```python
from flask import Flask
import threading
import time

app = Flask(__name__)
startup_complete = False

def initialize_application():
    global startup_complete
    print("Starting initialization...")

    # Simulate slow startup tasks
    time.sleep(120)  # 2 minutes

    startup_complete = True
    print("Initialization complete")

@app.route('/health/startup')
def startup_check():
    if startup_complete:
        return 'OK', 200
    else:
        return 'Still starting', 503

@app.route('/health/live')
def liveness_check():
    return 'Alive', 200

@app.route('/health/ready')
def readiness_check():
    if startup_complete:
        return 'Ready', 200
    else:
        return 'Not ready', 503

if __name__ == '__main__':
    # Start initialization in background thread
    init_thread = threading.Thread(target=initialize_application)
    init_thread.start()

    # Start server immediately
    app.run(host='0.0.0.0', port=8080)
```

## Real-World Example: JVM Application

JVM applications are notorious for slow startup times. Here is a complete configuration for a Java Spring Boot application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spring-boot
  template:
    metadata:
      labels:
        app: spring-boot
    spec:
      containers:
      - name: app
        image: spring-boot-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: JAVA_OPTS
          value: "-Xms512m -Xmx2048m"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        startupProbe:
          httpGet:
            path: /actuator/health/startup
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 36  # 6 minutes total
          successThreshold: 1
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 2
          successThreshold: 1
```

Spring Boot Actuator provides built-in health endpoints for startup, liveness, and readiness. Enable them in `application.properties`:

```properties
management.endpoint.health.probes.enabled=true
management.health.livenessState.enabled=true
management.health.readinessState.enabled=true
```

## Troubleshooting Startup Probe Failures

When startup probes fail repeatedly, diagnose the issue systematically.

Check pod events:

```bash
kubectl describe pod my-pod
```

Look for events like:

```
Warning  Unhealthy  Container startup probe failed: HTTP probe failed with statuscode: 503
```

View application logs:

```bash
kubectl logs my-pod
```

Check if the application is still initializing or encountered an error.

Increase the failure threshold temporarily to see if the application eventually succeeds:

```yaml
startupProbe:
  failureThreshold: 100  # Temporarily very high
```

If the application succeeds with more time, you need a higher threshold permanently.

Execute the probe command manually to verify it works:

```bash
kubectl exec my-pod -- wget -q -O - http://localhost:8080/health/startup
```

Check the response code and body.

Monitor resource usage to see if the container is running out of memory or CPU:

```bash
kubectl top pod my-pod
```

Slow startup might indicate resource constraints.

## Optimizing Application Startup Time

While startup probes handle slow applications, you should still optimize startup time when possible.

Lazy-load non-critical components:

```python
# Instead of loading everything at startup
models = load_all_models()  # Slow

# Load models on-demand
models = {}
def get_model(name):
    if name not in models:
        models[name] = load_model(name)
    return models[name]
```

Parallelize initialization tasks:

```javascript
// Sequential (slow)
await loadConfig();
await connectDatabase();
await warmCache();

// Parallel (faster)
await Promise.all([
  loadConfig(),
  connectDatabase(),
  warmCache()
]);
```

Use lazy database connections:

```python
# Don't connect at startup
# db = connect_database()

# Connect on first use
def get_db():
    if not hasattr(get_db, 'connection'):
        get_db.connection = connect_database()
    return get_db.connection
```

Reduce JVM startup time with AppCDS:

```dockerfile
# Generate archive during build
RUN java -Xshare:dump -XX:SharedArchiveFile=/app/cache.jsa

# Use archive at runtime
CMD ["java", "-Xshare:on", "-XX:SharedArchiveFile=/app/cache.jsa", "-jar", "app.jar"]
```

## Migration from Legacy Configurations

If you have existing deployments without startup probes, migrate carefully.

Current configuration without startup probe:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 180  # Long delay to accommodate startup
  periodSeconds: 30
```

Improved configuration with startup probe:

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 10
  failureThreshold: 30
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 10  # Faster checks after startup
```

This provides the same startup tolerance but much faster failure detection after initialization.

Roll out the change gradually:

```bash
# Update one pod at a time
kubectl set image deployment/my-app app=my-app:new-version
kubectl rollout status deployment/my-app

# Monitor for issues
kubectl get pods -w
```

## Common Pitfalls

Avoid setting failureThreshold too low. This causes premature restarts for legitimately slow applications.

Do not use the same endpoint for startup and liveness if they have different success criteria. Startup should check if initialization is complete. Liveness should check if the application is alive.

Do not forget to set appropriate resource limits. Containers that run out of memory will never finish starting.

Avoid initialDelaySeconds on startup probes unless your container truly does nothing for the first N seconds. Start checking immediately.

Do not ignore startup probe failures in logs. They might indicate real problems, not just slow startup.

## Monitoring Startup Times

Track startup times to identify trends and problems:

```yaml
# Add timestamp annotation when pod starts
metadata:
  annotations:
    startup-time: "2026-02-09T10:15:32Z"
```

Use a controller or admission webhook to automatically add annotations.

Monitor startup durations with Prometheus:

```yaml
# ServiceMonitor for startup metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-startup-metrics
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

Alert on unusually long startup times:

```yaml
# PrometheusRule
groups:
- name: startup-alerts
  rules:
  - alert: SlowStartup
    expr: |
      time() - kube_pod_start_time{pod=~"my-app-.*"} > 300
    for: 5m
    annotations:
      summary: "Pod {{ $labels.pod }} taking too long to start"
```

## Conclusion

Startup probes are essential for managing slow-starting applications in Kubernetes. They provide the patience needed during initialization while maintaining responsive health monitoring after startup.

Configure startup probes with appropriate timing based on your application's needs. Combine them with liveness and readiness probes for comprehensive health monitoring. Implement proper health endpoints that accurately report initialization status.

Optimize your application startup time when possible, but use startup probes to handle the remaining initialization period gracefully. Monitor startup times and alert on anomalies.

Master startup probes to run slow-starting applications reliably in Kubernetes without sacrificing health monitoring or availability.
