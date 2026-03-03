# How to Configure Envoy Proxy Connection Draining

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Connection Draining, Kubernetes, Deployment

Description: How to configure Envoy proxy connection draining in Istio to handle graceful pod termination and zero-downtime deployments.

---

Connection draining is the process of gracefully closing existing connections before a pod shuts down. Without proper draining, active requests get terminated mid-flight when a pod is removed during a deployment or scale-down event. This causes HTTP 503 errors, broken connections, and unhappy users. Getting connection draining right in Istio requires understanding how both Kubernetes and Envoy handle pod termination.

## The Pod Termination Sequence

When Kubernetes decides to terminate a pod (during a rolling update, scale-down, or node drain), the following happens:

1. The pod is removed from the Service endpoints
2. The pod receives a SIGTERM signal
3. The preStop hook runs (if configured)
4. The pod has `terminationGracePeriodSeconds` to shut down before SIGKILL

The problem is that step 1 and step 2 happen concurrently. The pod starts shutting down before all load balancers and sidecars have been updated to stop sending traffic to it. During this window, new requests can still arrive at the terminating pod.

## How Envoy Handles Draining

When the Istio sidecar receives SIGTERM, the pilot-agent process tells Envoy to start draining. During the drain period:

1. Envoy stops accepting new connections on its listeners
2. Existing connections continue to be served
3. For HTTP/1.1, Envoy adds `Connection: close` headers to responses
4. For HTTP/2, Envoy sends GOAWAY frames
5. After the drain duration, remaining connections are closed

## Configuring Drain Duration

The drain duration controls how long Envoy waits for existing connections to complete before closing them:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      drainDuration: 45s
      parentShutdownDuration: 50s
      terminationDrainDuration: 30s
```

Here is what each setting does:

- `drainDuration` - How long Envoy drains listeners after receiving SIGTERM (default 45s)
- `parentShutdownDuration` - How long pilot-agent waits before shutting down Envoy (default 60s)
- `terminationDrainDuration` - How long to drain connections when the pod's endpoint is removed (default 5s)

The `terminationDrainDuration` is particularly important. It controls the drain period that happens when the pod is removed from the service endpoints but before SIGTERM is received.

Per-pod configuration:

```yaml
annotations:
  proxy.istio.io/config: |
    drainDuration: 45s
    parentShutdownDuration: 50s
    terminationDrainDuration: 30s
```

## Aligning with Kubernetes terminationGracePeriodSeconds

Your Kubernetes `terminationGracePeriodSeconds` must be long enough to accommodate the Envoy drain period plus any preStop hook time:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The timeline should be:

```text
SIGTERM received (t=0)
  -> preStop hook runs (t=0 to t=5)
  -> Envoy starts draining (t=0 to t=45)
  -> Envoy shuts down (t=50)
  -> SIGKILL if not stopped (t=60)
```

Make sure `terminationGracePeriodSeconds > parentShutdownDuration`.

## Handling the Race Condition

The race condition between endpoint removal and SIGTERM is the main source of connection errors during deployments. There are two strategies to handle it:

**Strategy 1: preStop sleep**

Add a preStop hook that delays the shutdown long enough for endpoint updates to propagate:

```yaml
containers:
- name: my-app
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 10"]
```

This gives the Kubernetes control plane and all Envoy sidecars time to remove the pod from their routing tables before the pod actually starts shutting down.

**Strategy 2: EXIT_ON_ZERO_ACTIVE_CONNECTIONS**

Istio supports an environment variable that makes Envoy wait until all active connections are done before exiting:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
```

With this enabled, Envoy will not exit during the drain period until all active connections have completed, up to the `terminationGracePeriodSeconds` limit.

## Configuring for Long-Running Connections

WebSocket connections and gRPC streams can run for hours or days. The default drain duration is not enough for these:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 300s
          parentShutdownDuration: 310s
    spec:
      terminationGracePeriodSeconds: 330
```

For very long-lived connections, you might need to coordinate at the application level. Have the application detect the drain signal and start closing connections gracefully.

## Testing Connection Draining

You can test if draining works by running a load test during a rolling update:

```bash
# Start a load test
kubectl run loadtest --image=fortio/fortio --restart=Never -- \
  load -c 10 -qps 100 -t 120s http://my-service:8080/api

# In another terminal, trigger a rolling update
kubectl rollout restart deployment my-service

# Watch for errors
kubectl logs loadtest
```

If draining is configured correctly, you should see zero or near-zero errors during the rollout.

## Monitoring Drain Behavior

Check active connections during a drain:

```bash
kubectl exec <terminating-pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "cx_active\|downstream_cx_active"
```

Watch the drain state:

```bash
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/drain_listeners
```

Check pilot-agent drain logs:

```bash
kubectl logs <terminating-pod> -c istio-proxy | grep -i drain
```

## PodDisruptionBudget

Connection draining alone is not enough for zero-downtime deployments. Combine it with PodDisruptionBudgets:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-service
```

This ensures that Kubernetes never terminates more than a certain number of pods simultaneously, giving the drain process time to complete on each pod.

## Rolling Update Configuration

Configure your deployment strategy to work with draining:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
```

Setting `maxUnavailable: 0` ensures the old pod is not removed until the new one is ready. This, combined with proper drain configuration, gives you truly zero-downtime deployments.

Connection draining is one of those operational details that separates a test cluster from a production cluster. The default Istio settings work for most cases, but if you have long-lived connections or strict zero-downtime requirements, spending time to tune the drain configuration and preStop hooks pays off. Always test with realistic load during rollouts to confirm your settings work.
