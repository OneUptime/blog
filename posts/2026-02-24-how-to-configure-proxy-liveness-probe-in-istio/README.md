# How to Configure Proxy Liveness Probe in Istio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Liveness Probe, Health Check, Kubernetes, Envoy Proxy

Description: How to configure liveness probes for the Istio sidecar proxy to automatically restart unhealthy proxy containers and maintain mesh reliability.

---

Liveness probes tell Kubernetes whether a container is still alive and functioning. If a liveness probe fails, Kubernetes kills the container and restarts it. For the Istio sidecar proxy, this means detecting when Envoy gets into a bad state and automatically recovering. While Envoy is generally very stable, there are edge cases where the proxy can become unresponsive, and liveness probes are your safety net.

## Default Liveness Probe Behavior

By default, Istio does not add a liveness probe to the sidecar proxy container. The reasoning is that Envoy rarely crashes or becomes unresponsive, and a misconfigured liveness probe can cause unnecessary restarts that actually hurt availability.

However, you can consider adding one for workloads where restarting a stuck proxy is preferable to leaving the pod running. The proxy exposes a health endpoint at `/healthz/ready` on port 15021, or you can use the `/server_info` endpoint on port 15000 for diagnostic checks.

## Adding a Liveness Probe via Annotations

Istio doesn't have built-in annotations specifically for the proxy liveness probe the way it does for readiness probes. Instead, you have a couple of approaches.

**Approach 1: Custom injection template**

You can create a custom injection template that includes a liveness probe:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        proxy-liveness: |
          spec:
            containers:
            - name: istio-proxy
              livenessProbe:
                httpGet:
                  path: /healthz/ready
                  port: 15021
                initialDelaySeconds: 10
                periodSeconds: 15
                timeoutSeconds: 3
                failureThreshold: 5
```

Then apply it to selected pods together with the default sidecar template:

```yaml
metadata:
  annotations:
    inject.istio.io/templates: "sidecar,proxy-liveness"
```

**Approach 2: Adding an `istio-proxy` override to the pod spec**

For individual workloads, you can add an `istio-proxy` container override to the pod template. Istio treats fields you define there as overrides to the injected sidecar template.

## Application Liveness Probes Through the Proxy

More commonly, you need to configure how your application's liveness probes work when they go through the Istio proxy. By default, Istio rewrites HTTP liveness probes to route through the sidecar:

Your original deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      - name: my-service
        image: my-service:1.0
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 5
          failureThreshold: 3
```

After injection, Istio rewrites the probe to go through the sidecar agent status port:

```yaml
livenessProbe:
  httpGet:
    path: /app-health/my-service/livez
    port: 15020
  initialDelaySeconds: 15
  periodSeconds: 20
  timeoutSeconds: 5
  failureThreshold: 3
```

The sidecar agent receives the health check request on port 15020 and forwards it to your application on port 8080 at the `/healthz` path.

## Controlling Probe Rewriting

You can control whether Istio rewrites your application probes:

**Disable rewriting globally:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      rewriteAppHTTPProbe: false
```

**Disable rewriting per pod:**

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

When probe rewriting is disabled, the kubelet keeps sending health check requests to the original application port and path. In an injected pod, those requests can still be affected by Istio's inbound traffic capture unless you explicitly exclude the relevant ports.

## Why Probe Rewriting Matters

Probe rewriting serves an important purpose. When mTLS is strict, the kubelet cannot directly send HTTP requests to your application because it doesn't have the mesh certificates. The probe rewrite routes health checks to the sidecar agent's status port, which can safely perform the local application check.

If you disable probe rewriting and have `PeerAuthentication` set to STRICT, your liveness probes will fail:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

With strict mTLS and no probe rewriting, the kubelet's plain HTTP health checks get rejected by the proxy. Keep rewriting enabled when using strict mTLS.

## Handling Slow Starting Applications

Some applications take a while to start up. If your liveness probe fires before the app is ready, it will fail and Kubernetes will restart the container, creating a restart loop:

```yaml
spec:
  containers:
  - name: my-service
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 60
      periodSeconds: 10
      failureThreshold: 5
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10
      failureThreshold: 30
