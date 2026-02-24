# How to Configure Data Plane Draining

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Draining, Envoy, Kubernetes, Graceful Shutdown

Description: A hands-on guide to configuring connection draining in Istio's data plane to ensure zero-downtime deployments and clean shutdowns.

---

Connection draining is what keeps your users from seeing errors during deployments. When a pod is shutting down, you want it to finish handling existing requests before it disappears. Without proper draining configuration, active requests get dropped and your users see 503 errors or broken connections. Istio gives you several knobs to control how draining works.

## How Pod Shutdown Works in Kubernetes with Istio

When Kubernetes decides to terminate a pod (during a deployment rollout, scaling down, or node drain), here is what happens:

1. The pod is marked as Terminating
2. The pod's IP is removed from the Service endpoints
3. Kubernetes sends SIGTERM to all containers in the pod
4. A grace period starts (default 30 seconds)
5. If containers are still running after the grace period, they receive SIGKILL

With Istio, the `istio-proxy` container needs to coordinate with your application container. If the proxy shuts down before the app finishes handling requests, connections get broken.

## Configuring the Termination Drain Duration

The main setting for controlling how long the sidecar waits before shutting down is `terminationDrainDuration`. This tells the Envoy proxy how long to drain connections after receiving SIGTERM.

You can set this globally in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 20s
```

Or per-pod using an annotation:

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
          terminationDrainDuration: 20s
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

During the drain period, Envoy:
- Stops accepting new connections on the inbound listener
- Allows existing connections and in-flight requests to complete
- Returns 503 for any new requests that somehow still arrive
- Shuts down after the drain period expires or all connections close (whichever comes first)

## Aligning with Kubernetes Grace Period

Your drain duration must be shorter than the pod's `terminationGracePeriodSeconds`. If the Kubernetes grace period expires first, all containers get killed immediately with SIGKILL.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
```

A good rule of thumb: set `terminationGracePeriodSeconds` to at least 10 seconds more than your `terminationDrainDuration`. This gives the proxy time to finish draining before Kubernetes forcefully kills it.

For example:
- `terminationGracePeriodSeconds: 45`
- `terminationDrainDuration: 30s`

This gives the proxy 30 seconds to drain, with a 15-second buffer before the hard kill.

## Handling the Endpoint Propagation Delay

There is a tricky timing issue. When a pod starts terminating, Kubernetes removes it from the Service endpoints. But that endpoint update takes time to propagate to all the other Envoy proxies in the mesh. During this propagation window (usually a few seconds), other proxies may still send traffic to the dying pod.

To handle this, add a `preStop` hook that gives time for the endpoint removal to propagate before your application starts shutting down:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "5"]
```

The 5-second sleep in preStop gives other proxies time to learn that this pod is going away. After that, your application can start its own graceful shutdown.

## Configuring EXIT_ON_ZERO_ACTIVE_CONNECTIONS

By default, the Envoy sidecar waits for the entire drain duration even if there are no active connections. Starting with Istio 1.12, you can configure it to exit immediately when there are zero active connections:

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
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
          terminationDrainDuration: 30s
```

With this setting, if all connections drain in 5 seconds, the proxy exits after 5 seconds instead of waiting the full 30. This speeds up deployments significantly because pods terminate faster.

## Handling Long-Lived Connections

If your application uses long-lived connections (WebSocket, gRPC streaming, long polling), draining gets more complicated. These connections can last for minutes or hours, and you probably do not want to set a drain duration that long.

For gRPC, Envoy can send GOAWAY frames to signal clients to reconnect:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-grpc-service
spec:
  host: my-grpc-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
```

For WebSocket connections, you need to handle reconnection on the client side. The server-side proxy will close the WebSocket after the drain period.

Set a reasonable drain duration and make sure clients handle reconnection gracefully:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 60s
    spec:
      terminationGracePeriodSeconds: 90
```

## Testing Draining Behavior

You should test your draining configuration before relying on it in production. Here is a simple test:

1. Deploy a test application that logs when requests start and finish
2. Send a slow request (one that takes several seconds to complete)
3. While the request is in flight, trigger a pod restart
4. Verify the request completes successfully

```bash
# Start a deployment
kubectl apply -f my-app.yaml

# In one terminal, send a slow request
kubectl exec test-pod -- curl -v http://my-app:8080/slow-endpoint

# In another terminal, restart the deployment
kubectl rollout restart deployment my-app

# Check if the slow request completed or got interrupted
```

You can also watch the Envoy drain logs:

```bash
kubectl logs my-app-xyz -c istio-proxy --follow
```

During draining, you should see log messages about the drain process starting and connections being closed.

## Monitoring Draining

Set up metrics to track whether draining is working correctly. If you are seeing connection resets during deployments, draining is not configured properly.

Watch for these patterns:

```promql
# Connection resets during deployment windows
rate(istio_requests_total{response_code="503", response_flags="UC"}[5m])
```

The `UC` response flag means "upstream connection termination," which is what you see when a connection gets killed during shutdown without proper draining.

```promql
# Also watch for downstream connection termination
rate(istio_requests_total{response_flags="DC"}[5m])
```

## Common Draining Problems

**Drain duration too short**: If your application takes 10 seconds to process a request but your drain duration is 5 seconds, those requests will be interrupted. Set the drain duration to be at least as long as your longest normal request.

**No preStop hook**: Without the sleep in preStop, other proxies may keep sending traffic to the draining pod because endpoint removal has not propagated yet.

**Grace period too short**: If `terminationGracePeriodSeconds` is shorter than your drain duration, Kubernetes kills everything before the drain completes.

**Application ignoring SIGTERM**: If your application does not handle SIGTERM, it will just keep running until it gets SIGKILL. Make sure your application has a shutdown handler.

Proper draining configuration is one of those things that seems minor but makes a real difference in production reliability. Getting the timing right between the preStop hook, the drain duration, and the Kubernetes grace period ensures your users never see errors during routine deployments.
