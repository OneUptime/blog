# How to Configure Health Check Rewriting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Check Rewriting, Kubernetes, Sidecar, Probe

Description: Deep dive into Istio's health check rewriting mechanism, how it works under the hood, and how to configure it at global and per-pod levels.

---

Health check rewriting is one of those Istio features that works silently in the background. Most people never think about it until something breaks. It solves a real problem: when mTLS is enabled, the kubelet cannot make plain HTTP requests to your application because the Envoy sidecar expects encrypted traffic. Probe rewriting redirects health checks through the Istio agent, which can reach your app without mTLS.

## How Probe Rewriting Works

When the Istio sidecar injector processes your pod, it looks at the probe definitions on each container. For HTTP probes, it performs the following transformation:

**Original probe (in your Deployment):**
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
    scheme: HTTP
```

**Rewritten probe (in the actual Pod):**
```yaml
livenessProbe:
  httpGet:
    path: /app-health/my-container/livez
    port: 15021
    scheme: HTTP
```

The Istio agent (pilot-agent) listens on port 15021. When it receives a request at `/app-health/my-container/livez`, it forwards it to port 8080 at `/healthz` on localhost. Since the agent and the application are in the same pod, this communication happens over localhost and does not go through Envoy.

The original probe information is stored in a pod annotation:

```yaml
annotations:
  sidecar.istio.io/status: '{"...", "containerPorts": {"my-container": 8080}}'
```

The agent reads this annotation at startup to know where to forward probes.

## Enabling and Disabling Probe Rewriting

### Globally

Probe rewriting is enabled by default since Istio 1.10. Check the current setting:

```bash
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep -i rewrite
```

To enable or change it globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

The probe rewriting itself is controlled by the sidecar injector config. Check it:

```bash
kubectl get cm istio-sidecar-injector -n istio-system -o jsonpath='{.data.config}' | grep -i rewrite
```

### Per-Pod

Override the global setting for a specific pod:

```yaml
# Enable probe rewriting (usually the default)
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "true"

# Disable probe rewriting
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

Disabling is useful for debugging. If probes are failing and you want to rule out the rewriting mechanism, turn it off temporarily and test.

## What Gets Rewritten

Istio rewrites the following probe types:

**HTTP GET probes** - fully rewritten (path and port changed)

```yaml
# Before
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080

# After
livenessProbe:
  httpGet:
    path: /app-health/my-container/livez
    port: 15021
```

**gRPC probes** - rewritten to HTTP on port 15021

```yaml
# Before
livenessProbe:
  grpc:
    port: 50051

# After (converted to HTTP)
livenessProbe:
  httpGet:
    path: /app-health/my-container/livez
    port: 15021
```

The following are NOT rewritten:

- **TCP probes** - left as-is because they just check port connectivity
- **Exec probes** - left as-is because they run inside the container

## The URL Path Convention

The rewritten URL follows this pattern:

```
/app-health/<container-name>/<probe-type>
```

Where probe-type is:
- `livez` for liveness probes
- `readyz` for readiness probes
- `startupz` for startup probes

So if you have a container named `web-server` with all three probes, the rewritten paths are:

```
/app-health/web-server/livez
/app-health/web-server/readyz
/app-health/web-server/startupz
```

## Multi-Container Pods

For pods with multiple containers, each container's probes get their own paths:

```yaml
spec:
  containers:
    - name: api
      livenessProbe:
        httpGet:
          path: /health
          port: 8080
    - name: worker
      livenessProbe:
        httpGet:
          path: /health
          port: 9090
```

Rewritten to:

```yaml
spec:
  containers:
    - name: api
      livenessProbe:
        httpGet:
          path: /app-health/api/livez
          port: 15021
    - name: worker
      livenessProbe:
        httpGet:
          path: /app-health/worker/livez
          port: 15021
```

Both go through the same port (15021) but with different paths. The agent knows to forward the `api` probe to port 8080 and the `worker` probe to port 9090.

## Custom HTTP Headers in Probes

If your probe includes custom headers, they are preserved through rewriting:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
    httpHeaders:
      - name: X-Custom-Header
        value: "probe-check"
```

The Istio agent forwards these headers when it makes the request to your application. This is useful if your health endpoint requires authentication or custom headers.

## HTTPS Probes

If your application exposes the health endpoint over HTTPS:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8443
    scheme: HTTPS
```

The rewritten probe still targets port 15021 with HTTP. The Istio agent handles the HTTPS connection to your application container:

```yaml
livenessProbe:
  httpGet:
    path: /app-health/my-container/livez
    port: 15021
    scheme: HTTP
```

## Verifying Rewriting Is Working

Several ways to verify:

```bash
# Compare deployment spec vs pod spec
kubectl get deployment my-app -o yaml | grep -A10 "livenessProbe"
kubectl get pod <pod-name> -o yaml | grep -A10 "livenessProbe"

# Test the rewritten endpoint
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/app-health/my-container/livez

# Check the sidecar status annotation
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations.sidecar\.istio\.io/status}' | python3 -m json.tool
```

## Troubleshooting Probe Rewriting

### Probes not being rewritten

If the pod spec still shows the original probe config:

1. Check that sidecar injection is active for the namespace:
```bash
kubectl get namespace default --show-labels | grep istio-injection
```

2. Check that the pod actually has the sidecar:
```bash
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].name}'
```

3. Restart the pod to trigger re-injection:
```bash
kubectl delete pod <pod-name>
```

Probe rewriting happens at injection time, not dynamically. If you changed the setting after the pod was created, you need to restart it.

### Agent returning wrong status code

If the agent returns a different status than your application:

```bash
# Test directly
kubectl exec -it <pod-name> -c my-container -- curl -v http://localhost:8080/healthz

# Test through agent
kubectl exec -it <pod-name> -c istio-proxy -- curl -v http://localhost:15021/app-health/my-container/livez
```

If the direct test returns 200 but the agent returns 503, there might be a port mapping issue. Check the annotations to see what port the agent thinks it should forward to.

### Agent not starting

If port 15021 is not open:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ss -tlnp | grep 15021
```

If nothing is listening, the pilot-agent process might have crashed. Check the sidecar logs:

```bash
kubectl logs <pod-name> -c istio-proxy | grep -i "health\|agent\|15021"
```

## When to Disable Probe Rewriting

There are a few cases where disabling probe rewriting makes sense:

1. **Debugging** - to isolate whether the agent is causing probe failures
2. **Custom proxy configurations** - if you have modified the sidecar injection template
3. **Non-HTTP probes** - if your health endpoint uses a protocol that the agent does not understand (rare)

To disable for a pod:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

When disabled with STRICT mTLS, you will need an alternative like exec probes or excluded ports.

Probe rewriting is a small but critical piece of the Istio puzzle. It works transparently for the vast majority of cases. When it does not, the debugging path is usually straightforward: check if rewriting is active, test the agent endpoint, and verify the port mapping. The most common fix is simply restarting the pod to pick up the latest injection configuration.
