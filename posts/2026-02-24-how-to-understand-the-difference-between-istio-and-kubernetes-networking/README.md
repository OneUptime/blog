# How to Understand the Difference Between Istio and Kubernetes Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Networking, Service Mesh, Comparison

Description: A clear comparison of Istio and Kubernetes networking features, explaining what each layer handles and how they work together in a cluster.

---

One of the most common points of confusion when adopting Istio is understanding how it relates to Kubernetes networking. They are not competing technologies. They work at different layers and complement each other. But knowing exactly where one ends and the other begins is important for troubleshooting and architecture decisions.

## What Kubernetes Networking Gives You

Kubernetes provides the foundational networking layer:

### Pod-to-Pod Communication

Every pod gets its own IP address, and every pod can communicate with every other pod directly using those IPs. This is handled by the CNI (Container Network Interface) plugin - things like Calico, Cilium, Flannel, or the cloud provider's CNI.

```bash
# Every pod has its own IP
kubectl get pods -o wide
# NAME       READY   STATUS    IP            NODE
# app-a      1/1     Running   10.244.1.5    node-1
# app-b      1/1     Running   10.244.2.8    node-2
```

### Service Discovery and Load Balancing

Kubernetes Services provide a stable DNS name and virtual IP (ClusterIP) for a group of pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
  - port: 8080
    targetPort: 8080
```

When something calls `my-service:8080`, kube-proxy (or the CNI) routes the request to one of the backing pods using round-robin load balancing. CoreDNS resolves `my-service` to the ClusterIP.

### Ingress

Kubernetes Ingress handles external traffic coming into the cluster:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 8080
```

### Network Policies

Kubernetes NetworkPolicy provides basic L3/L4 firewall rules:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

## What Istio Adds on Top

Istio does not replace Kubernetes networking. It adds a layer on top that provides features Kubernetes does not have.

### Layer 7 Traffic Management

Kubernetes Services only support round-robin load balancing across pods that match a label selector. You cannot route based on HTTP headers, split traffic by percentage, or route different URL paths to different backends.

Istio's VirtualService gives you all of this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-version:
          exact: "beta"
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 90
    - destination:
        host: my-service
        subset: v2
      weight: 10
```

This routes requests with the `x-version: beta` header to v2, and splits remaining traffic 90/10 between v1 and v2. Kubernetes cannot do this natively.

### Mutual TLS (Encryption)

Kubernetes does not encrypt traffic between pods by default. The CNI moves packets between nodes, but they travel in plaintext (unless the CNI has encryption features, which most do not enable by default).

Istio automatically encrypts all service-to-service traffic with mTLS:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

No application changes needed. The sidecars handle encryption and certificate management.

### L7 Authorization

Kubernetes NetworkPolicy works at L3/L4 - it can allow/deny traffic based on IP addresses and ports. It cannot make decisions based on HTTP methods, paths, or headers.

Istio's AuthorizationPolicy works at L7:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-access
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web-app"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/products*"]
```

This says: only the web-app service account from the frontend namespace can make GET requests to /api/products. You cannot express this with Kubernetes NetworkPolicy.

### Observability

Kubernetes gives you basic pod metrics through the metrics-server (CPU, memory). It does not give you request-level metrics like HTTP status codes, latency distributions, or request rates.

Istio generates detailed L7 metrics for every request:

```text
istio_requests_total{source_app="frontend", destination_app="backend", response_code="200"}
istio_request_duration_milliseconds_bucket{...}
```

You also get distributed tracing and access logs without instrumenting your application.

### Resilience Features

Kubernetes has readiness and liveness probes, but nothing for circuit breaking, retry policies, or request timeouts at the infrastructure level.

Istio provides all of these:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Side-by-Side Comparison

| Feature | Kubernetes | Istio |
|---------|-----------|-------|
| Pod-to-pod networking | Yes (CNI) | No (uses Kubernetes) |
| Service discovery | Yes (DNS + ClusterIP) | Yes (extends Kubernetes) |
| Load balancing | Round-robin only | Round-robin, least request, random, consistent hash |
| Traffic splitting | No | Yes (weighted, header-based, URI-based) |
| Encryption | No (by default) | Yes (automatic mTLS) |
| Network policies | L3/L4 only | L3/L4 + L7 |
| Retries/timeouts | No | Yes |
| Circuit breaking | No | Yes |
| Request-level metrics | No | Yes |
| Distributed tracing | No | Yes |
| Fault injection | No | Yes |
| Canary deployments | No | Yes |

## How They Work Together

The key insight is that Istio sits on top of Kubernetes networking, not beside it:

1. **Kubernetes CNI** handles L3 connectivity (pod IPs, cross-node networking)
2. **Kubernetes Services** provide service discovery (DNS and ClusterIP)
3. **Istio sidecars** intercept traffic after the application sends it and before it reaches the destination
4. **Istio control plane** tells the sidecars how to handle the traffic

When a request goes from service A to service B:

```text
App A -> iptables redirect -> Envoy sidecar A -> [network] -> Envoy sidecar B -> App B
```

The `[network]` part is handled by Kubernetes networking (CNI, kube-proxy). Istio manages everything that happens in the Envoy sidecars.

## When to Use What

Use Kubernetes networking features when:
- You need basic service discovery and DNS
- You want L3/L4 network segmentation (NetworkPolicy)
- You are running a simple setup with a few services

Add Istio when you need:
- Traffic splitting for canary deployments
- Automatic mTLS between services
- L7 authorization policies
- Detailed request-level observability
- Resilience features like retries and circuit breaking

## Can They Conflict?

Mostly, Kubernetes and Istio networking coexist peacefully. But there are a few edge cases:

- **NetworkPolicy + Istio**: Kubernetes NetworkPolicy applies before Istio's sidecar. If NetworkPolicy blocks traffic, Istio never sees it. They can be used together, but you need to account for Istio's ports (15001, 15006, 15014, etc.).

- **kube-proxy + Istio**: When Istio is active, the sidecar handles service routing instead of kube-proxy. The Envoy sidecar resolves the ClusterIP to pod IPs itself. kube-proxy rules still exist but are bypassed for mesh traffic.

- **Ingress + Istio Gateway**: You can use both, but it is simpler to pick one. If you are using Istio, use Istio Gateway instead of Kubernetes Ingress to get the full feature set.

Understanding these two layers and how they interact makes you much more effective at diagnosing networking issues. When something is not reachable, you can quickly determine if the problem is at the Kubernetes level (pod cannot reach pod) or the Istio level (sidecar is blocking or misrouting traffic).
