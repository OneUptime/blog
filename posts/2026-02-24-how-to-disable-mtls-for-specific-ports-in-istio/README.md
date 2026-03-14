# How to Disable mTLS for Specific Ports in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Port Configuration, Kubernetes, Security

Description: How to exclude specific ports from mutual TLS enforcement in Istio for health checks, metrics scraping, and legacy integrations.

---

Running strict mTLS across your mesh is great for security, but some ports need to be accessible without client certificates. The most common cases are health check endpoints, Prometheus metrics ports, and custom ports used by external monitoring agents. Rather than downgrading the entire service to permissive mode, Istio lets you configure mTLS on a per-port basis.

This keeps your main application traffic encrypted while allowing specific ports to accept plain text connections.

## Port-Level mTLS in PeerAuthentication

The `portLevelMtls` field in PeerAuthentication lets you override the default mTLS mode for specific ports. The field takes a map of port numbers to mTLS settings.

Here is a service running in strict mode with port 9090 (metrics) set to permissive:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

And here is one where the metrics port is completely excluded from mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE
```

The difference between PERMISSIVE and DISABLE:
- **PERMISSIVE**: Accepts both mTLS and plain text on that port
- **DISABLE**: Completely disables mTLS on that port, connections are always plain text

## Use Case: Prometheus Metrics Scraping

Prometheus typically scrapes metrics by connecting directly to pod endpoints without going through a sidecar. If your service exposes metrics on port 9090 and the namespace runs in strict mTLS mode, Prometheus scrapes will fail because Prometheus does not present an mTLS certificate.

The fix:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

Note that this is a namespace-wide policy (no selector). It applies to all pods in the namespace, allowing Prometheus to scrape port 9090 on any pod without mTLS.

If only specific services expose metrics:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: api-server-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

### Istio's Built-In Prometheus Integration

Worth noting: if you use Istio's Prometheus integration that scrapes sidecar metrics on port 15090, that port is already handled by Istio. You do not need to add a port-level exception for it. The exception is needed for your application's custom metrics port.

## Use Case: Health Check Endpoints

Kubernetes liveness and readiness probes come from the kubelet, which does not have mesh certificates. Istio handles HTTP probes automatically by rewriting them to go through the sidecar, but there are scenarios where this does not work:

- TCP probes (the kubelet opens a raw TCP connection)
- gRPC health checks from external systems
- Custom health check agents

If your health checks use a dedicated port:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: DISABLE
```

Where 8081 is the port your health check endpoint listens on.

## Use Case: External Monitoring Agents

DaemonSet-based monitoring agents (Datadog, New Relic) running on each node sometimes connect directly to application pods. If these agents do not have sidecars, they cannot establish mTLS connections.

Instead of injecting sidecars into monitoring agents (which introduces its own complications), open the monitoring port:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: app-mtls-with-monitoring
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8126:
      mode: PERMISSIVE
    9090:
      mode: PERMISSIVE
```

Port 8126 is a common port for APM agents to receive trace data, and 9090 for metrics.

## Multiple Port Exceptions

You can specify as many port exceptions as needed:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: complex-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: complex-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: STRICT
    8081:
      mode: PERMISSIVE
    9090:
      mode: PERMISSIVE
    15014:
      mode: DISABLE
    3000:
      mode: DISABLE
```

Each port gets its own mode. Ports not listed inherit the default mode (STRICT in this case).

## Verifying Port-Level Configuration

After applying port-level mTLS settings, verify they are working:

```bash
# Check the effective configuration
istioctl x describe pod <pod-name> -n production
```

Test the strict port (should fail from a non-sidecar pod):

```bash
kubectl run test --image=curlimages/curl -n production \
  --labels="sidecar.istio.io/inject=false" --restart=Never -it --rm -- \
  curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api
```

Test the permissive port (should succeed from a non-sidecar pod):

```bash
kubectl run test --image=curlimages/curl -n production \
  --labels="sidecar.istio.io/inject=false" --restart=Never -it --rm -- \
  curl -s -o /dev/null -w "%{http_code}" http://my-service:9090/metrics
```

## Important Considerations

### Port Numbers Are Container Ports

The port numbers in `portLevelMtls` refer to the container ports that the application listens on, not the Kubernetes Service port. If your Service maps port 80 to container port 8080, use 8080 in the PeerAuthentication.

```yaml
# Service definition
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http
    port: 80          # Service port
    targetPort: 8080   # Container port - use THIS in portLevelMtls
```

### Security Implications

Every port you exclude from mTLS is a potential attack vector. An attacker who gains network access can connect to those ports without authentication. Keep the number of excluded ports to a minimum and only open ports that genuinely need plain text access.

Consider alternatives before disabling mTLS:
- Can the monitoring agent be given a sidecar?
- Can health checks go through the sidecar's rewritten path?
- Can the external system be configured to present mTLS certificates?

### Interaction with AuthorizationPolicy

Port-level mTLS settings affect what connections are accepted at the TLS layer. AuthorizationPolicy works at a higher level (HTTP layer). Even if you disable mTLS on a port, you can still use AuthorizationPolicy to restrict which source IPs or principals can access it:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-metrics-port
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  rules:
  - from:
    - source:
        ipBlocks:
        - "10.0.0.0/8"
    to:
    - operation:
        ports:
        - "9090"
```

This allows connections to the metrics port only from internal IPs, adding a layer of protection even without mTLS.

Port-level mTLS configuration is a practical necessity in most real-world meshes. Use it sparingly, document why each exception exists, and revisit them periodically to see if they can be removed.
