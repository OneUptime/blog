# How to Configure Connection Draining in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Draining, Graceful Shutdown, Envoy, Kubernetes

Description: Learn how to configure connection draining in Istio to ensure graceful shutdowns and zero-downtime deployments in your service mesh.

---

Connection draining is the process of gracefully shutting down a service instance by finishing in-flight requests before terminating. Without proper draining, rolling deployments and scaling events can cause failed requests, broken connections, and unhappy users. In Istio, connection draining happens at multiple levels, and getting them all aligned is critical for achieving true zero-downtime deployments.

## The Problem Without Draining

When Kubernetes terminates a pod (during a rolling update, scale-down, or node drain), the following happens by default:

1. Kubernetes sends SIGTERM to the pod's containers
2. The pod is removed from the Service's endpoints list
3. After `terminationGracePeriodSeconds` (default 30s), Kubernetes sends SIGKILL

The problem is that steps 1 and 2 happen concurrently. Other pods might still send requests to the terminating pod because the endpoint removal hasn't propagated yet. And the Envoy sidecar might shut down before the application finishes handling its last requests.

## Envoy's Drain Mechanism

Envoy has built-in drain support. When it receives a SIGTERM, it enters a "draining" state:

1. It stops accepting new connections on its listeners
2. It sends `Connection: close` headers on HTTP/1.1 responses and GOAWAY frames on HTTP/2
3. It waits for existing connections to finish
4. After the drain duration, it closes remaining connections and exits

You can control the drain duration with the `terminationDrainDuration` setting:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

Or set it per-pod with an annotation:

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
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: my-app
          image: my-app:latest
```

Important: The `terminationDrainDuration` should be less than `terminationGracePeriodSeconds`. If Kubernetes sends SIGKILL before Envoy finishes draining, you still get dropped requests.

## Aligning Termination Timing

The timing between your application shutdown, Envoy's drain, and Kubernetes' endpoint removal needs to be carefully orchestrated:

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
          terminationDrainDuration: 25s
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: my-app
          image: my-app:latest
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
          ports:
            - containerPort: 8080
```

Here's the timeline:

1. **t=0**: Kubernetes sends SIGTERM, starts removing the pod from endpoints
2. **t=0 to t=5**: The preStop hook runs (`sleep 5`), giving time for endpoint removal to propagate
3. **t=5**: The application starts its shutdown
4. **t=0**: Envoy also receives SIGTERM and starts draining for 25 seconds
5. **t=25**: Envoy closes remaining connections
6. **t=60**: Kubernetes sends SIGKILL (but ideally everything is already shut down)

The `sleep 5` preStop hook is a simple but effective trick. It gives kube-proxy and Envoy time to update their routing tables before the pod actually stops accepting requests.

## Configuring Outlier Detection for Draining

Outlier detection works alongside draining to handle unhealthy endpoints. When a pod starts draining and returns errors, outlier detection can eject it from the load balancer pool faster:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
spec:
  host: my-app.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    connectionPool:
      http:
        idleTimeout: 30s
```

If a draining pod starts returning 503 errors (which Envoy does during drain), the outlier detection kicks in and stops sending traffic to it after 3 consecutive errors.

## Connection Draining for the Ingress Gateway

The ingress gateway needs special attention because it's the entry point for external traffic. When you update the gateway or scale it down, you need to make sure external clients don't get dropped:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 120
      containers:
        - name: istio-proxy
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
```

For the gateway, you might want a longer termination grace period (120 seconds or more) because external clients may have longer-lived connections.

Also configure the gateway's drain settings:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        k8s:
          env:
            - name: TERMINATION_DRAIN_DURATION_SECONDS
              value: "60"
```

## Testing Connection Draining

You can test draining behavior by simulating a rolling update while generating traffic:

```bash
# Start generating traffic in one terminal
kubectl exec sleep-pod -- sh -c \
  'while true; do curl -s -o /dev/null -w "%{http_code}\n" http://my-app:8080/health; sleep 0.1; done'

# In another terminal, trigger a rolling update
kubectl rollout restart deployment my-app
```

Watch the output for any non-200 status codes. If you see 503s, your draining configuration needs adjustment.

You can also check Envoy's drain state:

```bash
kubectl exec my-app-pod -c istio-proxy -- \
  pilot-agent request GET server_info | grep state
```

During drain, the state changes from `LIVE` to `DRAINING`.

## Handling Long-Running Requests

Some applications process requests that take minutes (file uploads, report generation). Standard drain timeouts might not be long enough:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-generator
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 300s
    spec:
      terminationGracePeriodSeconds: 360
      containers:
        - name: report-generator
          image: report-gen:latest
```

For really long-running processes, consider using a different approach entirely, like moving the work to a background queue so that the HTTP request completes quickly.

## Monitoring Drain Behavior

Keep an eye on these metrics:

```bash
# Active connections during drain
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep downstream_cx_active

# Requests completed during drain
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep downstream_rq_completed

# Connection close count
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep downstream_cx_destroy
```

In Prometheus, you can track `envoy_server_drain_count` and `envoy_server_state` to monitor drain events across your fleet.

## Best Practices Summary

1. Always set `terminationGracePeriodSeconds` higher than `terminationDrainDuration`
2. Use a preStop hook with `sleep 5` to allow endpoint propagation
3. For gateways, use longer drain periods (60s+)
4. Enable outlier detection alongside draining for faster failure handling
5. Test your drain configuration by running traffic during rolling updates
6. Monitor for 503 errors during deployments - they indicate draining gaps

Connection draining is one of those things that seems unnecessary until your first production incident during a deployment. Getting it right means your deploys are boring, which is exactly what you want.
