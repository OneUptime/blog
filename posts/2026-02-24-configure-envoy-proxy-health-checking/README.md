# How to Configure Envoy Proxy Health Checking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Health Checking, Kubernetes, Reliability

Description: How to configure health checking for Envoy proxy sidecars in Istio including liveness, readiness, and upstream health checks.

---

Health checking in an Istio mesh involves multiple layers. There are Kubernetes liveness and readiness probes that determine if a pod should be restarted or receive traffic. There is Envoy's own health checking for upstream endpoints. And there is the health of the sidecar proxy itself. Understanding how all these pieces interact helps you avoid situations where unhealthy pods receive traffic or healthy pods get needlessly restarted.

## How Istio Handles Kubernetes Probes

When Istio injects a sidecar, all traffic goes through Envoy, including health check traffic from the kubelet. This creates a problem: the kubelet sends health probes to the pod's IP, but Envoy intercepts them. If Envoy is not ready yet or the probe path is not configured correctly, the probes fail.

Istio solves this by rewriting health probes. The sidecar injector modifies the pod spec to route health probes through a special health check endpoint on the pilot-agent:

```text
kubelet -> pilot-agent (port 15021) -> application health endpoint
```

The pilot-agent listens on port 15021 and provides several endpoints:

- `/healthz/ready` - Returns 200 when Envoy is ready
- `/app-health/<app-port>/livez` - Proxies to the application's liveness endpoint
- `/app-health/<app-port>/readyz` - Proxies to the application's readiness endpoint

You can see how Istio rewrites your probes by checking the pod spec:

```bash
kubectl get pod <pod-name> -o yaml | grep -A 10 "livenessProbe\|readinessProbe"
```

## Configuring Application Health Probes

Define your health probes as you normally would. Istio automatically rewrites them:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: my-app
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
```

After sidecar injection, Istio changes these to point at the pilot-agent proxy endpoint.

## Disabling Probe Rewriting

In some cases, you might want to disable the probe rewriting. For example, if your probes use gRPC or TCP checks that do not go through HTTP:

```yaml
annotations:
  sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

Or globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecar_injector:
      rewriteAppHTTPProbers: false
```

When probe rewriting is disabled, you need to make sure the kubelet can reach your application through the Envoy proxy, or exclude the health check port from sidecar interception.

## Envoy Proxy Health

The Envoy sidecar itself has health status. Check it:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15021/healthz/ready
```

This returns HTTP 200 when Envoy has received its initial configuration from istiod and is ready to process traffic. It returns 503 if Envoy is not ready.

You can also check the Envoy admin health endpoint:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/ready
```

## Upstream Health Checking with Outlier Detection

Envoy can detect and remove unhealthy upstream endpoints using outlier detection. This is configured through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

This configuration means:

- If an endpoint returns 5 consecutive 5xx errors, eject it
- Check every 10 seconds
- Ejected endpoints are out for at least 30 seconds
- Never eject more than 50% of endpoints
- Only apply ejection if at least 30% of endpoints are healthy

Check which endpoints are ejected:

```bash
istioctl proxy-config endpoints <pod-name> --cluster "outbound|8080||my-service.default.svc.cluster.local" | grep UNHEALTHY
```

## Active Health Checking

Outlier detection is passive - it reacts to errors from real traffic. Envoy also supports active health checking where it periodically probes upstream endpoints. In Istio, you configure this through an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: active-health-check
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-client
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: my-service.default.svc.cluster.local
    patch:
      operation: MERGE
      value:
        health_checks:
        - timeout: 5s
          interval: 10s
          unhealthy_threshold: 3
          healthy_threshold: 2
          http_health_check:
            path: /healthz
            host: my-service
```

With active health checking, Envoy periodically sends HTTP requests to the `/healthz` endpoint of each upstream pod. If a pod fails 3 consecutive checks, it is marked unhealthy. It needs 2 successful checks to be marked healthy again.

## Health Checking for the Ingress Gateway

The Istio ingress gateway exposes its health on port 15021:

```bash
curl http://<gateway-ip>:15021/healthz/ready
```

This is the endpoint you should configure in your external load balancer health checks:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  ports:
  - name: status-port
    port: 15021
    targetPort: 15021
```

For AWS ALB or other cloud load balancers:

```yaml
annotations:
  alb.ingress.kubernetes.io/healthcheck-path: /healthz/ready
  alb.ingress.kubernetes.io/healthcheck-port: "15021"
```

## Startup Probes

For applications that take a long time to start, use startup probes to prevent the kubelet from killing the pod prematurely:

```yaml
containers:
- name: my-app
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 0
    periodSeconds: 10
    failureThreshold: 30
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 15
```

The startup probe runs first and gives the application up to 300 seconds (30 * 10) to start. Only after the startup probe succeeds do the liveness and readiness probes begin.

## Debugging Health Check Failures

When health checks fail, start with these steps:

```bash
# Check the application health endpoint directly
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:8080/healthz

# Check the pilot-agent proxy endpoint
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15021/healthz/ready

# Check Envoy's health
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/ready

# Look at kubelet events
kubectl describe pod <pod-name> | grep -A 5 "Unhealthy\|probe"

# Check the sidecar logs for health-related errors
kubectl logs <pod-name> -c istio-proxy | grep -i health
```

A common issue is the application not being ready when the first readiness probe runs. Either increase `initialDelaySeconds` or use a startup probe.

Another frequent problem is network policies or AuthorizationPolicies blocking health check traffic. Make sure your policies allow traffic from the kubelet IP ranges to the health check ports.

Health checking in Istio is a multi-layered system. Kubernetes probes keep the kubelet informed, Istio's probe rewriting ensures probes work through the sidecar, and Envoy's outlier detection and active health checking keep traffic away from unhealthy upstream endpoints. Getting all layers configured correctly means your mesh can self-heal when individual pods have problems.
