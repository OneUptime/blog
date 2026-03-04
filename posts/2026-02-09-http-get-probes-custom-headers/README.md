# How to Configure HTTP GET Probes with Custom Headers and Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, HTTP Probes

Description: Configure Kubernetes HTTP GET probes with custom headers, paths, and schemes to integrate with authentication systems, virtual hosts, and complex application routing requirements.

---

HTTP GET probes are the most common type of health check in Kubernetes. While basic configurations work for simple applications, production environments often require custom headers for authentication, specific paths for different probe types, or HTTPS schemes for secure communication.

This guide covers advanced HTTP GET probe configuration including custom headers, authentication, virtual host routing, and troubleshooting connection issues.

## Basic HTTP GET Probe Structure

Start with understanding the complete HTTP GET probe syntax:

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
        path: /healthz          # URL path to check
        port: 8080              # Port number or name
        scheme: HTTP            # HTTP or HTTPS
        host: localhost         # Host header (optional)
        httpHeaders:            # Custom headers (optional)
        - name: X-Custom-Header
          value: health-check
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

All HTTP GET probes must specify a path and port at minimum.

## Adding Custom Headers for Authentication

Many applications require authentication headers for health check endpoints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secured-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secured-api
  template:
    metadata:
      labels:
        app: secured-api
    spec:
      containers:
      - name: api
        image: secured-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: HEALTH_CHECK_TOKEN
          valueFrom:
            secretKeyRef:
              name: health-tokens
              key: token

        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
            httpHeaders:
            - name: Authorization
              value: "Bearer secret-health-check-token"
            - name: X-Health-Check
              value: "true"
          periodSeconds: 10
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
            httpHeaders:
            - name: Authorization
              value: "Bearer secret-health-check-token"
            - name: X-Probe-Type
              value: "readiness"
          periodSeconds: 5
          failureThreshold: 2
```

Note that header values in probe configuration are stored in plain text. For better security, implement IP-based authentication or use service mesh security.

## Implementing Header-Based Health Check Authentication

Create endpoints that verify custom headers:

```go
// Go example with header authentication
package main

import (
    "net/http"
    "os"
)

var healthCheckToken string

func main() {
    healthCheckToken = os.Getenv("HEALTH_CHECK_TOKEN")

    http.HandleFunc("/healthz", withHealthCheckAuth(healthHandler))
    http.HandleFunc("/ready", withHealthCheckAuth(readyHandler))
    http.ListenAndServe(":8080", nil)
}

func withHealthCheckAuth(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Check for health check header
        if r.Header.Get("X-Health-Check") == "true" {
            // Verify token
            authHeader := r.Header.Get("Authorization")
            expectedAuth := "Bearer " + healthCheckToken

            if authHeader == expectedAuth {
                next(w, r)
                return
            }
        }

        // Allow health checks from Kubernetes probe IP ranges
        // without authentication (optional)
        if isKubernetesProbe(r.RemoteAddr) {
            next(w, r)
            return
        }

        w.WriteHeader(http.StatusUnauthorized)
        w.Write([]byte("Unauthorized"))
    }
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Healthy"))
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
    if checkDependencies() {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Ready"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Not ready"))
    }
}
```

## Using Different Paths for Different Probe Types

Separate endpoints for liveness, readiness, and startup:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-endpoint-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080

    startupProbe:
      httpGet:
        path: /startup
        port: 8080
        httpHeaders:
        - name: X-Probe-Type
          value: startup
      periodSeconds: 5
      failureThreshold: 30

    livenessProbe:
      httpGet:
        path: /live
        port: 8080
        httpHeaders:
        - name: X-Probe-Type
          value: liveness
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
        httpHeaders:
        - name: X-Probe-Type
          value: readiness
      periodSeconds: 5
      failureThreshold: 2
```

Implement specialized logic for each endpoint:

