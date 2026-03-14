# How to Handle Liveness Probe with Istio mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Liveness Probe, Kubernetes, Security

Description: Solve liveness probe failures caused by Istio mTLS STRICT mode, with detailed explanations of probe rewriting and alternative approaches.

---

If you have ever enabled STRICT mTLS in Istio and suddenly all your pods start restarting, you are not alone. The issue is straightforward: Kubernetes liveness probes send plain HTTP requests, but STRICT mTLS requires all traffic to present a valid client certificate. The kubelet does not have an Istio certificate, so the probe gets rejected and Kubernetes thinks your pod is dead.

## The Problem Explained

Here is what happens step by step:

1. You apply a PeerAuthentication policy with STRICT mTLS
2. The Envoy sidecar starts rejecting any connection without a valid mTLS certificate
3. The kubelet sends an HTTP GET to your pod's health endpoint
4. Envoy intercepts the request and rejects it because there is no client certificate
5. The liveness probe fails
6. After failureThreshold consecutive failures, Kubernetes restarts the pod
7. The restarted pod immediately hits the same problem
8. You get a crash loop

```yaml
# This causes the problem
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

## Solution 1: Probe Rewriting (Recommended)

Istio's probe rewriting is the cleanest solution. It is enabled by default since Istio 1.10. When active, the sidecar injector rewrites your HTTP probes to go through the Istio agent on port 15021, which can reach your application without mTLS.

Verify it is working:

```bash
# Check the mesh config
kubectl get cm istio -n istio-system -o yaml | grep rewriteAppHTTPProbers

# Look at the actual pod spec (not the deployment)
kubectl get pod <pod-name> -o yaml | grep -A8 "livenessProbe"
```

If probe rewriting is active, you should see the liveness probe targeting port 15021 with a path like `/app-health/<container>/livez`.

Your deployment stays simple:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: default
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
          image: myregistry/my-service:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
```

Istio automatically rewrites this. You do not need to change anything in your deployment.

## Solution 2: Separate Health Port Excluded from mTLS

If probe rewriting does not work for your setup, you can expose a health check port that is excluded from the Istio proxy. This means the kubelet connects directly to your container, bypassing Envoy entirely.

First, configure your application to expose health endpoints on a separate port (say 8081). Then exclude that port from Istio interception:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8081"
    spec:
      containers:
        - name: my-service
          image: myregistry/my-service:latest
          ports:
            - name: http
              containerPort: 8080
            - name: health
              containerPort: 8081
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8081
            initialDelaySeconds: 15
            periodSeconds: 10
```

The annotation `traffic.sidecar.istio.io/excludeInboundPorts: "8081"` tells Istio not to intercept traffic on port 8081. The kubelet can reach it directly, no mTLS needed.

## Solution 3: Exec Probe

Exec probes run inside the container and never touch the network, so mTLS is irrelevant:

```yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - "wget -q -O- http://localhost:8080/healthz || exit 1"
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
```

The `wget` or `curl` command runs inside the container and connects to localhost, which bypasses the Envoy proxy. This works reliably but has a performance cost because it forks a new process for every probe check.

## Solution 4: Per-Port mTLS Exception

You can set a PeerAuthentication policy that uses STRICT mTLS for your application port but PERMISSIVE for the health check port:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

This allows the health check port to accept both mTLS and plain HTTP connections while the main application port requires mTLS.

## Verifying the Fix

After applying any of these solutions, check that probes are passing:

```bash
# Check pod status
kubectl get pods -l app=my-service

# Look for probe failure events
kubectl describe pod <pod-name> | grep -A10 "Events"

# Check container restart count
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].restartCount}'
```

If the restart count is going up, probes are still failing. If it stays at 0 (or stops incrementing), you are good.

## Testing mTLS with Probes

You can simulate what the kubelet does to test your setup:

```bash
# Try to reach the health endpoint without mTLS (like the kubelet does)
kubectl exec -it <another-pod> -- curl -v http://<pod-ip>:8080/healthz

# This should fail with STRICT mTLS on the main port
# But succeed with probe rewriting via port 15021

# Test the probe rewrite endpoint
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/app-health/my-service/livez
```

## Common Mistakes

**Forgetting that probe rewriting only works for HTTP probes.** If you use TCP probes, Istio does not rewrite them. TCP probes go directly to the port, and if Envoy is listening (which it always is for meshed ports), the probe passes. This means TCP probes with mTLS do not fail, but they also do not actually check your application.

**Applying STRICT mTLS before checking probe rewriting.** Always verify that probe rewriting is enabled before switching to STRICT mode:

```bash
# Verify probe rewriting globally
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep -i prober
```

**Not accounting for the init container race condition.** Even with probe rewriting, if your application starts before the sidecar, early probes can fail. Use `holdApplicationUntilProxyStarts`:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

**Using wrong port numbers in exclusion annotations.** Double-check that the port in `excludeInboundPorts` matches the port your health endpoint actually listens on, not the Service port.

## Migration Path

If you are migrating from PERMISSIVE to STRICT mTLS, here is a safe sequence:

1. Verify probe rewriting is enabled across the mesh
2. Check that all pods have been reinjected with the latest sidecar (probes get rewritten at injection time, not dynamically)
3. Apply STRICT mTLS to one namespace at a time
4. Monitor pod restarts after each namespace
5. If pods start restarting, roll back and investigate

```bash
# Watch for restart storms
kubectl get pods -n default -w
```

The combination of probe rewriting and `holdApplicationUntilProxyStarts` handles the vast majority of liveness probe issues with mTLS. If you are on Istio 1.10 or newer, the defaults should work without any extra configuration.
