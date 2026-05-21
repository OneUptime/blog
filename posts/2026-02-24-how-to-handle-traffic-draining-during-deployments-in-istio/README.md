# How to Handle Traffic Draining During Deployments in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deployment, Traffic Draining, Zero Downtime, Kubernetes, Service Mesh

Description: Configure proper traffic draining in Istio during deployments to achieve zero-downtime releases by handling in-flight requests and connection termination gracefully.

---

When you deploy a new version of a service, the old pods need to stop accepting new connections and finish processing existing requests before shutting down. This is traffic draining, and getting it wrong means dropped requests, broken connections, and frustrated users. With Istio in the picture, there are additional layers to consider because the Envoy sidecar proxy also needs to drain properly.

Kubernetes already has some draining built in through pod termination, but Istio adds complexity because the sidecar proxy has its own lifecycle. If the sidecar shuts down before the application finishes processing a request, the response never makes it back to the client.

## The Pod Termination Sequence

When Kubernetes terminates a pod, here is what happens in order:

1. Pod is marked as Terminating
2. Kubelet starts the pod shutdown flow and runs PreStop hooks
3. SIGTERM is sent to the containers after their PreStop hooks complete
4. At the same time, the control plane updates EndpointSlices so terminating endpoints are marked not ready
5. Containers have `terminationGracePeriodSeconds` to shut down
6. SIGKILL is sent if containers are still running

The problem is that endpoint updates and container shutdown happen concurrently. The Service endpoint update takes time to propagate, so new requests might still arrive after the pod starts terminating. The Envoy sidecar in other pods also needs time to update its endpoint list.

## Configuring terminationGracePeriodSeconds

Set a generous grace period to give in-flight requests time to complete:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        ports:
        - containerPort: 8080
```

60 seconds is a reasonable default. If your service handles long-running requests (file uploads, report generation), increase it accordingly.

## Adding a PreStop Hook

A PreStop hook gives time for the endpoint update to propagate before the application starts shutting down:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
        ports:
        - containerPort: 8080
```

The 10-second sleep gives Kubernetes and Istio time to mark the pod's endpoints as not ready and propagate that change before the application receives SIGTERM. During those 10 seconds, Envoy proxies in other pods have time to stop sending new requests to this pod.

## Istio Sidecar Drain Duration

Istio's Envoy sidecar has its own drain settings. Configure the drain duration in the Istio mesh config or through pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        proxy.istio.io/config: |
          drainDuration: 45s
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

- `drainDuration`: How long Envoy waits for active connections to complete during hot restart (live update of proxy config)
- `terminationDrainDuration`: How long Envoy waits during pod termination before forcefully closing connections

Set `terminationDrainDuration` to be less than `terminationGracePeriodSeconds` minus the preStop sleep time. In this example: 60 (grace) - 10 (preStop) = 50 seconds available, and we set drain to 30.

## The EXIT_ON_ZERO_ACTIVE_CONNECTIONS Setting

Istio 1.12+ supports `EXIT_ON_ZERO_ACTIVE_CONNECTIONS`, which lets the sidecar exit early when active connections reach zero during draining:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

With this setting, the Envoy sidecar monitors active connections during termination and exits when the number of active connections becomes zero, rather than always waiting for the full drain duration. This means pods shut down faster when there is no active traffic, while still allowing active connections to use the configured drain window.

## Configuring SIGTERM Handling in Your Application

Your application needs to handle SIGTERM properly. When it receives SIGTERM:

1. Stop accepting new connections
2. Finish processing in-flight requests
3. Close database connections and flush buffers
4. Exit cleanly

Here is an example in Go:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server := &http.Server{
        Addr:    ":8080",
        Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
            _, _ = w.Write([]byte("ok"))
        }),
    }

    // Start server in a goroutine
    go func() {
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for SIGTERM
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    log.Println("Shutting down server...")

    // Give in-flight requests 30 seconds to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced shutdown: %v", err)
    }

    log.Println("Server exited cleanly")
}
```

## Rolling Update Strategy

Configure the Deployment's rolling update strategy to control how many pods are replaced at a time:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: my-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-service
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

`maxSurge: 1` means one new pod is created before an old one is terminated. `maxUnavailable: 0` means all old pods must remain available until the new pod is ready. Combined with the readiness probe, this ensures capacity is maintained throughout the deployment.

## Using Istio for Blue-Green Draining

For zero-downtime deployments, use Istio to shift traffic between versions:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service
  subsets:
  - name: blue
    labels:
      version: blue
  - name: green
    labels:
      version: green
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: blue
      weight: 100
    - destination:
        host: my-service
        subset: green
      weight: 0
```

During deployment:

1. Deploy the new version as "green"
2. Shift traffic gradually: 90/10, then 50/50, then 0/100
3. Wait for all in-flight requests on "blue" to complete
4. Scale down "blue"

```bash
# Shift traffic to green

kubectl patch virtualservice my-service -n production --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 0},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 100}
  ]'

# Wait for in-flight requests to complete
sleep 60

# Scale down blue
kubectl scale deployment my-service-blue --replicas=0 -n production
```

## Monitoring During Draining

Watch for dropped connections during deployments:

```bash
# Monitor connection destroys during deployment
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_cx_destroy"

# Check active connections
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_cx_active"
```

Track 5xx errors in Prometheus during deployments:

```text
sum(rate(istio_requests_total{destination_service="my-service.production.svc.cluster.local",response_code=~"5.*"}[1m]))
```

If you see error spikes during deployments, your drain timing needs adjustment. Either increase the preStop sleep, the terminationGracePeriodSeconds, or the drain duration.

## PodDisruptionBudget

Add a PodDisruptionBudget to prevent too many pods from being disrupted simultaneously during voluntary disruptions (node drains, cluster upgrades):

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: my-service
```

This ensures at least 3 pods of my-service are always available, even during node maintenance.

## Summary

Traffic draining during deployments in Istio requires coordination between Kubernetes pod lifecycle, application SIGTERM handling, and Envoy sidecar draining. Use a preStop hook (10-second sleep) to allow endpoint propagation. Set terminationGracePeriodSeconds high enough to cover the preStop hook plus application drain time. Configure Istio's terminationDrainDuration and consider EXIT_ON_ZERO_ACTIVE_CONNECTIONS for smarter sidecar shutdown. Use rolling updates with maxUnavailable: 0 and readiness probes to maintain capacity. For maximum control, use Istio VirtualService traffic shifting for blue-green deployments with explicit draining windows.
