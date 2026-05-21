# How to Configure Proxy Readiness Probe in Istio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Readiness Probe, Health Check, Kubernetes, Sidecar Proxy

Description: How to configure and customize readiness probes for the Istio sidecar proxy to ensure traffic only reaches pods that are fully ready to serve.

---

Readiness probes in Kubernetes tell the system whether a pod is ready to receive traffic. When you run Istio, there are two components that need to be ready: your application container and the sidecar proxy. If the proxy isn't ready but Kubernetes starts sending traffic, requests will fail. Getting the readiness probe configuration right prevents dropped requests during startup, rolling updates, and scaling events.

## How Istio Proxy Readiness Works

The Istio sidecar agent exposes a health endpoint on port 15021 at the `/healthz/ready` path. This endpoint returns HTTP 200 when the proxy has:

1. Received its initial configuration from the Istio control plane (istiod)
2. Reached Envoy's live state
3. Started Envoy worker threads

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

With this setting, Istio injects the sidecar at the start of the pod's container list and configures it to block the start of the other containers until the proxy is ready.

## Application Ports Configuration

You can tell the proxy readiness check which application ports Envoy should be ready to receive traffic for:

```yaml
metadata:
  annotations:
    readiness.status.sidecar.istio.io/applicationPorts: "8080,8443"
```

When this annotation is set, the proxy health check verifies that Envoy is configured and ready to receive traffic for the specified application ports. It does not replace your application's own readiness probe.

If you want to disable the application port check:

```yaml
metadata:
  annotations:
    readiness.status.sidecar.istio.io/applicationPorts: ""
```

## Rewriting Application Health Checks

Istio can rewrite your application's HTTP, TCP, and gRPC health check probes to go through the sidecar agent. This is enabled by default in Istio's built-in configuration profiles and avoids mTLS and TCP-probe issues:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    sidecarInjectorWebhook:
      rewriteAppHTTPProbe: true
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
    port: 15020
```

The sidecar agent then forwards the health check to your application on the original path and port, and returns the application's response status to the kubelet.

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

During rolling updates, the readiness probe is critical. Kubernetes uses pod readiness to decide when new pods are available and how the rollout proceeds. Depending on your rolling update settings, if your readiness probe is too aggressive, you might see:

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
  selector:
    matchLabels:
      app: my-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-api
      annotations:
        readiness.status.sidecar.istio.io/initialDelaySeconds: "1"
        readiness.status.sidecar.istio.io/periodSeconds: "5"
        readiness.status.sidecar.istio.io/failureThreshold: "10"
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: my-api
        image: my-api:1.0
        ports:
        - containerPort: 8080
```

Setting `maxUnavailable: 0` ensures Kubernetes always has enough ready pods to handle traffic. Combined with `holdApplicationUntilProxyStarts`, this gives you smooth rollouts.

## Checking the Probe Configuration

Verify what readiness probe configuration actually ended up on your pod:

```bash
kubectl get pod -l app=my-api -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].readinessProbe}' | jq .
```

This shows the actual probe configuration after the sidecar injector has processed it.

Readiness probes are a small detail that has an outsized impact on reliability. Taking the time to configure them properly means fewer dropped requests during deployments, faster scaling, and a more stable service mesh overall.
