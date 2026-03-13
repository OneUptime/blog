# How to Handle Rolling Updates with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rolling Updates, Kubernetes, Deployments, Zero Downtime

Description: A practical guide to handling rolling updates with Istio covering zero-downtime deployments, connection draining, traffic shifting, and avoiding common update pitfalls.

---

Rolling updates in Kubernetes are supposed to be seamless: old pods get replaced by new pods one at a time, and users never notice. But when Istio sidecars are involved, the update process has additional moving parts. The sidecar needs to drain connections, the control plane needs to update endpoints, and the load balancers need to stop sending traffic to terminating pods. Getting any of these wrong results in dropped requests during updates.

This guide covers how to handle rolling updates properly in an Istio mesh so that deployments are truly zero-downtime.

## The Rolling Update Lifecycle with Istio

When Kubernetes performs a rolling update on a deployment in the mesh, here is what happens for each pod:

1. A new pod starts (with the sidecar automatically injected)
2. The sidecar connects to istiod and receives its configuration
3. The sidecar reports ready
4. The application container passes its readiness probe
5. The pod is added to the Service's endpoints
6. istiod pushes the updated endpoint list to all sidecars in the mesh
7. An old pod is selected for termination
8. Kubernetes removes the old pod from the Service's endpoints
9. istiod pushes the updated endpoint list (without the old pod)
10. Kubernetes sends SIGTERM to the old pod
11. The sidecar drains in-flight connections
12. The pod terminates

The tricky parts are steps 6, 9, and 11. There are timing windows where traffic can still reach a terminating pod.

## Configuring Zero-Downtime Rolling Updates

### Deployment Strategy

Configure your deployment with a proper rolling update strategy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: my-service
          image: my-service:v2
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - sleep 10
```

Key settings:

- **maxUnavailable: 0**: Kubernetes creates a new pod before killing an old one. You always have at least the desired number of running pods.
- **maxSurge: 1**: Only one extra pod is created during the rollout. This limits resource usage during updates.
- **terminationGracePeriodSeconds: 60**: Gives the pod (and sidecar) 60 seconds to drain before force kill.
- **preStop hook with sleep 10**: This delay is critical. It gives Kubernetes and Istio time to remove the pod from endpoints and propagate the change before the application starts shutting down.

### Sidecar Drain Configuration

Configure the Envoy sidecar to drain connections properly during termination:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

Or per-pod:

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
          terminationDrainDuration: 30s
```

Make sure the timing works:

```text
terminationGracePeriodSeconds (60s) > preStop sleep (10s) + terminationDrainDuration (30s)
```

The extra 20 seconds of buffer ensures the sidecar has time to drain even if things run slightly over.

### Hold Application Until Proxy Starts

During rollouts, new pods start with both the app and sidecar containers. If the app tries to make requests before the sidecar is ready, those requests fail:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

This ensures the sidecar is fully connected to istiod and has its routes before the application container starts.

## Traffic-Aware Rolling Updates

For more control over how traffic shifts during an update, combine the rolling update with Istio traffic management.

### Canary Rollout with VirtualService

Instead of relying on Kubernetes round-robin to gradually shift traffic, use Istio to control exactly how much traffic goes to the new version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 90
        - destination:
            host: my-service
            subset: v2
          weight: 10
```

Start with 10% traffic to v2. Monitor error rates and latency. If everything looks good, increase the weight:

```bash
# Gradually shift traffic
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 50
        - destination:
            host: my-service
            subset: v2
          weight: 50
EOF
```

When you are confident, shift 100% to v2 and scale down v1.

### Using Istio for Automatic Rollback

Configure outlier detection to automatically stop sending traffic to bad pods during a rollout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

If the new version starts returning 5xx errors, Istio ejects those pods from the load balancing pool within seconds. This is faster than a Kubernetes rollback, which takes time to scale down new pods and scale up old ones.

## Handling Long-Lived Connections

Rolling updates are more complex when services maintain long-lived connections (WebSockets, gRPC streams, Server-Sent Events).

The sidecar drain duration only applies to HTTP/1.1 connections with keep-alive. For long-lived connections, you need to signal to clients that they should reconnect:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 100
```

`maxRequestsPerConnection: 100` forces Envoy to close connections after 100 requests and open new ones. This ensures connections are periodically rebalanced across pods, including new pods that just started.

For gRPC specifically, configure max connection age on the server side:

```go
// Go gRPC server with connection age
server := grpc.NewServer(
    grpc.KeepaliveParams(keepalive.ServerParameters{
        MaxConnectionAge:      30 * time.Minute,
        MaxConnectionAgeGrace: 10 * time.Second,
    }),
)
```

## Monitoring Rolling Updates

Watch the rollout progress and check for errors:

```bash
# Watch the rollout
kubectl rollout status deployment/my-service

# Watch pod transitions
kubectl get pods -l app=my-service -w

# Check for errors during the rollout
kubectl logs -l app=my-service -c istio-proxy --tail=20 | grep -E "error|reset|refused"
```

Monitor Istio metrics during the rollout:

```bash
# Check for 5xx errors
kubectl exec deploy/istio-ingressgateway -n istio-system -c istio-proxy -- \
  pilot-agent request GET stats | grep "my-service.*5xx"
```

Set up a Grafana dashboard or Prometheus query to watch error rates in real time:

```text
# Prometheus query for error rate during rollout
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local",response_code=~"5.."}[1m])) /
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local"}[1m]))
```

## Rolling Back

If things go wrong, roll back quickly:

```bash
# Kubernetes rollback
kubectl rollout undo deployment/my-service

# If using VirtualService-based canary, shift traffic back
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 100
EOF
```

The VirtualService-based rollback is instant (traffic shifts immediately). The Kubernetes rollback takes time for new pods to start and old pods to terminate.

## Rolling Update Checklist

Before performing a rolling update in an Istio mesh:

1. Verify `maxUnavailable: 0` in your deployment strategy
2. Verify `terminationGracePeriodSeconds` is longer than drain duration + preStop delay
3. Verify readiness probes are configured and working
4. Verify `holdApplicationUntilProxyStarts` is enabled
5. Verify sidecar `terminationDrainDuration` is set
6. Consider adding a preStop hook with a sleep delay
7. Set up outlier detection for automatic bad-pod ejection
8. Monitor error rates during the rollout
9. Have a rollback plan ready (either kubectl rollout undo or VirtualService shift)

## Summary

Rolling updates with Istio require coordination between Kubernetes pod lifecycle management and Istio's traffic management. The key ingredients for zero-downtime updates are: maxUnavailable of 0, proper termination drain duration, a preStop sleep to allow endpoint propagation, holdApplicationUntilProxyStarts for clean pod startup, and outlier detection for automatic bad-pod ejection. For more control, layer Istio VirtualService traffic splitting on top of the rolling update to do proper canary deployments with instant rollback capability.