```python
# Python Flask with separate endpoints
from flask import Flask, request, jsonify
import time

app = Flask(__name__)
startup_complete = False
startup_time = time.time()

@app.route('/startup')
def startup_probe():
    """Check if application has completed initialization"""
    if startup_complete:
        return jsonify({"status": "complete"}), 200

    elapsed = time.time() - startup_time
    if elapsed > 300:  # 5 minutes timeout
        return jsonify({"status": "timeout", "elapsed": elapsed}), 503

    return jsonify({"status": "initializing", "elapsed": elapsed}), 200

@app.route('/live')
def liveness_probe():
    """Check if application is alive (not deadlocked)"""
    if is_deadlocked() or is_out_of_memory():
        return jsonify({"status": "unhealthy"}), 503
    return jsonify({"status": "alive"}), 200

@app.route('/ready')
def readiness_probe():
    """Check if application can handle traffic"""
    checks = {
        "database": check_database(),
        "cache": check_redis(),
        "queue": check_rabbitmq()
    }

    all_ready = all(checks.values())
    status_code = 200 if all_ready else 503

    return jsonify({"checks": checks, "ready": all_ready}), status_code

if __name__ == '__main__':
    # Simulate slow startup
    def initialize():
        global startup_complete
        time.sleep(10)
        startup_complete = True

    import threading
    threading.Thread(target=initialize, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)
```

## HTTPS Probes with TLS

Configure probes to use HTTPS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8443
    volumeMounts:
    - name: tls-certs
      mountPath: /etc/tls
      readOnly: true

    livenessProbe:
      httpGet:
        path: /healthz
        port: 8443
        scheme: HTTPS  # Use HTTPS instead of HTTP
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /ready
        port: 8443
        scheme: HTTPS
      periodSeconds: 5
      failureThreshold: 2

  volumes:
  - name: tls-certs
    secret:
      secretName: app-tls-cert
```

Note that Kubernetes probes do not verify TLS certificates, they accept any certificate including self-signed ones.

## Using Named Ports in Probes

Reference ports by name for flexibility:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-named-ports
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - name: http
      containerPort: 8080
      protocol: TCP
    - name: metrics
      containerPort: 9090
      protocol: TCP
    - name: admin
      containerPort: 8081
      protocol: TCP

    livenessProbe:
      httpGet:
        path: /healthz
        port: http  # Reference port by name
      periodSeconds: 10

    readinessProbe:
      httpGet:
        path: /ready
        port: http
      periodSeconds: 5

    # Separate probe for metrics endpoint
    # (though this would typically be scraped, not used as a probe)
```

Named ports make configurations more readable and easier to update.

## Virtual Host Routing with Custom Host Headers

Some applications route based on Host headers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vhost-app
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
        host: api.example.com  # Custom host header
        httpHeaders:
        - name: X-Forwarded-Proto
          value: https
        - name: X-Request-ID
          value: health-check
      periodSeconds: 10
```

The probe connects to localhost:8080 but sends `Host: api.example.com` header.

## Probes with Query Parameters

Include query parameters in the path:

```yaml
livenessProbe:
  httpGet:
    path: /healthz?source=kubernetes&probe=liveness
    port: 8080
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready?source=kubernetes&probe=readiness&deep=false
    port: 8080
  periodSeconds: 5
```

Use query parameters to control probe behavior:

```javascript
// Node.js example with query parameter handling
const express = require('express');
const app = express();

app.get('/healthz', (req, res) => {
  const source = req.query.source;
  const probeType = req.query.probe;

  // Log probe source for debugging
  if (source === 'kubernetes') {
    console.log(`Kubernetes ${probeType} probe received`);
  }

  if (isHealthy()) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Unhealthy');
  }
});

app.get('/ready', (req, res) => {
  const deepCheck = req.query.deep === 'true';

  if (deepCheck) {
    // Perform comprehensive checks
    if (checkAllDependencies()) {
      res.status(200).send('Ready');
    } else {
      res.status(503).send('Not ready');
    }
  } else {
    // Quick check only
    if (isBasicallReady()) {
      res.status(200).send('Ready');
    } else {
      res.status(503).send('Not ready');
    }
  }
});

