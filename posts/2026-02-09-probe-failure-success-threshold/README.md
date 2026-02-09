# How to Configure Probe failureThreshold and successThreshold for Stability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Configuration

Description: Tune probe failure and success thresholds to balance fast failure detection with tolerance for transient issues, preventing unnecessary restarts and service disruptions.

---

Probe thresholds control how many consecutive successes or failures must occur before Kubernetes changes a container's status. Setting these correctly prevents flapping during temporary issues while still detecting real problems quickly. This guide shows you how to choose appropriate threshold values for your workloads.

## Understanding Threshold Parameters

Two threshold parameters control probe behavior:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  failureThreshold: 3    # Must fail 3 times before restart
  successThreshold: 1    # Must succeed 1 time to be considered healthy
```

**failureThreshold**: Consecutive failures before action (restart for liveness, remove from endpoints for readiness).

**successThreshold**: Consecutive successes needed to mark container as healthy again.

For liveness probes, `successThreshold` must always be 1 (you can't gradually become alive).

## Basic Threshold Configuration

Start with sensible defaults:

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
      periodSeconds: 10
      failureThreshold: 3     # 30 seconds before restart (3 * 10s)
      successThreshold: 1     # Must be 1 for liveness

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
      failureThreshold: 2     # 10 seconds before removing (2 * 5s)
      successThreshold: 1     # Back in service after 1 success
```

## Calculating Time Until Action

Understand timing implications:

```yaml
# Example 1: Conservative liveness
livenessProbe:
  periodSeconds: 10
  failureThreshold: 5
# Time until restart: 10s * 5 = 50 seconds

# Example 2: Aggressive liveness
livenessProbe:
  periodSeconds: 5
  failureThreshold: 2
# Time until restart: 5s * 2 = 10 seconds

# Example 3: Tolerant readiness
readinessProbe:
  periodSeconds: 5
  failureThreshold: 6
  successThreshold: 2
# Time to remove: 5s * 6 = 30 seconds
# Time to add back: 5s * 2 = 10 seconds
```

## Readiness Threshold for Stable Traffic Routing

Configure readiness to avoid flapping:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: api-server:latest
        ports:
        - containerPort: 8080

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          # Higher threshold prevents flapping
          failureThreshold: 3     # 15 seconds of failures
          # Require 2 successes to add back
          successThreshold: 2     # 10 seconds of success
          timeoutSeconds: 3
```

This configuration prevents pods from being rapidly added and removed from the service during transient issues.

## Liveness Threshold Considerations

Balance fast restart with tolerance:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-client
spec:
  containers:
  - name: app
    image: my-app:latest

    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 15
      # Allow multiple transient failures
      failureThreshold: 4      # 60 seconds total (4 * 15s)
      timeoutSeconds: 5
      # Must be 1 for liveness
      successThreshold: 1
```

Higher failure thresholds give applications time to recover from temporary issues like:
- Brief database connection loss
- Temporary network hiccups
- Short CPU spikes affecting health check response time

## Different Thresholds for Different Environments

Production needs stability:

```yaml
# production-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-api
spec:
  template:
    spec:
      containers:
      - name: api
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 10
          failureThreshold: 5    # Conservative: 50 seconds
          successThreshold: 1

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 4    # 20 seconds
          successThreshold: 2    # Require stability
```

Development can be more aggressive:

```yaml
# dev-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-api
spec:
  template:
    spec:
      containers:
      - name: api
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 5
          failureThreshold: 2    # Aggressive: 10 seconds
          successThreshold: 1

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 3
          failureThreshold: 2    # Fast removal
          successThreshold: 1    # Fast addition
```

## Handling Slow Health Check Responses

Adjust thresholds when checks occasionally timeout:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-slow-checks
spec:
  containers:
  - name: app
    image: my-app:latest

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 10
      # Allow occasional slow responses
      failureThreshold: 4       # 40 seconds before removal
      successThreshold: 2       # Require consistency
      timeoutSeconds: 8         # Generous timeout
```

This prevents removal due to occasional slow health checks.

## Avoiding Service Disruption During Deployments

Configure to maintain availability during updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1        # Only 1 pod unavailable at a time

  template:
    spec:
      containers:
      - name: service
        image: critical-service:latest

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          # Quick to detect readiness
          failureThreshold: 2
          # Quick to add to service
          successThreshold: 1
          initialDelaySeconds: 10

        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 10
          # Tolerant of issues during deployment
          failureThreshold: 6    # 60 seconds
          successThreshold: 1
          initialDelaySeconds: 30
```

## Monitoring Threshold Effectiveness

Track probe behavior:

