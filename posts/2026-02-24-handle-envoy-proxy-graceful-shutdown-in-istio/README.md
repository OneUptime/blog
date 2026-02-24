# How to Handle Envoy Proxy Graceful Shutdown in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Graceful Shutdown, Kubernetes, Reliability

Description: How to configure Envoy proxy graceful shutdown in Istio to prevent request failures during pod termination and deployments.

---

Graceful shutdown is closely related to connection draining but covers the broader picture of how the entire sidecar container shuts down cleanly. A well-configured graceful shutdown ensures that no requests are dropped during deployments, scaling events, or node maintenance. Getting this wrong leads to intermittent 503 errors that are notoriously hard to debug because they only happen during state transitions.

## The Shutdown Process in Detail

When a pod is terminated, here is the detailed sequence of events:

1. Kubernetes API marks the pod as Terminating
2. The pod is removed from Service endpoints (kube-proxy/Envoy updates)
3. The kubelet sends SIGTERM to all containers in the pod
4. The preStop hooks for each container run in parallel
5. Application containers start their shutdown process
6. The istio-proxy container (pilot-agent) receives SIGTERM
7. pilot-agent sends a drain request to Envoy
8. Envoy begins draining connections
9. After drainDuration, pilot-agent sends SIGTERM to Envoy
10. After parentShutdownDuration, pilot-agent sends SIGKILL to Envoy
11. If terminationGracePeriodSeconds is exceeded, kubelet sends SIGKILL

Steps 2 and 3 happen at roughly the same time but are independent processes. This creates a race condition where new requests can arrive at the pod after it has started shutting down.

## The Istio Proxy Shutdown Sequence

The pilot-agent manages Envoy's lifecycle. When it receives SIGTERM:

```
SIGTERM -> pilot-agent
  |
  |-> POST /drain_listeners to Envoy admin (starts listener drain)
  |-> Wait for drainDuration
  |-> POST /quitquitquit to Envoy admin (graceful stop)
  |-> Wait for parentShutdownDuration - drainDuration
  |-> SIGKILL Envoy (forced stop)
```

Configure these timings:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      drainDuration: 30s
      parentShutdownDuration: 35s
```

## Solving the Common Shutdown Problems

### Problem 1: Application exits before Envoy finishes draining

If your application shuts down immediately on SIGTERM, in-flight requests from the application to other services will fail because the Envoy sidecar is still draining.

Solution: Add a preStop hook to your application container:

```yaml
containers:
- name: my-app
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 15 && kill 1"]
```

Or better, have your application handle SIGTERM gracefully by stopping accepting new work and finishing existing requests.

### Problem 2: Envoy exits before application finishes

The sidecar might shut down while the application is still processing requests. Those requests that need to call other services will fail because the sidecar is gone.

Solution: Use `EXIT_ON_ZERO_ACTIVE_CONNECTIONS`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
```

### Problem 3: New requests arrive during shutdown

Even after SIGTERM, new requests can arrive because endpoint updates have not propagated everywhere.

Solution: Combine preStop sleep with proper drain configuration:

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
              command: ["/bin/sh", "-c", "sleep 10"]
      - name: istio-proxy
        # Configured via annotations or mesh config
```

The sleep gives enough time for all Envoy sidecars in the mesh to receive the endpoint update and stop routing to this pod.

## Configuring holdApplicationUntilProxyStarts

This setting prevents the application from starting before the Envoy proxy is ready. It is primarily about startup rather than shutdown, but it is related because it ensures the proxy is always available when the application needs it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

This adds a postStart lifecycle hook that blocks the application container from starting until the Envoy proxy is ready.

## The SIGTERM Propagation Problem

In some container runtimes, SIGTERM is only sent to PID 1 in the container. If your application is not PID 1 (for example, if it is started by a shell script), it might not receive the signal.

Use `exec` form in your Dockerfile:

```dockerfile
# Good - app becomes PID 1
CMD ["./my-app"]

# Bad - shell is PID 1, app does not get SIGTERM
CMD ./my-app
```

Or use `dumb-init` or `tini` as an init process:

```dockerfile
RUN apt-get install -y tini
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./my-app"]
```

## Testing Graceful Shutdown

Create a test script that verifies zero-downtime during rolling updates:

```bash
#!/bin/bash
# Run continuous requests and count errors during rollout
kubectl run loadgen --image=curlimages/curl --restart=Never -- \
  sh -c 'while true; do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api)
    if [ "$code" != "200" ]; then
      echo "ERROR: Got $code at $(date)"
    fi
    sleep 0.1
  done'

# Watch the loadgen output
kubectl logs -f loadgen &

# Trigger a rolling update
kubectl set image deployment/my-service my-service=my-service:v2

# Wait for rollout to complete
kubectl rollout status deployment/my-service

# Clean up
kubectl delete pod loadgen
```

If you see any errors during the rollout, your shutdown configuration needs adjustment.

## Best Practices for Production

1. Set `terminationGracePeriodSeconds` to at least 45 seconds (30s drain + 15s buffer)
2. Add a preStop sleep of 5-10 seconds to handle the endpoint propagation race
3. Enable `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` for services with long-lived connections
4. Use `holdApplicationUntilProxyStarts: true` to prevent startup issues
5. Set `maxUnavailable: 0` in the rolling update strategy
6. Use PodDisruptionBudgets to limit concurrent terminations

A complete graceful shutdown configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 30s
          parentShutdownDuration: 35s
          terminationDrainDuration: 15s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 8080
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

Graceful shutdown might seem like a small detail, but it is the difference between "deployments sometimes cause errors" and "deployments are completely transparent to users." Spending time to get this right eliminates an entire class of intermittent failures that would otherwise be very hard to track down.
