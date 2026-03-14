# How to Fix Liveness Probe Failures with Istio mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Liveness Probe, mTLS, Kubernetes, Troubleshooting

Description: How to resolve liveness probe failures caused by mutual TLS configuration in Istio service mesh deployments.

---

Your pods keep restarting because liveness probes are failing, and the problem started after enabling STRICT mTLS in Istio. This is one of the most frequently reported issues when hardening an Istio mesh. The root cause is straightforward: the kubelet sends plaintext HTTP requests for health checks, but STRICT mTLS means the sidecar only accepts encrypted connections.

## Why Liveness Probes Fail with mTLS

The kubelet runs on the node, outside the mesh. It doesn't have Istio certificates and can't do mTLS. When it sends a liveness probe request to your pod, here's what happens:

1. Kubelet sends an HTTP GET to `pod-ip:8080/health`
2. The sidecar's iptables rules intercept the request
3. With STRICT mTLS, the sidecar expects a TLS handshake
4. The kubelet sends plaintext, so the sidecar rejects it
5. The probe fails, the kubelet restarts the container

This results in a CrashLoopBackOff pattern where pods constantly restart.

## The Fix: Probe Rewriting

Istio's probe rewriting feature solves this by redirecting health checks through the pilot-agent process on port 15021, which is excluded from mTLS.

Verify probe rewriting is enabled:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml | grep rewriteAppHTTPProbe
```

It should be `true`. If not, enable it. If you installed Istio with istioctl:

```bash
istioctl install --set values.sidecarInjectorWebhook.rewriteAppHTTPProbe=true
```

Or patch the ConfigMap directly:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml | \
  sed 's/rewriteAppHTTPProbe: false/rewriteAppHTTPProbe: true/' | \
  kubectl apply -f -
```

After enabling, you need to restart your pods so the injection template picks up the change:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Per-Pod Probe Rewriting

If you don't want to enable it globally, use the annotation on specific pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: my-namespace
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
```

After the sidecar injector processes this, the actual probe in the running pod will target port 15021 instead of 8080.

## Verify the Rewrite Is Applied

Check the running pod to confirm the probe was rewritten:

```bash
kubectl get pod <pod-name> -n my-namespace -o jsonpath='{.spec.containers[?(@.name=="my-app")].livenessProbe}' | jq .
```

You should see something like:

```json
{
  "httpGet": {
    "path": "/app-health/my-app/livez",
    "port": 15021,
    "scheme": "HTTP"
  },
  "initialDelaySeconds": 10,
  "periodSeconds": 15
}
```

If the probe still shows the original port, the injection didn't rewrite it. Check that sidecar injection is actually happening for this pod.

## Test the Health Endpoint Manually

Make sure the rewritten health endpoint actually works:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s -o /dev/null -w "%{http_code}" http://localhost:15021/app-health/my-app/livez
```

If this returns 200, the health check path through pilot-agent is working. If it returns something else, check what your application returns:

```bash
kubectl exec <pod-name> -c my-app -n my-namespace -- curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
```

If the application itself returns an error, the problem isn't with Istio but with your application's health endpoint.

## HTTPS Probes

If your application serves health checks over HTTPS (not mTLS, just regular TLS), probe rewriting handles this differently. The original probe:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8443
    scheme: HTTPS
```

Pilot-agent will forward the request using the specified scheme. Make sure the certificate your application uses is trusted by pilot-agent, or the forwarded health check will fail.

For self-signed certificates, it's simpler to have a separate HTTP health endpoint that doesn't require TLS.

## Port Exclusion Approach

An alternative to probe rewriting is to exclude the health check port from sidecar interception entirely:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "8081"
spec:
  containers:
  - name: my-app
    ports:
    - containerPort: 8080  # Application port (goes through sidecar)
    - containerPort: 8081  # Health check port (bypasses sidecar)
    livenessProbe:
      httpGet:
        path: /health
        port: 8081
```

Traffic on port 8081 completely bypasses the Envoy proxy, so mTLS doesn't affect it. The downside is that your application needs to serve health checks on a separate port.

## Using exec Probes

Another workaround is to use exec probes that run a command inside the container:

```yaml
livenessProbe:
  exec:
    command:
    - wget
    - --spider
    - -q
    - http://localhost:8080/health
  initialDelaySeconds: 10
  periodSeconds: 15
  timeoutSeconds: 5
```

The `wget` or `curl` command runs inside the application container and connects to localhost. Since this is process-level communication, it typically bypasses the sidecar's iptables rules for loopback traffic.

The disadvantage is that exec probes have higher overhead than HTTP probes and require the binary (wget/curl) to be present in your container image.

## PeerAuthentication Port-Level Override

You can keep STRICT mTLS for application traffic but set PERMISSIVE or DISABLE for the health check port:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
```

This allows the kubelet to send plaintext health checks to port 8080 while keeping mTLS strict for other ports. However, this also means that any client can send plaintext to port 8080, which weakens your security posture.

## Timing Issues

Even with probe rewriting, there can be timing issues during pod startup. The liveness probe might fire before pilot-agent is ready to forward requests:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30  # Give the sidecar time to start
  periodSeconds: 15
  failureThreshold: 3
```

A generous `initialDelaySeconds` helps. Better yet, use a startup probe to handle the initial delay and keep the liveness probe tight:

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30
  periodSeconds: 2
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 15
  failureThreshold: 3
```

## Debugging Sequence

When liveness probes fail with mTLS:

1. Check pod events: `kubectl describe pod <pod-name> -n my-namespace`
2. Look for "Liveness probe failed" messages
3. Check if probe rewriting is active by examining the running pod spec
4. Test the health endpoint from inside the pod
5. Check pilot-agent logs for forwarding errors
6. Verify PeerAuthentication settings
7. Try an exec probe as a quick test

## Summary

Liveness probe failures with Istio mTLS are caused by the kubelet sending plaintext health checks to a pod that only accepts mTLS connections. The primary fix is enabling Istio's probe rewriting feature, which routes health checks through pilot-agent on a port that's excluded from mTLS. Alternatives include port exclusion, exec probes, and port-level PeerAuthentication overrides. Always restart pods after changing injection settings so the new configuration takes effect.
