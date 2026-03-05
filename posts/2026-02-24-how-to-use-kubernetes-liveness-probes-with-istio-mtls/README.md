# How to Use Kubernetes Liveness Probes with Istio mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Health Check, mTLS, Service Mesh

Description: How to configure Kubernetes liveness and readiness probes to work correctly with Istio mTLS without causing unnecessary pod restarts.

---

Kubernetes liveness and readiness probes are essential for keeping your services healthy. They tell Kubernetes when a pod needs to be restarted (liveness) or when it is ready to receive traffic (readiness). But when you enable Istio's mTLS, these probes can break because the kubelet does not have Istio's client certificates.

The kubelet lives on the node, outside the mesh. When it sends an HTTP health check to your pod, that request goes through the Envoy sidecar. If mTLS is set to STRICT, the sidecar rejects the plaintext request from the kubelet, the health check fails, and Kubernetes restarts your pod in a loop.

Here is how to fix it properly.

## How Istio Handles Probe Rewriting

Istio has a built-in mechanism to handle this problem. When the sidecar injector adds the Envoy proxy to your pod, it also rewrites your health check probe paths to route through the Istio agent (pilot-agent) on port 15020.

For example, if your deployment has:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
```

After sidecar injection, Istio rewrites this to:

```yaml
livenessProbe:
  httpGet:
    path: /app-health/my-app/livez
    port: 15021
```

The Istio agent on port 15021 receives the plaintext request from the kubelet, then makes the actual request to your application on port 8080 through the local network (bypassing the mTLS requirement).

Check if your probes are being rewritten:

```bash
# View the actual pod spec (not the deployment spec)
kubectl get pod my-pod -o yaml | grep -A 8 "livenessProbe"
kubectl get pod my-pod -o yaml | grep -A 8 "readinessProbe"
```

You should see port 15021 and paths like `/app-health/...` if rewriting is active.

## Enabling Probe Rewriting

Probe rewriting is enabled by default in recent Istio versions. But if it is not working, you can explicitly enable it:

### Per-Pod Annotation

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
```

### Mesh-Wide Setting

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    sidecarInjectorWebhook:
      rewriteAppHTTPProbe: true
```

## TCP and gRPC Probes

Probe rewriting only works for HTTP probes. TCP and gRPC probes behave differently.

### TCP Probes

TCP liveness probes check if a port is open. These generally work fine with Istio because the TCP connection succeeds even with mTLS. The sidecar accepts the connection on the inbound port.

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
```

TCP probes do not need any special configuration for Istio.

### gRPC Probes

Kubernetes supports native gRPC health checks. With Istio, these work if the kubelet's gRPC health check goes through the sidecar correctly.

```yaml
livenessProbe:
  grpc:
    port: 50051
  initialDelaySeconds: 10
  periodSeconds: 5
```

If gRPC probes fail with mTLS, the simplest workaround is to add an HTTP health check endpoint alongside the gRPC one:

```yaml
containers:
- name: my-grpc-app
  image: my-grpc-app:latest
  ports:
  - containerPort: 50051
    name: grpc-api
  - containerPort: 8081
    name: http-health
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8081
  readinessProbe:
    httpGet:
      path: /ready
      port: 8081
```

## Exec Probes as a Fallback

If HTTP probe rewriting is not working for your specific scenario, you can switch to exec probes. These run a command inside the container and bypass the network entirely:

```yaml
livenessProbe:
  exec:
    command:
    - curl
    - -f
    - http://localhost:8080/healthz
  initialDelaySeconds: 10
  periodSeconds: 5
```

The key difference is that `localhost` inside the container goes directly to the application, not through the Envoy proxy. This bypasses mTLS entirely.

A cleaner version without needing curl in your image:

```yaml
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - wget -q -O /dev/null http://localhost:8080/healthz || exit 1
  initialDelaySeconds: 10
  periodSeconds: 5
```

Or even better, use a dedicated health check binary in your application:

```yaml
livenessProbe:
  exec:
    command:
    - /app/healthcheck
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Startup Probes for Slow-Starting Apps

If your application takes a long time to start, use a startup probe in combination with liveness and readiness probes. The startup probe prevents the liveness probe from killing the pod before it has finished starting.

```yaml
containers:
- name: my-app
  image: my-app:latest
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    failureThreshold: 30
    periodSeconds: 10
    # Allows up to 300 seconds for startup
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 5
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    periodSeconds: 3
    failureThreshold: 2
```

With Istio, also make sure the application waits for the sidecar:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

## Debugging Probe Failures

When probes fail after enabling mTLS, follow this debugging flow:

```bash
# Step 1: Check if probes were rewritten
kubectl get pod my-pod -o yaml | grep -A 8 "httpGet"

# Step 2: Check probe results in events
kubectl describe pod my-pod | grep -A 5 "Liveness\|Readiness\|Startup"

# Step 3: Manually test the probe endpoint from inside the container
kubectl exec my-pod -c my-app -- curl -v http://localhost:8080/healthz

# Step 4: Test from the istio-proxy container
kubectl exec my-pod -c istio-proxy -- curl -v http://localhost:8080/healthz

# Step 5: Test the rewritten probe path
kubectl exec my-pod -c istio-proxy -- curl -v http://localhost:15021/app-health/my-app/livez

# Step 6: Check istio-proxy logs for errors
kubectl logs my-pod -c istio-proxy | grep -i "health\|probe\|error"
```

## Port Exclusions for Probes

If nothing else works, you can exclude the health check port from sidecar interception:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8081"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
          name: http-web
        - containerPort: 8081
          name: http-health
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
```

Port 8081 is excluded from sidecar interception, so the kubelet can reach it directly without mTLS. Your application traffic on port 8080 still goes through the sidecar and gets full mTLS protection.

## Recommended Approach

For most applications, Istio's automatic probe rewriting works out of the box. Verify it is enabled, check that probes are being rewritten by inspecting the pod spec, and move on.

If automatic rewriting does not work for your situation, use exec probes as the next best option. Port exclusion should be your last resort since it creates a port that bypasses the mesh.

The main thing to remember is that probes and mTLS are not fundamentally incompatible. Istio has mature mechanisms for handling this. Most probe failures after enabling mTLS are configuration issues, not fundamental limitations.
