# How to Handle Application Changes Required for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Application Development, Service Mesh, Migration

Description: A guide covering the application-level changes your services need when adopting Istio, from health checks to header propagation to protocol detection.

---

One of the biggest selling points of Istio is that it works transparently - you add a sidecar to your pod and everything just works. That is mostly true, but "mostly" can bite you in production. There are real application changes that you need to make for Istio to work properly, and skipping them leads to broken tracing, flaky health checks, and mysterious connection failures.

This guide covers the actual code and configuration changes your applications need.

## Health Check Adjustments

Kubernetes health checks (liveness and readiness probes) can conflict with Istio's sidecar proxy. The issue is timing: when a pod starts up, the Envoy sidecar might not be ready yet, but Kubernetes is already sending health check requests.

### The Problem

If your health check makes a network call (like checking a database connection), and the sidecar is not ready, the check fails and Kubernetes restarts the pod. This creates a restart loop.

### The Fix

Istio automatically rewrites HTTP health check probes to go through the sidecar by default. But you need to make sure your probes are configured as HTTP probes, not TCP or exec probes that bypass the sidecar:

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
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

If you need to keep non-HTTP probes, you can exclude the probe ports from sidecar interception:

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
        livenessProbe:
          tcpSocket:
            port: 8081
```

## Protocol Detection and Named Ports

Istio needs to know what protocol each port uses so it can apply the right filters. If Istio cannot detect the protocol, it falls back to treating traffic as plain TCP, which means you lose HTTP-level routing, metrics, and tracing.

### Name Your Ports

The simplest way to help Istio detect protocols is to name your service ports correctly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  ports:
  - name: http-web      # Prefix with http-, grpc-, tcp-, etc.
    port: 80
    targetPort: 8080
  - name: grpc-api
    port: 9090
    targetPort: 9090
  - name: tcp-custom
    port: 3000
    targetPort: 3000
```

Valid protocol prefixes are: `http`, `http2`, `https`, `grpc`, `grpc-web`, `tcp`, `tls`, `mongo`, `mysql`, `redis`. If you just use `http` as the full name (not as a prefix), that works too.

### What Happens Without Named Ports

If your port is named something like `web` or `api` without a protocol prefix, Istio uses protocol sniffing to guess. This usually works for HTTP/1.1 and HTTP/2, but it adds latency to the first request and can fail for protocols that do not have a clear signature.

```bash
# Check which ports Istio detected correctly
istioctl analyze -n my-namespace
```

If you see warnings about protocol detection, fix the port names.

## Trace Header Propagation

Istio generates distributed traces by having the sidecar add trace headers to requests. But for traces to span multiple services, your application needs to propagate those headers. The sidecar cannot do this for you because it does not understand the relationship between an incoming request and the outgoing requests your app makes.

### Headers to Propagate

Your application needs to read these headers from incoming requests and include them in all outgoing requests:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `b3`
- `traceparent`
- `tracestate`

### Example: Node.js Header Propagation

```javascript
const axios = require('axios');

function extractTraceHeaders(req) {
  const headers = {};
  const traceHeaders = [
    'x-request-id',
    'x-b3-traceid',
    'x-b3-spanid',
    'x-b3-parentspanid',
    'x-b3-sampled',
    'x-b3-flags',
    'b3',
    'traceparent',
    'tracestate'
  ];

  for (const header of traceHeaders) {
    if (req.headers[header]) {
      headers[header] = req.headers[header];
    }
  }
  return headers;
}

app.get('/api/orders', async (req, res) => {
  const traceHeaders = extractTraceHeaders(req);

  // Include trace headers in downstream calls
  const products = await axios.get('http://product-service:8080/products', {
    headers: traceHeaders
  });

  res.json({ orders: [], products: products.data });
});
```

### Example: Java Spring Boot Header Propagation

```java
@RestController
public class OrderController {

    private static final List<String> TRACE_HEADERS = List.of(
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    );

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/api/orders")
    public ResponseEntity<?> getOrders(HttpServletRequest request) {
        HttpHeaders headers = new HttpHeaders();
        for (String header : TRACE_HEADERS) {
            String value = request.getHeader(header);
            if (value != null) {
                headers.set(header, value);
            }
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<String> products = restTemplate.exchange(
            "http://product-service:8080/products",
            HttpMethod.GET, entity, String.class
        );

        return ResponseEntity.ok(Map.of("products", products.getBody()));
    }
}
```

## Handling Server-First Protocols

Some protocols like MySQL, MongoDB, and SMTP have the server send data first (before the client sends anything). Istio's protocol sniffing cannot detect these properly because it waits for the client to send data first.

For server-first protocols, you have two options:

### Option 1: Name the Port Explicitly

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  ports:
  - name: mysql
    port: 3306
    targetPort: 3306
```

### Option 2: Exclude the Port from Sidecar

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "3306"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3306"
```

## Startup Ordering Issues

The Istio sidecar and your application container start concurrently. If your app tries to make network calls during startup (like connecting to a database or fetching configuration), those calls might fail because the sidecar is not ready yet.

### Fix: Hold Application Start Until Proxy Is Ready

Istio 1.7+ supports holding the application container start until the sidecar is ready. Enable this globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    holdApplicationUntilProxyStarts: true
```

Or per pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

## Graceful Shutdown

When a pod is being terminated, the sidecar and the application receive the SIGTERM signal simultaneously. If the sidecar shuts down before the app finishes draining connections, in-flight requests will fail.

Configure a termination grace period and make sure your app handles graceful shutdown:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The `sleep 5` in the preStop hook gives the sidecar time to drain its connections before the application starts shutting down.

## Outbound Traffic and ServiceEntry

By default, Istio allows all outbound traffic from your pods. But if you configure the mesh to only allow registered services (which is recommended for security), your apps will lose access to external APIs unless you create ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Audit all external dependencies your apps have and create ServiceEntry resources for each one before switching the outbound traffic policy.

## Summary of Changes Checklist

Here is a quick checklist to work through for each service:

1. Name all service ports with protocol prefixes
2. Use HTTP health checks where possible
3. Add trace header propagation to application code
4. Handle startup ordering with holdApplicationUntilProxyStarts
5. Add preStop hooks for graceful shutdown
6. Create ServiceEntry resources for external dependencies
7. Exclude server-first protocol ports if needed

None of these changes are massive on their own, but skipping them is the number one reason teams hit problems during Istio adoption. Work through this list before you enable sidecar injection for each namespace, and your migration will be much smoother.
