# How to Configure mTLS Exception for Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Health Check, Kubernetes, Security

Description: Configure Istio to handle Kubernetes health check probes correctly when strict mTLS is enabled, preventing probe failures and pod restarts.

---

One of the most common issues when enabling strict mTLS in Istio is health check failures. Kubernetes liveness and readiness probes come from the kubelet, which does not have an Istio sidecar and cannot present mTLS certificates. When your PeerAuthentication policy requires strict mTLS, those health check requests get rejected, and Kubernetes thinks your pods are unhealthy.

This results in a frustrating loop: pods start, fail health checks, get restarted, fail again, and keep crashing. The fix is straightforward once you understand how Istio handles health probes.

## How Kubernetes Health Probes Work with Istio

When a kubelet sends an HTTP health check to a pod, the request goes to the pod's IP on the health check port. With an Istio sidecar, the request first hits the Envoy proxy. If strict mTLS is enabled, the proxy expects a client certificate, which the kubelet does not have.

Istio handles this automatically since version 1.10 through a feature called probe rewriting. When Istio injects the sidecar, it rewrites the pod's health probe configuration to route through a special health check endpoint on the sidecar proxy.

## Automatic Probe Rewriting

By default, Istio rewrites HTTP health probes to go through the sidecar's health check port (15021). This is transparent and usually requires no configuration.

Check if probe rewriting is enabled in your mesh:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A5 "holdApplicationUntilProxyStarts"
```

The probe rewriting happens during sidecar injection. You can verify it by looking at the injected pod spec:

```bash
kubectl get pod my-pod -o yaml | grep -A10 livenessProbe
```

You should see the probe rewritten to point to a path on port 15021, something like:

```yaml
livenessProbe:
  httpGet:
    path: /app-health/my-app/livez
    port: 15021
    scheme: HTTP
```

The sidecar receives the health check on port 15021 (which does not require mTLS), then forwards it to the application's actual health endpoint internally. This way, the kubelet talks plaintext to the sidecar, and the sidecar talks to the application container locally.

## When Automatic Rewriting Does Not Work

There are cases where automatic probe rewriting does not work or is not desirable:

- **TCP probes**: Istio only rewrites HTTP and gRPC probes. TCP probes are passed through as-is.
- **Custom probe ports**: If your probe uses a port that is not in the Service definition, rewriting might not handle it correctly.
- **Startup probes with long timeouts**: If the application takes a long time to start and the sidecar is not ready yet, the rewritten probe might fail.

## Configuring Port-Level mTLS Exceptions

If automatic probe rewriting does not work for your case, you can create a port-level exception in the PeerAuthentication policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: health-check-exception
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

In this example, port 8081 is the health check port. By setting it to `PERMISSIVE`, the sidecar accepts both mTLS and plaintext on that port. The kubelet's plaintext health checks will succeed, while all other traffic on other ports still requires mTLS.

This approach works well when your application exposes health checks on a separate port from its main API.

## Separating Health Check Ports

A clean architecture for health checks with mTLS is to have your application listen on two ports:

- Port 8080: Main API (protected by strict mTLS)
- Port 8081: Health checks only (permissive mTLS)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:v1
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: health
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
```

Then create the PeerAuthentication policy with port-level exceptions as shown above.

## Handling gRPC Health Probes

If your application uses gRPC health probes (common in gRPC services), Istio also rewrites these. The grpc-health-probe binary or Kubernetes native gRPC probes work with Istio's probe rewriting:

```yaml
readinessProbe:
  grpc:
    port: 50051
  initialDelaySeconds: 5
  periodSeconds: 10
```

Istio rewrites this to go through port 15021, just like HTTP probes.

## Dealing with exec Probes

Exec probes run a command inside the container and check the exit code. These are not affected by mTLS at all because they do not go through the network:

```yaml
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 5
```

If you are having trouble with HTTP health probes and mTLS, switching to exec probes is a viable workaround, though it adds a process to your container.

## TCP Probes with mTLS

TCP liveness probes check if a port is open. These are not rewritten by Istio and go directly to the pod. With strict mTLS, a TCP probe will successfully establish a TCP connection (the port is open), but the TLS handshake will not happen because the kubelet does not participate in TLS. This means TCP probes usually still work with strict mTLS because they only check if the port accepts connections, not whether a full TLS handshake succeeds.

```yaml
livenessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 20
```

## Sidecar Startup Ordering

A related problem is the sidecar not being ready when the health probe fires. If the sidecar is not ready, the rewritten health probe fails. Use `holdApplicationUntilProxyStarts` to delay the application container until the sidecar is ready:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Or on a per-pod basis:

```yaml
annotations:
  proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

## Debugging Health Check Failures

If your pods are failing health checks after enabling strict mTLS:

1. Check if probe rewriting is happening:

```bash
kubectl get pod my-pod -o yaml | grep -B2 -A10 "livenessProbe\|readinessProbe"
```

2. Check the sidecar logs for health check requests:

```bash
kubectl logs my-pod -c istio-proxy | grep "healthz\|readyz\|app-health"
```

3. Verify the PeerAuthentication policy:

```bash
kubectl get peerauthentication -n default
istioctl x describe pod my-pod
```

4. Test the health endpoint directly from inside the pod:

```bash
kubectl exec my-pod -c my-app -- curl -s localhost:8080/healthz
```

5. Test the rewritten health endpoint:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15021/app-health/my-app/livez
```

Health check configuration with mTLS is one of those things that usually works automatically in Istio, but when it does not, it can be frustrating. Understanding the probe rewriting mechanism and knowing how to configure port-level exceptions gives you the tools to handle any situation.
