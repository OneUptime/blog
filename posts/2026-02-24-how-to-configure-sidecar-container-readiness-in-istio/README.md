# How to Configure Sidecar Container Readiness in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Readiness, Health Checks, Kubernetes

Description: How to configure and manage readiness checks for the Istio sidecar proxy to ensure traffic is only sent to pods that are fully ready.

---

Readiness in an Istio-enabled pod has two dimensions: the application needs to be ready, and the sidecar proxy needs to be ready. If either one isn't ready, the pod shouldn't receive traffic. Getting readiness configuration right prevents traffic from being sent to pods that can't handle it, which avoids 503 errors and connection resets.

## How Istio Sidecar Readiness Works

The Istio sidecar proxy has its own health check endpoint:

```
http://localhost:15021/healthz/ready
```

This endpoint returns 200 when:
- The Envoy proxy is running
- The proxy has received initial configuration from the control plane
- The proxy's listeners are active and ready to handle traffic

You can check it manually:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- curl -s http://localhost:15021/healthz/ready
```

## Default Readiness Behavior

When Istio injects the sidecar, it adds a readiness probe to the sidecar container:

```yaml
readinessProbe:
  httpGet:
    path: /healthz/ready
    port: 15021
  initialDelaySeconds: 0
  periodSeconds: 15
  timeoutSeconds: 3
  failureThreshold: 4
```

This means the sidecar is checked every 15 seconds. If it fails 4 consecutive checks, the container is marked not ready.

## Combining App and Sidecar Readiness

For a pod to receive traffic, ALL containers must be ready. So the pod is only ready when:
1. The istio-proxy container passes its readiness check
2. Your application container passes its readiness check

This is Kubernetes default behavior and works well with Istio.

### Application Health Through the Sidecar

Istio can proxy your application's health checks through the sidecar. This is enabled by default and controlled by:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      rewriteAppHTTPProbers: true
```

When enabled, your application's HTTP health probes are rewritten to go through the sidecar's agent on port 15020. This has two benefits:
- Health checks work even with strict mTLS enabled (the kubelet can't do mTLS)
- The health check validates that the full traffic path works, including the sidecar

The rewrite transforms:

```yaml
# Original
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
```

Into:

```yaml
# Rewritten by Istio
readinessProbe:
  httpGet:
    path: /app-health/my-container/readyz
    port: 15020
```

The sidecar agent receives the request on 15020, forwards it to your application on the original port, and returns the result.

## Customizing Sidecar Readiness

### Faster Readiness Detection

If you need faster readiness detection (for example, during rolling updates), reduce the probe intervals:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          readinessProbe:
            httpGet:
              path: /healthz/ready
              port: 15021
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 2
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

With 5-second intervals and 2 failures needed, an unhealthy sidecar is detected within 10 seconds instead of 60.

### Startup Probe for Slow Starters

If your application takes a while to start, use a startup probe to avoid killing it during initialization:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          failureThreshold: 60
          periodSeconds: 2
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 10
          failureThreshold: 3
```

The startup probe runs first, allowing up to 120 seconds (60 * 2) for the application to become healthy. Once the startup probe succeeds, the readiness probe takes over.

## Readiness Gates

Kubernetes supports custom readiness gates that allow external controllers to signal pod readiness. You can use this with Istio for more advanced readiness scenarios:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      readinessGates:
      - conditionType: "istio.io/sidecarReady"
      containers:
      - name: my-app
        image: my-app:latest
```

Note that Istio doesn't natively set this condition, but you could build a custom controller that watches sidecar readiness and updates the pod condition.

## TCP and gRPC Health Checks

Not all applications expose HTTP health endpoints. Istio handles TCP and gRPC probes too:

### TCP Readiness
```yaml
containers:
- name: my-app
  image: my-app:latest
  readinessProbe:
    tcpSocket:
      port: 5432
    periodSeconds: 10
```

TCP probes are not rewritten by Istio since they don't go through the sidecar's health check rewriting.

### gRPC Readiness
```yaml
containers:
- name: my-app
  image: my-app:latest
  readinessProbe:
    grpc:
      port: 50051
    periodSeconds: 10
```

gRPC probes work with Istio's health check rewriting, but make sure your gRPC health service implements the standard `grpc.health.v1.Health` service.

## Readiness During Deployments

During a rolling update, readiness becomes critical. Kubernetes uses readiness to decide when a new pod can receive traffic and when an old pod can be terminated.

Configure your deployment strategy with readiness in mind:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
  minReadySeconds: 10
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 2
```

The `minReadySeconds: 10` setting means a pod must be ready for at least 10 seconds before the deployment considers it stable. This prevents false positives where a pod passes readiness briefly but then fails.

## Debugging Readiness Issues

When pods aren't becoming ready:

```bash
# Check which containers are not ready
kubectl get pod my-app-xyz -o jsonpath='{.status.containerStatuses[*].name}:{.status.containerStatuses[*].ready}'

# Check specific readiness probe results
kubectl describe pod my-app-xyz | grep -A 10 "Readiness"

# Test the sidecar health endpoint directly
kubectl exec -it my-app-xyz -c istio-proxy -- curl -s http://localhost:15021/healthz/ready

# Test the app health endpoint through the sidecar
kubectl exec -it my-app-xyz -c istio-proxy -- curl -s http://localhost:15020/app-health/my-app/readyz

# Check proxy sync status
istioctl proxy-status | grep my-app
```

If the sidecar's readiness check fails, it usually means:
- The proxy can't reach the control plane (check network policies)
- The proxy configuration is invalid (check pilot logs)
- The proxy is overloaded (check resource limits)

If the application's rewritten health check fails, check:
- Is the application actually listening on the expected port?
- Can the sidecar reach the application? (usually a port conflict)
- Is the health endpoint returning a non-200 status?

## Readiness and mTLS

When strict mTLS is enabled, the kubelet can't directly reach your application's health check endpoint because it doesn't have the mesh certificates. Istio's probe rewriting solves this by having the kubelet talk to the sidecar agent (port 15020) over plain HTTP, and the agent talks to your application over localhost (which doesn't use mTLS).

If probe rewriting is disabled and you're using strict mTLS, you need to use a port that's excluded from mTLS:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "8081"
```

Then point your readiness probe at port 8081.

Sidecar readiness is one of those things that works automatically most of the time, but when it doesn't, it can be confusing. The key is understanding that pod readiness is the AND of all container readiness checks, and making sure both the sidecar and your application have appropriate probe configurations.
