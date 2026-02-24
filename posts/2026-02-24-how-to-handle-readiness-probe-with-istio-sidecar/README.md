# How to Handle Readiness Probe with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Readiness Probe, Sidecar, Kubernetes, Service Mesh

Description: Configure readiness probes that work correctly with Istio sidecars to ensure traffic only reaches pods that are truly ready to serve.

---

Readiness probes in Kubernetes determine whether a pod should receive traffic. When a readiness probe fails, the pod is removed from the Service endpoints. With Istio, readiness probes have extra significance because they affect not just Kubernetes service discovery but also the Envoy load balancing pool. Getting them right means traffic only goes to pods that can actually handle it.

## How Readiness Probes Interact with Istio

In a standard Kubernetes setup, a failing readiness probe removes the pod from the Service endpoints. Kube-proxy stops routing traffic to it. With Istio, there is an additional layer:

1. The kubelet checks the readiness probe
2. If it fails, Kubernetes removes the pod from Endpoints
3. Istio's control plane (istiod) picks up the Endpoints change
4. It pushes an updated endpoint list to all Envoy proxies
5. Envoy sidecars stop sending traffic to the unready pod

This chain has some latency. Between the probe failure and Envoy getting the update, some traffic might still reach the unready pod. This is normal and unavoidable in distributed systems, but you can minimize the impact.

## Basic Readiness Probe Configuration

A standard HTTP readiness probe works with Istio out of the box, thanks to probe rewriting:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        - name: api-service
          image: myregistry/api-service:latest
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
            successThreshold: 1
```

Istio rewrites this probe to go through the sidecar agent on port 15021. The agent forwards the probe to your container on port 8080.

## The Sidecar Readiness Problem

There is a subtle issue with readiness probes and the Istio sidecar. Your application container might be ready, but the sidecar proxy might not be. If the sidecar is not ready, inbound traffic cannot reach your application even though the readiness probe passes.

Kubernetes 1.28+ handles this better with sidecar containers as a native concept, but in earlier versions, the sidecar runs as a regular container. The solution is to make your readiness probe account for both the application and the sidecar.

One approach is to check the sidecar readiness in your application's readiness endpoint:

```yaml
readinessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - |
        curl -sf http://localhost:8080/readyz && \
        curl -sf http://localhost:15021/healthz/ready
  initialDelaySeconds: 5
  periodSeconds: 5
```

This exec probe checks both your application health and the sidecar readiness. The pod is only marked ready when both pass.

## Using holdApplicationUntilProxyStarts

A cleaner approach is to prevent the application from starting until the proxy is ready:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
        - name: api-service
          image: myregistry/api-service:latest
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 2
            periodSeconds: 5
            failureThreshold: 3
```

With this annotation, the application container does not start until the proxy is ready. So by the time your readiness probe runs, the proxy is already up. You can use shorter `initialDelaySeconds` because you are not waiting for the proxy.

## Readiness Gates

Kubernetes supports readiness gates, which are additional conditions that must be true for a pod to be considered ready. While Istio does not use readiness gates by default, you could implement a custom controller that adds one based on proxy readiness.

For most cases, `holdApplicationUntilProxyStarts` is sufficient and simpler.

## Readiness Probe Timing

The timing of readiness probes matters more with Istio because of the propagation delay:

```yaml
readinessProbe:
  httpGet:
    path: /readyz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 3
  failureThreshold: 2
  successThreshold: 2
```

- `periodSeconds: 3` - check every 3 seconds for quick detection of unhealthy pods
- `failureThreshold: 2` - mark unready after 2 failures (6 seconds total)
- `successThreshold: 2` - require 2 consecutive successes before marking ready again (6 seconds)

Using `successThreshold: 2` prevents a pod that briefly passes one check from immediately receiving traffic. This is useful for services that take a few seconds to fully warm up.

## Readiness Probe for Database-Dependent Services

Many services depend on a database connection to be ready. Your readiness endpoint should check this:

```yaml
readinessProbe:
  httpGet:
    path: /readyz
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

But with Istio, there is a catch. If the database is outside the mesh and you are using STRICT mTLS, the database connection might fail because Istio tries to apply mTLS to it. Exclude database traffic from the mesh:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.1.100/32"
```

Replace with your database IP. Without this, your readiness probe might fail because the database connection is broken by the proxy.

## Graceful Shutdown and Readiness

When a pod is being terminated, Kubernetes sends a SIGTERM and stops routing traffic. With Istio, you want to make sure in-flight requests complete before the sidecar shuts down. Use a preStop hook to give time for traffic to drain:

```yaml
containers:
  - name: api-service
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 15"]
```

The 15-second sleep gives time for:
1. Kubernetes to update Endpoints (removing this pod)
2. Istio to propagate the change to all proxies
3. In-flight requests to complete

Without this, some requests might get connection resets during rollouts.

## Monitoring Readiness Status

Track readiness probe status through Kubernetes events:

```bash
# Check current readiness conditions
kubectl get pod <pod-name> -o jsonpath='{.status.conditions}' | python3 -m json.tool

# Watch for readiness changes
kubectl get events --field-selector involvedObject.name=<pod-name> | grep "Readiness"

# Check endpoint membership
kubectl get endpoints api-service -o yaml
```

In Prometheus, you can track endpoint counts:

```promql
# Number of ready endpoints per service
kube_endpoint_address_available{endpoint="api-service"}
```

## Debugging Readiness Failures

If readiness probes are failing:

```bash
# Test the health endpoint directly
kubectl exec -it <pod-name> -c api-service -- curl -v http://localhost:8080/readyz

# Test through the sidecar agent
kubectl exec -it <pod-name> -c istio-proxy -- curl -v http://localhost:15021/app-health/api-service/readyz

# Check sidecar readiness
kubectl exec -it <pod-name> -c istio-proxy -- curl -v http://localhost:15021/healthz/ready

# Look at events
kubectl describe pod <pod-name> | tail -20
```

If the direct test passes but the sidecar agent test fails, there is a problem with probe rewriting. If both pass but the pod is still not ready, check if there is a readiness gate or other condition blocking readiness.

Readiness probes with Istio work well when you follow two principles: use `holdApplicationUntilProxyStarts` to avoid startup race conditions, and add a preStop hook for graceful shutdown. Together, these ensure that traffic only reaches pods that are genuinely ready to handle it.
