# How to Configure Health Checks for Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Checks, Sidecar, Kubernetes, Envoy

Description: Configure health checks that work correctly with Istio sidecar injection, covering probe rewriting, port configuration, and startup ordering.

---

When Istio injects its sidecar proxy into your pods, it changes how health checks work. The kubelet sends probes to the pod, but now there is an Envoy proxy sitting between the kubelet and your application container. If you do not account for this, you can end up with health checks that pass when they should fail, or fail when they should pass.

## How Istio Changes Health Checks

Without Istio, health checks are simple. The kubelet sends an HTTP request, TCP check, or exec command directly to your container. With Istio, the sidecar proxy intercepts inbound traffic. This creates two problems:

1. If mTLS is in STRICT mode, the kubelet cannot make plain HTTP requests to your container because Envoy expects mTLS.
2. The sidecar might not be ready yet when Kubernetes starts health checking, causing false failures during startup.

Istio solves the first problem with probe rewriting. It intercepts your probe definitions and redirects them through the sidecar agent on port 15021, which can forward probes to your application without requiring mTLS.

## Probe Rewriting in Detail

Since Istio 1.10, probe rewriting is enabled by default. When the sidecar injector processes your pod, it modifies the probe configuration:

Original probe:
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
```

Rewritten probe (what actually runs):
```yaml
livenessProbe:
  httpGet:
    path: /app-health/myapp/livez
    port: 15021
```

The sidecar agent on port 15021 receives the probe request and forwards it to your application on port 8080 at `/healthz`. This bypasses mTLS entirely.

You can see the rewritten probes by looking at the actual pod spec (not the deployment spec):

```bash
kubectl get pod <pod-name> -o yaml | grep -A10 "livenessProbe"
```

## Configuring Health Checks for Your Application

For HTTP-based health checks, just define them normally and Istio handles the rest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-service
  template:
    metadata:
      labels:
        app: web-service
    spec:
      containers:
        - name: web-service
          image: myregistry/web-service:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 2
            failureThreshold: 30
```

## TCP Health Checks

TCP probes also work with Istio, but they are less affected by the sidecar because they just check if a port is accepting connections:

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
```

With the sidecar present, TCP probes to your application port will succeed as soon as Envoy starts listening on that port. This means the probe might pass even if your application is not ready, because Envoy accepts the connection. For this reason, HTTP probes or gRPC probes are preferred over TCP probes in an Istio mesh.

## Exec Health Checks

Exec probes run a command inside the container and are not affected by the Istio sidecar at all. They bypass the network stack entirely:

```yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - "curl -f http://localhost:8080/healthz || exit 1"
  initialDelaySeconds: 10
  periodSeconds: 10
```

The downside of exec probes is that they create a new process for every check, which uses more resources than HTTP probes.

## Controlling Probe Rewriting

You can control probe rewriting at different levels:

**Per-pod annotation:**
```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "true"
```

**Globally in the mesh config:**
```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

To disable probe rewriting for a specific pod (useful for debugging):
```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

## Sidecar Readiness

The sidecar itself has a health endpoint. You can check if the sidecar is ready:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -s localhost:15021/healthz/ready
```

This returns HTTP 200 when the proxy is ready to handle traffic. Istio uses this internally, but you can also use it in custom scripts.

## Startup Ordering with holdApplicationUntilProxyStarts

One of the most common issues is the application starting before the sidecar is ready. If your app tries to make outbound calls during startup, they fail because the proxy is not ready yet.

Fix this with `holdApplicationUntilProxyStarts`:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

Or globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

This makes the sidecar container a regular (non-init) container that blocks the application container from starting until the proxy is ready.

## Health Check Ports and Protocol

If your application exposes the health endpoint on a different port than the main service port, make sure to specify it correctly:

```yaml
containers:
  - name: web-service
    ports:
      - name: http
        containerPort: 8080
      - name: health
        containerPort: 8081
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8081
    readinessProbe:
      httpGet:
        path: /readyz
        port: 8081
```

Istio's probe rewriting handles this correctly. The rewritten probe still targets port 15021 on the sidecar agent, which knows to forward to port 8081 on your container.

## Verifying Health Check Configuration

Check the current health check status:

```bash
# See probe configuration in the pod spec
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].livenessProbe}' | python3 -m json.tool

# Check probe events
kubectl describe pod <pod-name> | grep -A5 "Events"

# See the actual rewritten probes
kubectl get pod <pod-name> -o yaml | grep -B2 -A15 "livenessProbe"
```

## Debugging Failed Health Checks

If probes are failing:

1. Check if the sidecar is running: `kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].name}'`

2. Test the health endpoint directly from inside the container:
```bash
kubectl exec -it <pod-name> -c web-service -- curl -v http://localhost:8080/healthz
```

3. Test through the sidecar agent:
```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -v http://localhost:15021/app-health/web-service/livez
```

4. Check the sidecar agent logs:
```bash
kubectl logs <pod-name> -c istio-proxy | grep -i "probe"
```

Health checks with Istio work well once you understand the probe rewriting mechanism. The key is to define your probes normally, let Istio handle the rewriting, and use `holdApplicationUntilProxyStarts` to avoid startup race conditions. If probes are failing unexpectedly, always check the rewritten probe configuration in the actual pod spec first.
