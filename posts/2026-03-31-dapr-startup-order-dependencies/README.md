# How to Configure Dapr Startup Order Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Startup, Dependency, Kubernetes, Init Container

Description: Learn how to configure Dapr application startup order to ensure services start only after their dependencies are ready and healthy.

---

## Overview

In microservice architectures, services have startup dependencies: a payment service might need the database and message broker to be ready before it begins processing. Dapr integrates with Kubernetes startup patterns to manage these dependencies.

## Dapr App Health Check Dependency

By default, Dapr will attempt to forward traffic to your app as soon as the sidecar starts. Configure Dapr to wait until your app reports healthy before accepting traffic:

```yaml
annotations:
  dapr.io/enable-app-health-check: "true"  # Required to enable health checks
  dapr.io/app-health-check-path: "/healthz"
  dapr.io/app-health-probe-interval: "5"   # Check every 5 seconds
  dapr.io/app-health-probe-timeout: "3000" # 3000 millisecond timeout
  dapr.io/app-health-threshold: "3"        # 3 consecutive failures before marking unhealthy
```

Implement the health endpoint in your app:

```python
from flask import Flask, jsonify
import redis

app = Flask(__name__)

@app.route('/healthz')
def health():
    # Check critical dependencies
    try:
        r = redis.Redis(host='redis', port=6379)
        r.ping()
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 503
```

## Init Containers for Explicit Ordering

Use init containers to wait for dependencies before starting:

```yaml
spec:
  initContainers:
  - name: wait-for-db
    image: busybox:1.36
    command: ['sh', '-c',
      'until nc -z postgres-service 5432; do echo "Waiting for DB..."; sleep 2; done']
  - name: wait-for-kafka
    image: busybox:1.36
    command: ['sh', '-c',
      'until nc -z kafka-service 9092; do echo "Waiting for Kafka..."; sleep 2; done']
  containers:
  - name: myapp
    image: myrepo/myapp:latest
```

## Startup Probe Configuration

Use Kubernetes startup probes to delay traffic until the app finishes initializing:

```yaml
spec:
  containers:
  - name: myapp
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      failureThreshold: 30
      periodSeconds: 10
      # Total time: 30 * 10s = 5 minutes for slow starting apps
    readinessProbe:
      httpGet:
        path: /readyz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    livenessProbe:
      httpGet:
        path: /livez
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 15
```

## Dapr Sidecar Wait-for-App

By default, the Dapr sidecar blocks during initialization until your app is listening on its configured port. To go further and have Dapr pause delivering messages and service invocations until your app reports healthy at runtime, enable app health checks:

```yaml
annotations:
  dapr.io/enable-app-health-check: "true"
  dapr.io/app-health-check-path: "/healthz"
  dapr.io/app-health-probe-interval: "5"
  dapr.io/app-health-probe-timeout: "500"
  dapr.io/app-health-threshold: "3"
```

## Ordering with Kubernetes Jobs

For database migrations that must complete before any service starts:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: myrepo/migrations:latest
        command: ["./migrate", "--up"]
      restartPolicy: OnFailure
```

Use ArgoCD sync waves or Helm hooks to ensure migrations run before service deployments.

## Summary

Dapr startup order management combines app health check annotations, init containers for dependency readiness, Kubernetes startup and readiness probes, and the sidecar's built-in wait-for-app behavior. Layer these mechanisms to ensure each service starts only when its dependencies are genuinely ready to serve traffic.