```

The `startupProbe` is designed exactly for this situation. Kubernetes won't run the liveness probe until the startup probe succeeds. This gives slow-starting apps up to 300 seconds (30 failures * 10 seconds) to become healthy.

Istio rewrites startup probes the same way as liveness and readiness probes.

## TCP Liveness Probes

For non-HTTP services, you can use TCP liveness probes:

```yaml
spec:
  containers:
  - name: database-proxy
    livenessProbe:
      tcpSocket:
        port: 5432
      initialDelaySeconds: 15
      periodSeconds: 20
```

TCP probes are rewritten by Istio by default. Without rewriting, Istio's inbound redirection can make TCP ports appear open as long as the sidecar is running, so the sidecar agent performs the TCP port check while avoiding that redirection problem.

## gRPC Liveness Probes

Kubernetes gRPC probes are stable as of Kubernetes 1.27:

```yaml
spec:
  containers:
  - name: grpc-service
    livenessProbe:
      grpc:
        port: 50051
        service: my.health.v1.Health
      initialDelaySeconds: 10
      periodSeconds: 15
```

Istio rewrites gRPC probes similarly to HTTP probes when `rewriteAppHTTPProbers` is enabled.

## Exec Liveness Probes

If HTTP and TCP probes don't work for your use case, you can use exec probes that run a command inside the container:

```yaml
spec:
  containers:
  - name: my-service
    livenessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - "curl -s -f http://localhost:8080/healthz || exit 1"
      initialDelaySeconds: 15
      periodSeconds: 20
```

Exec probes are not affected by Istio's probe rewriting since they run inside the container, not from the kubelet.

## Monitoring Liveness Probe Failures

Keep an eye on probe failures to catch issues early:

```bash
# Check for restarts caused by liveness probe failures

kubectl get pods -o custom-columns='NAME:.metadata.name,RESTARTS:.status.containerStatuses[*].restartCount'

# Look at events for probe failures
kubectl get events --field-selector reason=Unhealthy

# Check specific pod events
kubectl describe pod -l app=my-service | grep -A 3 "Liveness"
```

In Prometheus, you can track container restarts:

```promql
# Container restart rate
rate(kube_pod_container_status_restarts_total{container="my-service"}[1h])

# Pods in CrashLoopBackOff
kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"}
```

## Debugging Probe Failures

When liveness probes fail unexpectedly:

```bash
# Manually test the health endpoint
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')

# Test through the proxy rewrite path
kubectl exec $POD -c istio-proxy -- curl -s localhost:15020/app-health/my-service/livez

# Test the app directly
kubectl exec $POD -c my-service -- curl -s localhost:8080/healthz

# Check if the proxy itself is healthy
kubectl exec $POD -c istio-proxy -- curl -s localhost:15021/healthz/ready
```

Common causes of liveness probe failures:

- Application takes too long to respond under load (increase `timeoutSeconds`)
- Garbage collection pauses cause brief unresponsiveness (increase `failureThreshold`)
- Database or dependency health checks that block the health endpoint
- Resource exhaustion (CPU throttling or memory pressure)
- Proxy consuming the timeout budget before the request reaches the app

## Best Practices

1. Always set `initialDelaySeconds` high enough for your application to start
2. Use startup probes instead of large `initialDelaySeconds` for variable startup times
3. Keep the health endpoint lightweight - don't check downstream dependencies in your liveness probe
4. Set `timeoutSeconds` high enough to account for the proxy overhead (add 1-2 seconds to what you'd normally set)
5. Keep probe rewriting enabled when using strict mTLS
6. Monitor restart counts to catch liveness probe flapping early

Liveness probes are your automatic recovery mechanism. Configure them conservatively enough to avoid false positives, but aggressively enough to catch genuinely stuck containers within a reasonable timeframe.
