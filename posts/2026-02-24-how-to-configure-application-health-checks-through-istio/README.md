# How to Configure Application Health Checks Through Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Checks, Application Monitoring, Kubernetes, Envoy

Description: Set up application-level health checks that flow through Istio's proxy, covering HTTP, gRPC, and TCP probe types with practical configuration examples.

---

Application health checks in an Istio mesh work differently than in a plain Kubernetes cluster. The Envoy sidecar proxy sits between the kubelet and your application, which means health check traffic goes through the proxy (or gets rewritten to bypass it). Understanding these paths helps you configure health checks that accurately reflect your application's state.

## The Two Paths for Health Checks

There are two distinct paths for health check traffic in an Istio-enabled pod:

**Path 1: Through the Sidecar Agent (Probe Rewriting)**

The kubelet sends the probe to port 15021 on the Istio agent. The agent forwards it to your application. This path is used when probe rewriting is enabled (the default).

```
kubelet -> port 15021 (istio-agent) -> port 8080 (your app)
```

**Path 2: Through the Envoy Proxy**

If probe rewriting is disabled, the probe goes through Envoy like any other inbound traffic. This is problematic with STRICT mTLS because the kubelet does not have certificates.

```
kubelet -> iptables -> Envoy (port 15006) -> port 8080 (your app)
```

Path 1 is almost always what you want. It avoids mTLS issues and gives the agent a chance to add extra health information.

## HTTP Health Checks

The most common type. Define them normally and Istio handles rewriting:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: myregistry/web-app:latest
          ports:
            - name: http
              containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
              httpHeaders:
                - name: X-Health-Check
                  value: "kubernetes"
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
```

The custom header `X-Health-Check` is forwarded by the Istio agent to your application. Your app can use this to differentiate health check requests from real traffic (useful for logging).

## Implementing a Good Health Endpoint

A useful health endpoint checks more than just "is the process running." Here is what a thorough health check looks like:

```go
func healthzHandler(w http.ResponseWriter, r *http.Request) {
    status := map[string]string{
        "status": "ok",
    }

    // Check database connection
    if err := db.Ping(); err != nil {
        status["status"] = "unhealthy"
        status["database"] = err.Error()
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(status)
        return
    }
    status["database"] = "connected"

    // Check cache connection
    if _, err := cache.Ping().Result(); err != nil {
        status["status"] = "degraded"
        status["cache"] = err.Error()
        // Still return 200 - cache failure is not fatal
    } else {
        status["cache"] = "connected"
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(status)
}
```

Split liveness and readiness into separate endpoints with different logic:

- **Liveness** (`/healthz`): Is the process running and not deadlocked? Keep this simple. If liveness fails, Kubernetes restarts the pod.
- **Readiness** (`/readyz`): Can the service handle new requests? Check dependencies here. If readiness fails, the pod stops receiving traffic but is not restarted.

## gRPC Health Checks

For gRPC services, use the native gRPC health protocol:

```yaml
containers:
  - name: grpc-service
    ports:
      - name: grpc
        containerPort: 50051
    livenessProbe:
      grpc:
        port: 50051
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:
      grpc:
        port: 50051
        service: "myservice"
      initialDelaySeconds: 5
      periodSeconds: 5
```

Istio rewrites gRPC probes the same way as HTTP probes. The agent on port 15021 makes the gRPC health check call to your container.

## TCP Health Checks

TCP probes check if a port is accepting connections:

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
```

With Istio, TCP probes have a limitation: Envoy starts listening on application ports almost immediately, so the probe might pass even when your application is not ready. TCP probes are mostly useful as a basic "is something listening on this port" check. For application-level health, use HTTP or gRPC probes.

## Multi-Container Pod Health Checks

If your pod has multiple application containers (not counting the Istio sidecar), each can have its own probes:

```yaml
spec:
  containers:
    - name: api
      ports:
        - containerPort: 8080
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
      readinessProbe:
        httpGet:
          path: /readyz
          port: 8080
    - name: worker
      ports:
        - containerPort: 9090
      livenessProbe:
        httpGet:
          path: /healthz
          port: 9090
      readinessProbe:
        httpGet:
          path: /readyz
          port: 9090
```

Istio rewrites probes for all containers in the pod. The pod is only considered ready when ALL containers pass their readiness probes.

## Health Check Endpoints for Different Frameworks

### Spring Boot (Java)

Spring Boot Actuator provides health endpoints out of the box:

```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
```

### Express (Node.js)

```javascript
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/readyz', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});
```

### FastAPI (Python)

```python
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/readyz")
async def readyz():
    try:
        await database.execute("SELECT 1")
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
```

## Health Check Timing Guidelines

Here are some practical guidelines for probe timing with Istio:

```yaml
# For most web services
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 2
  failureThreshold: 30  # 60 seconds max startup

livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3   # 30 seconds to detect failure

readinessProbe:
  httpGet:
    path: /readyz
    port: 8080
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 2   # 10 seconds to remove from pool
  successThreshold: 2   # 10 seconds to add back to pool
```

The readiness probe runs more frequently than liveness because you want faster traffic management. Liveness runs less frequently because restarting a pod is expensive.

## Debugging Health Checks Through Istio

When health checks misbehave:

```bash
# Check what the kubelet sees
kubectl describe pod <pod-name> | grep -A15 "Conditions"

# Test the health endpoint through the sidecar agent
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/app-health/web-app/livez

kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/app-health/web-app/readyz

# Test the health endpoint directly (bypassing Istio)
kubectl exec -it <pod-name> -c web-app -- curl -v http://localhost:8080/healthz

# Check the sidecar agent logs for probe errors
kubectl logs <pod-name> -c istio-proxy | grep -i "health\|probe"
```

If the direct test passes but the sidecar agent test fails, there is likely a configuration mismatch in the probe rewriting.

Application health checks through Istio should be transparent. Define your probes as you normally would, let Istio handle the rewriting, and focus on making your health endpoints actually reflect the health of your application. The most common mistake is having a liveness probe that always returns 200 even when the application is broken. Make your probes meaningful and they will keep your Istio mesh healthy.
