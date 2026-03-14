# How to Configure Proxy Readiness Probe in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Readiness Probe, Health Check, Kubernetes, Sidecar Proxy

Description: How to configure and customize readiness probes for the Istio sidecar proxy to ensure traffic only reaches pods that are fully ready to serve.

---

Readiness probes in Kubernetes tell the system whether a pod is ready to receive traffic. When you run Istio, there are two components that need to be ready: your application container and the sidecar proxy. If the proxy isn't ready but Kubernetes starts sending traffic, requests will fail. Getting the readiness probe configuration right prevents dropped requests during startup, rolling updates, and scaling events.

## How Istio Proxy Readiness Works

The Istio sidecar proxy exposes a health endpoint on port 15021 at the `/healthz/ready` path. This endpoint returns HTTP 200 when the proxy has:

1. Connected to the Istio control plane (istiod)
2. Received its initial configuration
3. Set up all listeners and routes
4. Completed TLS certificate provisioning

The sidecar injector automatically adds a readiness probe to the `istio-proxy` container. By default, it looks like this:

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

## Customizing the Readiness Probe

You can customize the probe parameters through annotations on your pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
      annotations:
        readiness.status.sidecar.istio.io/initialDelaySeconds: "5"
        readiness.status.sidecar.istio.io/periodSeconds: "10"
        readiness.status.sidecar.istio.io/failureThreshold: "30"
    spec:
      containers:
      - name: my-api
        image: my-api:1.0
        ports:
        - containerPort: 8080
```

The available annotations are:

- `readiness.status.sidecar.istio.io/initialDelaySeconds` - how long to wait before the first check
- `readiness.status.sidecar.istio.io/periodSeconds` - how often to check
- `readiness.status.sidecar.istio.io/failureThreshold` - how many failures before marking not ready

## Application Readiness and Proxy Readiness

There is an important interaction between your application's readiness probe and the proxy's readiness probe. Kubernetes considers a pod "ready" only when ALL containers pass their readiness checks. This means:

1. If the proxy is ready but your app is not, the pod is not ready
2. If your app is ready but the proxy is not, the pod is not ready

This is actually the behavior you want. But there is a catch during startup: your application might start before the proxy is ready, and if your app tries to make outbound calls during its own readiness check, those calls will fail because the proxy isn't configured yet.

## holdApplicationUntilProxyStarts

This is one of the most useful features for avoiding startup race conditions. When enabled, the application container won't start until the proxy is ready:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

Or set it mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

With this setting, the sidecar container has a `postStart` lifecycle hook that blocks until `/healthz/ready` returns 200. The application container won't be started by the kubelet until this hook completes.

## Application Ports Configuration

You can tell the proxy readiness check to also verify that specific application ports are being listened on:

```yaml
metadata:
  annotations:
    readiness.status.sidecar.istio.io/applicationPorts: "8080,8443"
```

When this annotation is set, the proxy health check not only verifies that Envoy is configured, but also that traffic can reach the application on the specified ports. This provides a more thorough readiness signal.

If you want to disable the application port check:

```yaml
metadata:
  annotations:
    readiness.status.sidecar.istio.io/applicationPorts: ""
```

## Rewriting Application Health Checks

Istio can rewrite your application's health check probes to go through the sidecar proxy. This is enabled by default and ensures that health check traffic follows the same path as regular traffic:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    sidecar_injector:
      rewriteAppHTTPProbers: true
```

When probe rewriting is enabled, Istio changes your app's readiness probe from something like:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
```

To:

```yaml
readinessProbe:
  httpGet:
    path: /app-health/my-app/readyz
    port: 15021
```

The proxy then forwards the health check to your application on the original path and port. This means health checks go through the proxy, which validates that the entire data path is working.

## Debugging Readiness Issues

When pods are stuck in a not-ready state, start with these steps:

```bash
# Check readiness status of all containers
kubectl get pod -l app=my-api -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.containerStatuses[*]}{.name}:{.ready}{"\t"}{end}{"\n"}{end}'

# Check the proxy readiness directly
POD=$(kubectl get pod -l app=my-api -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -c istio-proxy -- curl -s localhost:15021/healthz/ready
echo $?

# Check proxy agent logs
kubectl logs $POD -c istio-proxy | grep -i "ready\|health\|error"

# Check events on the pod
kubectl describe pod $POD | grep -A 10 "Events:"
```

Common causes of readiness failures:

1. **Control plane unreachable** - The proxy can't connect to istiod. Check network policies and istiod health.
2. **Certificate provisioning delay** - mTLS certificate issuance takes time, especially if the CA is slow.
3. **Large configuration** - In meshes with many services, the initial config push can take a while.
4. **Resource starvation** - If the proxy doesn't have enough CPU or memory, it may be slow to initialize.

## Tuning for Fast Startup

If you need pods to become ready as quickly as possible:

```yaml
metadata:
  annotations:
    readiness.status.sidecar.istio.io/initialDelaySeconds: "0"
    readiness.status.sidecar.istio.io/periodSeconds: "2"
    readiness.status.sidecar.istio.io/failureThreshold: "30"
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

Setting the period to 2 seconds means Kubernetes checks readiness frequently. Combined with `holdApplicationUntilProxyStarts`, your app won't start until the proxy is ready, and once the proxy is ready, the pod will be marked ready within 2 seconds (assuming the app starts quickly too).

## Tuning for Stability

For workloads where you want to avoid flapping between ready and not-ready states:

```yaml
metadata:
  annotations:
    readiness.status.sidecar.istio.io/initialDelaySeconds: "10"
    readiness.status.sidecar.istio.io/periodSeconds: "15"
    readiness.status.sidecar.istio.io/failureThreshold: "10"
```

A higher failure threshold means the pod won't be marked not-ready until 10 consecutive failures (150 seconds with a 15-second period). This prevents brief hiccups from causing traffic shifts.

## Readiness During Rolling Updates

During rolling updates, the readiness probe is critical. Kubernetes won't terminate old pods until new pods are ready. If your readiness probe is too aggressive, you might see:

- New pods taking too long to become ready, slowing down the rollout
- Old pods being terminated before new pods are actually serving traffic
- Brief periods where no pods are ready, causing 503 errors

A balanced configuration for rolling updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      annotations:
        readiness.status.sidecar.istio.io/initialDelaySeconds: "1"
        readiness.status.sidecar.istio.io/periodSeconds: "5"
        readiness.status.sidecar.istio.io/failureThreshold: "10"
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
```

Setting `maxUnavailable: 0` ensures Kubernetes always has enough ready pods to handle traffic. Combined with `holdApplicationUntilProxyStarts`, this gives you smooth rollouts.

## Checking the Probe Configuration

Verify what readiness probe configuration actually ended up on your pod:

```bash
kubectl get pod -l app=my-api -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].readinessProbe}' | jq .
```

This shows the actual probe configuration after the sidecar injector has processed it.

Readiness probes are a small detail that has an outsized impact on reliability. Taking the time to configure them properly means fewer dropped requests during deployments, faster scaling, and a more stable service mesh overall.
