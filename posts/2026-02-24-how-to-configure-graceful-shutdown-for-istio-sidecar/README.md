# How to Configure Graceful Shutdown for Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Graceful Shutdown, Kubernetes, Sidecar, Envoy

Description: Configure Istio sidecar proxy for graceful shutdown to prevent dropped connections and failed requests during pod termination.

---

When Kubernetes terminates a pod, the Istio sidecar needs to shut down gracefully alongside the application container. If the sidecar shuts down before the application finishes processing requests, clients get connection reset errors. If the application shuts down while the sidecar is still accepting new connections, those new requests fail because there's nobody to handle them. Getting the shutdown sequence right is one of the trickier parts of running Istio in production.

## The Pod Termination Sequence

To configure graceful shutdown properly, you need to understand what happens when Kubernetes decides to terminate a pod:

1. Kubernetes sends SIGTERM to all containers in the pod simultaneously
2. The pod is removed from Service endpoints (but this propagation takes time)
3. PreStop hooks run (if configured)
4. Containers have `terminationGracePeriodSeconds` to finish (default: 30s)
5. If still running, Kubernetes sends SIGKILL

The problem with Istio is step 1. Both the application and the sidecar get SIGTERM at the same time. The sidecar starts draining connections while the application might still be trying to process requests that arrived just before the shutdown started.

## Configuring Termination Drain Duration

The most important setting for graceful shutdown is the termination drain duration. This tells Envoy how long to wait for existing connections to complete before shutting down:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 20s
```

You can also set this per-pod using annotations:

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
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-app
        image: my-app:latest
```

The `terminationDrainDuration` should always be less than `terminationGracePeriodSeconds`. If the drain duration is 20 seconds and the grace period is 30 seconds, Envoy has 20 seconds to drain and then Kubernetes waits up to 10 more seconds before force-killing everything.

## Adding a PreStop Hook to the Sidecar

A preStop hook delays the sidecar shutdown, giving the application time to stop accepting new requests and finish processing existing ones:

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
          terminationDrainDuration: 15s
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: my-app
        image: my-app:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The 5-second sleep in the application's preStop hook gives the Kubernetes endpoints controller time to remove the pod from service endpoints. This prevents new traffic from being routed to a pod that's shutting down.

## Global Mesh Configuration for Graceful Shutdown

You can configure shutdown behavior globally through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 15s
      holdApplicationUntilProxyStarts: true
  values:
    global:
      proxy:
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - "sleep 5"
```

The `holdApplicationUntilProxyStarts` setting is equally important for startup. It prevents the application container from starting before the sidecar is ready, which avoids connection failures during pod initialization.

## Handling the Shutdown Race Condition

The biggest challenge is the race condition between endpoint removal and traffic delivery. Here's what can go wrong:

1. Pod receives SIGTERM
2. Pod is still in the endpoints list for a few seconds
3. New request arrives at the pod
4. Sidecar accepts the request
5. Application has already stopped listening
6. Request fails with a 503 error

To prevent this, you need a delay between when the pod starts shutting down and when the application actually stops:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 20s
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: web-server
        image: web-server:latest
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                # Stop accepting new connections
                touch /tmp/shutdown
                # Wait for in-flight requests
                sleep 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

The application should check for the `/tmp/shutdown` file and stop accepting new connections when it exists. The readiness probe will also start failing, which helps Kubernetes remove the pod from endpoints faster.

## Verifying Graceful Shutdown

Test your shutdown configuration by sending a continuous stream of requests while terminating pods:

```bash
# In one terminal, send continuous requests
while true; do
  curl -s -o /dev/null -w "%{http_code}\n" http://my-app.default.svc.cluster.local/health
  sleep 0.1
done

# In another terminal, delete a pod
kubectl delete pod my-app-xxxx -n default
```

If you see any 503 or 502 responses during the pod deletion, your shutdown configuration needs adjustment. Increase the preStop sleep duration or the termination drain duration.

You can also watch the sidecar logs during shutdown:

```bash
# Watch the proxy logs during termination
kubectl logs my-app-xxxx -c istio-proxy -f
```

Look for messages like:

- `drain listener` - Envoy is starting to drain connections
- `closing connections` - Active connections are being closed
- `all connections drained` - Drain completed successfully

## Tuning for Different Workload Types

Different applications need different shutdown configurations:

**HTTP APIs with quick requests:**
```yaml
terminationGracePeriodSeconds: 30
# annotation
proxy.istio.io/config: |
  terminationDrainDuration: 10s
# preStop sleep: 5s
```

**WebSocket servers with long-lived connections:**
```yaml
terminationGracePeriodSeconds: 120
# annotation
proxy.istio.io/config: |
  terminationDrainDuration: 90s
# preStop sleep: 5s
```

**gRPC streaming services:**
```yaml
terminationGracePeriodSeconds: 60
# annotation
proxy.istio.io/config: |
  terminationDrainDuration: 45s
# preStop sleep: 5s
```

The common pattern is: preStop sleep should be 3-5 seconds (just enough for endpoint removal), and the drain duration should leave enough room for your longest reasonable request to complete.

## Common Pitfalls

A few things that catch people off guard:

1. Setting `terminationDrainDuration` longer than `terminationGracePeriodSeconds`. Kubernetes will SIGKILL the container before the drain completes.

2. Forgetting that the preStop hook time counts against the grace period. If your grace period is 30 seconds and your preStop sleeps for 25 seconds, the drain only has 5 seconds.

3. Not testing with actual traffic. A configuration that looks correct on paper can still drop connections under load because of timing differences between the control plane and data plane.

4. Using the same configuration for all services. A background job processor and a real-time API server have very different shutdown requirements.

Getting graceful shutdown right takes some iteration. Start with conservative values (longer timeouts), verify with real traffic tests, then tighten things up once you understand your workload's actual behavior.
