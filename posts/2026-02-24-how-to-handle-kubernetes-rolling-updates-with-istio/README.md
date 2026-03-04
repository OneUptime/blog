# How to Handle Kubernetes Rolling Updates with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Rolling Updates, Deployment, Zero Downtime

Description: How to handle Kubernetes rolling updates when running Istio, including connection draining, startup probes, and avoiding dropped requests during deployments.

---

Rolling updates are the default deployment strategy in Kubernetes, but adding Istio to the mix introduces complications. The Envoy sidecar needs to be ready before your application can receive traffic, old pods need time to drain connections before terminating, and the control plane needs to update its endpoint lists. If any of these steps go wrong, you get dropped requests during deployments.

This guide covers how to configure rolling updates that work smoothly with Istio.

## The Problem with Default Rolling Updates

With a default Kubernetes rolling update, here is what can go wrong:

1. A new pod starts, but the sidecar is not ready yet. Traffic gets routed to the pod and fails.
2. An old pod receives a SIGTERM but still has active connections. The pod terminates, dropping those connections.
3. The Kubernetes endpoints update propagates, but Envoy's endpoint list has not caught up yet. Traffic goes to a terminated pod.

Each of these issues requires a specific solution.

## Holding Traffic Until the Proxy Is Ready

Istio has a configuration option that prevents application containers from starting until the sidecar is ready:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Or set it per-deployment with an annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

This ensures that your application does not start accepting traffic before the Envoy proxy is ready to handle it.

## Configuring Proper Readiness Probes

Kubernetes uses readiness probes to determine when a pod can receive traffic. With Istio, the readiness probe traffic also flows through the sidecar. Make sure your readiness probes are configured correctly:

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
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 30
```

The startup probe gives your application time to initialize without the readiness probe marking it as failed. This is especially important with Istio because the sidecar adds a few seconds to the startup time.

## Graceful Shutdown and Connection Draining

When Kubernetes sends a SIGTERM to a pod during a rolling update, the Envoy sidecar needs time to drain existing connections. Configure this properly:

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
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

The `preStop` hook adds a 15-second delay before the container starts shutting down. During this time:

1. Kubernetes removes the pod from the Service endpoints
2. The endpoint update propagates to kube-proxy and Envoy
3. New requests stop being sent to this pod
4. After the sleep, the application starts its graceful shutdown

Without this delay, there is a window where the pod is shutting down but still receiving new requests.

## Rolling Update Strategy Configuration

Tune the rolling update parameters to control how many pods are updated simultaneously:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Setting `maxUnavailable: 0` ensures that no pods are removed until their replacements are ready. This is the safest option for zero-downtime deployments. The tradeoff is that updates take longer because you always need at least the full replica count running.

## Handling Long-Lived Connections

If your application uses WebSockets, gRPC streaming, or other long-lived connections, you need to handle them specifically during rolling updates.

Configure the Envoy drain duration:

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
          drainDuration: 45s
          terminationDrainDuration: 45s
```

The `drainDuration` controls how long Envoy waits for existing connections to complete before forcefully closing them. Set this to a value that is long enough for your longest expected request but shorter than `terminationGracePeriodSeconds`.

## Coordinating Multiple Services

When updating services that depend on each other, coordinate the rollouts to avoid compatibility issues. Use a PodDisruptionBudget to prevent too many pods from being updated at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app
  namespace: default
spec:
  minAvailable: 80%
  selector:
    matchLabels:
      app: my-app
```

This ensures at least 80% of pods are always available during disruptions.

## Monitoring Rolling Updates

Watch the rolling update progress:

```bash
kubectl rollout status deployment/my-app -n default
```

Monitor for errors during the rollout:

```bash
kubectl get events -n default --sort-by='.lastTimestamp' --watch
```

Check Istio's endpoint sync status:

```bash
istioctl proxy-config endpoints deploy/sleep -n default | grep my-app
```

Compare the endpoint list with the actual running pods:

```bash
kubectl get pods -l app=my-app -n default -o wide
```

If the endpoint list does not match the running pods, there is a propagation delay.

## Testing Rolling Updates

Here is a script to verify zero-downtime during a rolling update:

```bash
#!/bin/bash

# Start continuous traffic in background
echo "Starting traffic generator..."
while true; do
  CODE=$(kubectl exec -n default deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" http://my-app:8080/health 2>/dev/null)
  TIMESTAMP=$(date +%H:%M:%S)
  if [ "$CODE" != "200" ]; then
    echo "$TIMESTAMP ERROR: Got $CODE"
  fi
  sleep 0.2
done &
TRAFFIC_PID=$!

# Trigger rolling update
echo "Triggering rolling update..."
kubectl set image deployment/my-app my-app=my-app:v2 -n default

# Wait for rollout to complete
kubectl rollout status deployment/my-app -n default

# Stop traffic generator
kill $TRAFFIC_PID

echo "Rolling update complete. Check output for any errors."
```

Run this and look for any ERROR lines. If you see them, you have a gap in your zero-downtime configuration.

## Rollback Strategy

If a rolling update goes wrong, roll back immediately:

```bash
kubectl rollout undo deployment/my-app -n default
```

Check the rollout history to see previous versions:

```bash
kubectl rollout history deployment/my-app -n default
```

Istio will automatically update its routing as the rollback progresses. The VirtualService and DestinationRule configurations do not need to change for a rollback since they reference Services, not specific Deployment versions (unless you are using subset routing).

## Wrapping Up

Zero-downtime rolling updates with Istio require attention to three things: making sure new pods are fully ready before receiving traffic, giving old pods time to drain connections, and accounting for endpoint propagation delays. Use `holdApplicationUntilProxyStarts`, add a preStop sleep hook, set `maxUnavailable: 0`, and always test your rollout process by running continuous traffic during deployments. The configuration is not difficult, but skipping any of these steps will result in dropped requests.
