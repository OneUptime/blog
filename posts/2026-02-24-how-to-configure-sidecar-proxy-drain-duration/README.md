# How to Configure Sidecar Proxy Drain Duration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar, Graceful Shutdown, Envoy

Description: A practical guide to configuring the Istio sidecar proxy drain duration to ensure graceful connection draining during pod termination and deployments.

---

When a pod shuts down in an Istio mesh, the Envoy sidecar needs time to drain its active connections before it terminates. If the drain duration is too short, clients will see connection resets and failed requests. If it's too long, deployments take forever because pods hang around waiting for the sidecar to finish draining.

Getting this balance right is critical for zero-downtime deployments. Here's how to configure drain duration properly and avoid the common pitfalls.

## What Happens During Pod Termination

To understand drain duration, you first need to know what happens when Kubernetes terminates a pod. The sequence goes like this:

1. Kubernetes sends a SIGTERM to all containers in the pod
2. Kubernetes removes the pod from Service endpoints
3. The Envoy sidecar enters drain mode and stops accepting new connections
4. Existing connections are allowed to complete until the drain period expires
5. After `terminationGracePeriodSeconds`, Kubernetes sends SIGKILL

The drain duration controls step 4. It tells Envoy how long to wait for in-flight requests to finish before closing connections.

## Checking the Current Drain Duration

You can see the current drain duration in your mesh configuration:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.values}' | jq '.global.proxy.drainDuration'
```

Or check it on a specific pod:

```bash
istioctl proxy-config bootstrap my-pod -n my-namespace | grep drain
```

The default drain duration in Istio is 45 seconds. For many workloads this is reasonable, but long-lived connections (WebSockets, gRPC streams, database connections) often need more time.

## Setting Drain Duration Globally

To change the drain duration for all sidecars in the mesh, modify the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      drainDuration: 30s
```

Apply this with:

```bash
istioctl install -f drain-config.yaml
```

After changing the global setting, restart your workloads:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Per-Pod Drain Duration

If different services need different drain durations, you can set it per pod using the `proxy.istio.io/config` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-server
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 120s
    spec:
      containers:
      - name: ws-server
        image: websocket-server:latest
```

This gives the WebSocket server's sidecar 120 seconds to drain, while other services in the mesh use whatever the global default is.

## Coordinating with terminationGracePeriodSeconds

Here's the most common mistake people make: they set a drain duration that's longer than the pod's `terminationGracePeriodSeconds`. If that happens, Kubernetes kills the pod (SIGKILL) before the sidecar finishes draining.

The rule is simple: `terminationGracePeriodSeconds` must be greater than `drainDuration`. I recommend setting it to at least drain duration plus 5 seconds to give the process time to shut down cleanly after draining:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 60s
    spec:
      terminationGracePeriodSeconds: 70
      containers:
      - name: app
        image: my-app:latest
```

## The EXIT_ON_ZERO_ACTIVE_CONNECTIONS Option

Starting with Istio 1.12, there's an environment variable you can set on the sidecar that makes it exit as soon as all active connections have been drained, rather than waiting for the full drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 120s
    spec:
      terminationGracePeriodSeconds: 130
      containers:
      - name: app
        image: my-app:latest
        env:
        - name: ISTIO_QUIT_API
          value: "true"
      - name: istio-proxy
        env:
        - name: EXIT_ON_ZERO_ACTIVE_CONNECTIONS
          value: "true"
```

Wait, you can't directly add an env var to the sidecar in the deployment spec since the sidecar is injected. Instead, use the injection template annotation approach or set it globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      drainDuration: 120s
  values:
    global:
      proxy:
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - "while [ $(netstat -plunt 2>/dev/null | grep -c 'ESTABLISHED') -gt 0 ]; do sleep 1; done"
```

The cleaner approach is to use the `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` setting through the proxy config:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 120s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      terminationGracePeriodSeconds: 130
      containers:
      - name: app
        image: my-app:latest
```

This is the best of both worlds. You set a high drain duration as a safety net, but the sidecar exits early once all connections are done.

## Drain Duration for Different Workload Types

Different types of services need different drain durations. Here are some practical guidelines:

**Short-lived HTTP APIs (REST endpoints):**
```yaml
proxy.istio.io/config: |
  drainDuration: 15s
```
Most HTTP requests complete in under a second. 15 seconds handles slow requests and retries.

**gRPC services with streaming RPCs:**
```yaml
proxy.istio.io/config: |
  drainDuration: 60s
```
gRPC streams can last minutes. Give them time to finish or gracefully close.

**WebSocket services:**
```yaml
proxy.istio.io/config: |
  drainDuration: 120s
```
WebSocket connections are often long-lived. Clients typically reconnect when the connection drops, but a longer drain gives them time to finish current operations.

**Batch processors and queue consumers:**
```yaml
proxy.istio.io/config: |
  drainDuration: 300s
```
If a job takes 5 minutes to process a message, the sidecar needs to stay alive for the full duration.

## Testing Drain Behavior

You can test that drain is working correctly by watching connections during a rolling update:

```bash
# In one terminal, generate traffic
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://my-service:8080/health; sleep 0.1; done

# In another terminal, trigger a rollout
kubectl rollout restart deployment my-service -n my-namespace
```

Watch for any non-200 status codes. If you see 503s or connection resets, your drain duration might be too short, or there could be a timing issue with endpoint removal.

You can also check the sidecar logs during termination:

```bash
kubectl logs my-pod -c istio-proxy -n my-namespace --previous | grep -i drain
```

## Dealing with the Race Condition

There's a well-known race condition in Kubernetes where traffic can arrive at a pod after it starts terminating but before all kube-proxy rules update. To handle this, add a preStop hook with a small delay to your application container:

```yaml
spec:
  containers:
  - name: app
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]
```

This 5-second sleep gives kube-proxy and other components time to update their routing rules before your pod stops accepting traffic. Combined with proper drain duration on the sidecar, this minimizes dropped connections during deployments.

## Monitoring Drain Effectiveness

Track these metrics to see if your drain configuration is working:

```promql
# 5xx responses during rollouts
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service)

# Active connections on sidecar
envoy_server_total_connections

# Connection close events
envoy_cluster_upstream_cx_destroy
```

If you see spikes in 5xx errors that correlate with deployments, drain duration is the first thing to check. Getting it right means your users never notice when you ship new code.
