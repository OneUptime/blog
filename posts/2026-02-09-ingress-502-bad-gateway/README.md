# How to Debug Kubernetes Ingress 502 Bad Gateway Errors from Backend Pod Unavailability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Troubleshooting

Description: Learn how to debug and fix 502 Bad Gateway errors in Kubernetes Ingress caused by backend pod unavailability, including upstream connection failures and timeout issues.

---

502 Bad Gateway errors frustrate users and indicate that the Ingress controller successfully received the request but couldn't reach backend pods. Unlike 404 errors that mean no route exists, 502 errors confirm the route exists but the upstream service is unavailable or unhealthy.

This guide covers diagnosing the root causes of 502 errors, checking backend pod health, verifying Service endpoints, and implementing solutions that improve reliability.

## Understanding 502 Bad Gateway in Kubernetes Context

The 502 status code means the Ingress controller acted as a gateway and received an invalid response from the upstream server. In Kubernetes, this typically means the Ingress controller couldn't connect to Service endpoints or received errors when it tried.

Common scenarios include all backend pods failing readiness checks, Service endpoints being empty, pods restarting during requests, Network Policies blocking traffic, or backend pods crashing under load. The Ingress controller itself is healthy, but it can't establish connections to backends.

## Checking Ingress Configuration

Start by verifying the Ingress resource is configured correctly.

```bash
# Check Ingress status
kubectl get ingress myapp-ingress -n default

# Get detailed information
kubectl describe ingress myapp-ingress -n default

# Check backends section for errors
# Should show:
# Backend:
#   Service: myapp
#   Port:    80
```

Verify the Ingress points to the correct Service.

```bash
# View Ingress backend configuration
kubectl get ingress myapp-ingress -n default -o yaml | \
  yq eval '.spec.rules[].http.paths[]'

# Output:
# backend:
#   service:
#     name: myapp
#     port:
#       number: 80
# path: /
# pathType: Prefix
```

Check that the Service exists and has the correct port configuration.

```bash
# Verify Service exists
kubectl get service myapp -n default

# Check Service ports
kubectl get service myapp -n default -o jsonpath='{.spec.ports}'
```

## Diagnosing Backend Pod Availability

502 errors often stem from no healthy backend pods being available. Check pod status and readiness.

```bash
# Check pods backing the Service
kubectl get pods -n default -l app=myapp

# Output:
# NAME                     READY   STATUS    RESTARTS   AGE
# myapp-6f8d9c7b5-x4k2h    0/1     Running   5          10m
# myapp-6f8d9c7b5-j9p3m    0/1     Running   3          10m

# Notice READY is 0/1 - pods are running but not ready
```

Check why pods fail readiness checks.

```bash
# Describe pod to see readiness probe failures
kubectl describe pod myapp-6f8d9c7b5-x4k2h -n default | grep -A 10 Readiness

# Output:
# Readiness probe failed: HTTP probe failed with statuscode: 500
# Readiness probe failed: Get "http://10.244.1.5:8080/health": dial tcp 10.244.1.5:8080: connect: connection refused
```

Check pod logs for application errors causing health check failures.

```bash
# View pod logs
kubectl logs myapp-6f8d9c7b5-x4k2h -n default --tail=50

# Look for startup errors, crashes, or health endpoint failures
```

## Verifying Service Endpoints

Even if pods exist, the Service might have no endpoints due to readiness failures or label mismatches.

```bash
# Check Service endpoints
kubectl get endpoints myapp -n default

# Empty endpoints indicate no ready pods:
# NAME    ENDPOINTS   AGE
# myapp   <none>      15m

# Or check EndpointSlices
kubectl get endpointslices -n default -l kubernetes.io/service-name=myapp

# Describe to see endpoint details
kubectl describe endpointslice <name> -n default
```

If endpoints are empty, diagnose using the Service troubleshooting approach covered in our Service endpoints guide.

## Checking Ingress Controller Logs

Ingress controller logs provide detailed information about upstream failures.

```bash
# For NGINX Ingress Controller
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail=100 | \
  grep "502\|upstream"

# Common error messages:
# upstream prematurely closed connection while reading response header from upstream
# no live upstreams while connecting to upstream
# connect() failed (111: Connection refused) while connecting to upstream
```

Check Ingress controller metrics for upstream health.