```promql
# Rate of failed probes
rate(prober_probe_total{result="failed"}[5m])

# Count pods failing health checks
count by (namespace, deployment) (
  kube_pod_status_ready{condition="false"}
)

# Pod restart rate (indicates liveness failures)
rate(kube_pod_container_status_restarts_total[15m])

# Time between probe failure and action
histogram_quantile(0.95,
  rate(probe_failure_duration_seconds_bucket[10m])
)
```

Create alerts for threshold issues:

```yaml
groups:
  - name: probe_thresholds
    rules:
      - alert: FrequentReadinessFailures
        expr: |
          rate(prober_probe_total{probe_type="Readiness",result="failed"}[5m]) > 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} failing readiness checks frequently"
          description: "Consider adjusting failureThreshold or fixing underlying issue"

      - alert: HighRestartRate
        expr: |
          rate(kube_pod_container_status_restarts_total[15m]) > 0.1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.container }} restarting frequently"
          description: "Liveness probe may be too aggressive or app has issues"
```

## Debugging Threshold Problems

Identify threshold-related issues:

```bash
# Check how often probes fail
kubectl get events --field-selector involvedObject.name=my-pod | grep -i probe

# View detailed probe configuration
kubectl get pod my-pod -o jsonpath='{.spec.containers[0].livenessProbe}'

# Monitor probe results in real-time
kubectl get pod my-pod -w

# Check restart count
kubectl get pod my-pod -o jsonpath='{.status.containerStatuses[0].restartCount}'

# View last restart reason
kubectl describe pod my-pod | grep -A 5 "Last State"
```

## Testing Threshold Configuration

Simulate failures to test thresholds:

```python
# app.py - Test application with controllable health
from flask import Flask
import time
import os

app = Flask(__name__)

# Inject failures for testing
fail_until = 0
fail_count = 0

@app.route('/healthz')
def health():
    global fail_count
    if time.time() < fail_until:
        fail_count += 1
        return f"Failing (count: {fail_count})", 503
    fail_count = 0
    return "OK", 200

@app.route('/trigger-failure/<int:duration>')
def trigger_failure(duration):
    global fail_until
    fail_until = time.time() + duration
    return f"Will fail for {duration} seconds", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Test different scenarios:

```bash
# Trigger a 25-second failure (less than 3 * 10s = 30s threshold)
curl http://my-pod:8080/trigger-failure/25
# Pod should NOT restart

# Trigger a 35-second failure (more than threshold)
curl http://my-pod:8080/trigger-failure/35
# Pod should restart

# Monitor during test
kubectl get pod my-pod -w
```

## Best Practices

Follow these guidelines:

```yaml
# DO: Use higher thresholds for liveness
livenessProbe:
  periodSeconds: 10
  failureThreshold: 3-5    # 30-50 seconds before restart

# DO: Use lower thresholds for readiness
readinessProbe:
  periodSeconds: 5
  failureThreshold: 2-3    # 10-15 seconds before removal

# DO: Require multiple successes for readiness in critical services
readinessProbe:
  successThreshold: 2      # Ensure stability before adding

# DON'T: Use successThreshold > 1 for liveness
livenessProbe:
  successThreshold: 1      # Must be 1 (Kubernetes requirement)

# DO: Adjust for check frequency
# Fast checks (periodSeconds: 3) -> lower threshold
# Slow checks (periodSeconds: 30) -> higher threshold

# DON'T: Set overly aggressive thresholds
# BAD
livenessProbe:
  periodSeconds: 5
  failureThreshold: 1      # Restarts after single 5s failure

# GOOD
livenessProbe:
  periodSeconds: 5
  failureThreshold: 3      # Allows 15s of failures
```

## Real-World Examples

**High-traffic web application:**
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 3      # Quick removal (15s)
  successThreshold: 2      # Confirm stability (10s)
```

**Database with slow queries:**
```yaml
livenessProbe:
  tcpSocket:
    port: 5432
  periodSeconds: 30
  failureThreshold: 3      # 90 seconds tolerance
  successThreshold: 1
```

**Microservice with external dependencies:**
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 10
  failureThreshold: 4      # Tolerate 40s of dependency issues
  successThreshold: 2      # Ensure dependencies are stable
```

## Conclusion

Proper threshold configuration prevents unnecessary restarts and service disruptions while maintaining fast failure detection. Use higher failure thresholds for stability and reliability, configure success thresholds greater than 1 for readiness probes in critical services, and always test your configuration under realistic failure scenarios.

Monitor probe behavior in production to identify whether your thresholds are too aggressive or too lenient, and adjust based on actual application behavior and recovery patterns.
