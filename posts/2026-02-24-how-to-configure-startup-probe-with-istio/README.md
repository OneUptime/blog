# How to Configure Startup Probe with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Startup Probe, Kubernetes, Sidecar, Health Checks

Description: Configure Kubernetes startup probes to work correctly with Istio sidecars for applications with slow initialization sequences.

---

Startup probes were introduced in Kubernetes 1.18 to solve a specific problem: applications that take a long time to start. Before startup probes, you had to hack around this with large `initialDelaySeconds` on liveness probes, which also meant slow failure detection after startup. Startup probes give your application as much time as it needs to start, and once they pass, liveness and readiness probes take over.

With Istio in the mix, startup probes need a bit of extra thought because the sidecar proxy adds its own startup time.

## Why Startup Probes Matter with Istio

Consider a Java application that takes 90 seconds to start. Without a startup probe, you need something like:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 120
  periodSeconds: 10
```

The problem: after the application is running, if it hangs, it takes 120 + (10 * failureThreshold) seconds before Kubernetes restarts it. That is way too long for incident response.

With a startup probe:

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 5
  failureThreshold: 36
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
```

The startup probe gives the app up to 180 seconds (5 * 36) to start. Once it passes, the liveness probe kicks in with a 30-second (10 * 3) detection window. Much better.

## Startup Probe with Istio Sidecar

When Istio injects the sidecar, your startup probe needs to account for the proxy startup time. The proxy typically starts in 1-3 seconds, but it needs to receive its configuration from istiod before it can proxy traffic correctly.

If your application starts before the proxy is ready and the startup probe hits port 8080 through the proxy, it might fail because the proxy has not finished configuring.

The recommended setup:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: slow-starter
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: slow-starter
  template:
    metadata:
      labels:
        app: slow-starter
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
        - name: slow-starter
          image: myregistry/slow-starter:latest
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 5
            failureThreshold: 60
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            periodSeconds: 5
            failureThreshold: 3
```

With `holdApplicationUntilProxyStarts: true`, the proxy starts first, and your application starts after the proxy is ready. The startup probe then only needs to wait for your application, not the proxy.

## How Istio Rewrites Startup Probes

Just like liveness and readiness probes, Istio rewrites startup probes to go through the sidecar agent. The rewritten probe targets port 15021:

Original:
```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
```

Rewritten by Istio:
```yaml
startupProbe:
  httpGet:
    path: /app-health/slow-starter/startupz
    port: 15021
```

You can verify the rewriting:

```bash
kubectl get pod <pod-name> -o yaml | grep -B2 -A10 "startupProbe"
```

## Calculating the Right failureThreshold

The formula is simple:

```text
max_startup_time = periodSeconds * failureThreshold
```

So if your app takes up to 120 seconds to start:

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 5
  failureThreshold: 30  # 5 * 30 = 150 seconds max
```

Add some buffer. If the app typically takes 120 seconds, set the max to 150-180 seconds to handle slow starts.

With Istio and `holdApplicationUntilProxyStarts`, you do not need to add extra time for the proxy. Without it, add 10-15 seconds of buffer for proxy startup:

```yaml
# Without holdApplicationUntilProxyStarts
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 5
  failureThreshold: 36  # 5 * 36 = 180 seconds (120 for app + 60 buffer for proxy)
```

## gRPC Startup Probes

If your application uses gRPC, you can use native gRPC probes (Kubernetes 1.24+):

```yaml
startupProbe:
  grpc:
    port: 50051
  periodSeconds: 5
  failureThreshold: 30
```

Or the exec-based fallback with grpc-health-probe:

```yaml
startupProbe:
  exec:
    command:
      - /bin/grpc_health_probe
      - -addr=:50051
  periodSeconds: 5
  failureThreshold: 30
```

Both work with Istio probe rewriting.

## TCP Startup Probes

TCP probes check if a port is accepting connections. With Istio, be careful: Envoy starts listening on application ports almost immediately, so a TCP probe might pass before your application is actually ready:

```yaml
# This might give false positives with Istio
startupProbe:
  tcpSocket:
    port: 8080
  periodSeconds: 5
  failureThreshold: 30
```

The probe succeeds as soon as Envoy accepts the connection, even if your application is not ready. Prefer HTTP probes over TCP probes in an Istio mesh.

## Startup Probe with Init Containers

Some applications use init containers for database migrations or cache warming. Init containers run before the sidecar, so they cannot access services through the mesh:

```yaml
spec:
  initContainers:
    - name: db-migrate
      image: myregistry/migrate:latest
      command: ["./migrate", "--target", "latest"]
  containers:
    - name: app
      image: myregistry/app:latest
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        periodSeconds: 5
        failureThreshold: 30
```

If your init container needs to access services in the mesh, it will not work because the sidecar is not running yet. Move that logic to the main container startup or use a post-start hook instead.

## Monitoring Startup Probe Status

Watch startup probe events:

```bash
# See probe events
kubectl describe pod <pod-name> | grep -A20 "Events"

# Check container state
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].state}' | python3 -m json.tool

# Watch pods during rollout
kubectl get pods -l app=slow-starter -w
```

During startup, the pod shows `Running` but `0/1 Ready` until the startup probe passes, then the readiness probe passes.

## A Complete Example

Here is a production-ready deployment for a Java application with Istio:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: java-api
  template:
    metadata:
      labels:
        app: java-api
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
        - name: java-api
          image: myregistry/java-api:latest
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
          startupProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            periodSeconds: 5
            failureThreshold: 36
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            periodSeconds: 5
            failureThreshold: 2
            successThreshold: 2
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]
```

This gives the Java app 180 seconds to start, has a 30-second liveness detection window after startup, requires two consecutive readiness successes before receiving traffic, and gives 15 seconds for graceful shutdown. The `holdApplicationUntilProxyStarts` annotation ensures the sidecar is ready before the Java process begins.

Startup probes with Istio follow the same patterns as other probes. The main things to remember are to use HTTP probes instead of TCP, enable `holdApplicationUntilProxyStarts` for reliable startup ordering, and calculate your failureThreshold based on your actual application startup time plus a reasonable buffer.