app.listen(8080);
```

## Rate Limiting Health Check Requests

Prevent probe requests from overwhelming your application:

```go
package main

import (
    "net/http"
    "sync"
    "time"
)

type RateLimiter struct {
    mu           sync.Mutex
    lastRequest  time.Time
    minInterval  time.Duration
}

func (rl *RateLimiter) Allow() bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    now := time.Now()
    if now.Sub(rl.lastRequest) < rl.minInterval {
        return false
    }
    rl.lastRequest = now
    return true
}

var healthCheckLimiter = &RateLimiter{
    minInterval: 100 * time.Millisecond,
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    // Rate limit health checks
    if !healthCheckLimiter.Allow() {
        // Return success without checking
        // (assume healthy if rate limited)
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
        return
    }

    // Perform actual health check
    if performHealthCheck() {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Healthy"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Unhealthy"))
    }
}
```

## Debugging HTTP Probe Failures

Troubleshoot probe connection issues:

```bash
# Check if the endpoint responds manually
kubectl exec -it my-pod -- curl http://localhost:8080/healthz

# Test with custom headers
kubectl exec -it my-pod -- curl -H "X-Health-Check: true" http://localhost:8080/healthz

# Check HTTPS probes
kubectl exec -it my-pod -- curl -k https://localhost:8443/healthz

# View probe events
kubectl describe pod my-pod | grep -A 10 "Liveness\|Readiness"

# Check application logs during probe failures
kubectl logs my-pod --tail=100 | grep -i health

# Port forward and test locally
kubectl port-forward my-pod 8080:8080
curl -v http://localhost:8080/healthz
```

## Monitoring Probe Performance

Track probe latency and failures:

```promql
# Probe latency
histogram_quantile(0.99,
  rate(probe_http_duration_seconds_bucket[5m])
)

# Probe failures by endpoint
sum by (path) (
  rate(probe_http_status_code{code!~"2.."}[5m])
)

# Probe timeout rate
rate(probe_duration_seconds{result="timeout"}[5m])
```

## Common Issues and Solutions

**Probe times out:**
```yaml
# Increase timeout
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  timeoutSeconds: 10  # Increase from default 1s
```

**Wrong port:**
```bash
# Check which ports are actually listening
kubectl exec -it my-pod -- netstat -tlnp
kubectl exec -it my-pod -- ss -tlnp
```

**Path not found:**
```bash
# Verify the path exists
kubectl exec -it my-pod -- curl -v http://localhost:8080/healthz
```

**TLS certificate issues:**
```yaml
# Kubernetes ignores cert validation, but check your app logs
# for TLS configuration issues
kubectl logs my-pod | grep -i tls
```

## Best Practices

Follow these guidelines for HTTP probes:

```yaml
# DO: Use dedicated health check endpoints
livenessProbe:
  httpGet:
    path: /healthz  # Not /api/users or other business logic
    port: 8080

# DO: Keep health checks lightweight
# Return quickly (< 1 second)

# DO: Use appropriate timeouts
livenessProbe:
  timeoutSeconds: 5  # Generous but not excessive

# DON'T: Use authentication that could fail
# Keep health check tokens separate from user auth

# DON'T: Check external services in liveness
# Only check application internals

# DO: Use custom headers for debugging
httpHeaders:
- name: X-Kubernetes-Probe
  value: "true"
- name: X-Probe-Type
  value: "liveness"
```

## Conclusion

HTTP GET probes with custom headers and paths provide flexible health checking for complex applications. By configuring appropriate headers for authentication, using separate paths for different probe types, and implementing efficient health check endpoints, you can build robust health checking that integrates seamlessly with your application architecture.

Always test your probe configurations manually before deploying, monitor probe performance in production, and keep health check logic simple and fast to avoid adding latency to your application.