```bash
# Port-forward to Ingress controller metrics
kubectl port-forward -n ingress-nginx deploy/ingress-nginx-controller 10254:10254

# Query upstream status
curl http://localhost:10254/metrics | grep nginx_ingress_controller_upstream

# Look for:
# nginx_ingress_controller_upstream_servers{namespace="default",service="myapp",upstream="default-myapp-80"} 0
# This shows 0 healthy upstreams
```

## Testing Backend Connectivity Directly

Bypass the Ingress to test if backend pods respond correctly.

```bash
# Port-forward directly to pod
kubectl port-forward pod/myapp-6f8d9c7b5-x4k2h 8080:8080 -n default

# Test in another terminal
curl http://localhost:8080/

# If this works, the pod is healthy
# If this fails, the application has issues

# Test via Service
kubectl port-forward service/myapp 8080:80 -n default

# Test endpoint
curl http://localhost:8080/

# If pod works but Service doesn't, check Service configuration
```

Create a debug pod in the same namespace to test connectivity.

```bash
# Create debug pod
kubectl run debug -n default --image=curlimages/curl -it --rm -- sh

# From debug pod, test Service
curl http://myapp:80/

# Test pod IP directly
curl http://10.244.1.5:8080/

# If direct IP works but Service doesn't, check Service selector
```

## Fixing Common 502 Causes

Address readiness probe failures by adjusting probe configuration or fixing application issues.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 30  # Increase if app is slow to start
          periodSeconds: 10
          timeoutSeconds: 5  # Increase if health checks are slow
          successThreshold: 1
          failureThreshold: 3  # Allow 3 failures before marking unready
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
```

Implement proper health check endpoints in your application.

```javascript
// Node.js example
const express = require('express');
const app = express();

let isReady = false;

// Initialize application
setTimeout(() => {
  // After initialization completes
  isReady = true;
}, 5000);

app.get('/health/ready', (req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

app.get('/health/live', (req, res) => {
  // Check if application is alive (not deadlocked)
  res.status(200).json({ status: 'alive' });
});

app.listen(8080);
```

## Configuring Ingress Timeouts

Adjust Ingress controller timeouts to handle slow backend responses.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    # NGINX specific annotations
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"

    # Keep-alive settings
    nginx.ingress.kubernetes.io/upstream-keepalive-connections: "64"
    nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"

    # Retry configuration
    nginx.ingress.kubernetes.io/proxy-next-upstream: "error timeout http_502 http_503 http_504"
    nginx.ingress.kubernetes.io/proxy-next-upstream-tries: "3"
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 80
```

## Implementing Connection Pooling

Configure upstream connection pooling to improve reliability.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  upstream-keepalive-connections: "64"
  upstream-keepalive-timeout: "60"
  upstream-keepalive-requests: "100"
  keep-alive: "75"
  keep-alive-requests: "100"
```

## Handling Pod Termination Gracefully

502 errors during deployments occur when Ingress routes traffic to terminating pods. Implement proper shutdown handling.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0  # Never reduce capacity during updates
      maxSurge: 1
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Sleep to allow Ingress to detect pod as not ready
                sleep 15
                # Graceful shutdown
                kill -TERM 1
      terminationGracePeriodSeconds: 30
```

Implement graceful shutdown in your application.

```javascript
// Node.js graceful shutdown
const server = app.listen(8080);

let shuttingDown = false;

process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');
  shuttingDown = true;

  // Mark as not ready immediately
  isReady = false;

  server.close(() => {
    console.log('Server closed, existing connections finished');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 25000);
});
```

## Monitoring and Alerting for 502 Errors

Set up alerts for elevated 502 error rates.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: ingress_errors
      rules:
      - alert: High502ErrorRate
        expr: |
          (sum(rate(nginx_ingress_controller_requests{status="502"}[5m]))
          / sum(rate(nginx_ingress_controller_requests[5m]))) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High 502 error rate on Ingress"
          description: "502 error rate is {{ $value }}%"

      - alert: NoHealthyUpstreams
        expr: |
          nginx_ingress_controller_upstream_servers == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No healthy upstreams for {{ $labels.service }}"
```

Create dashboards tracking upstream health and error rates to identify patterns and diagnose issues proactively.

502 Bad Gateway errors in Kubernetes Ingress indicate backend connectivity problems rather than Ingress misconfiguration. By systematically checking pod health, Service endpoints, network connectivity, and implementing proper health checks with graceful shutdown handling, you eliminate most 502 error causes. Combined with appropriate timeout configuration and monitoring, these practices create reliable ingress traffic routing to backend services.
