# How to Configure Cilium Network Policies with Layer 7 HTTP Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, Security

Description: Implement Layer 7 HTTP filtering in Cilium network policies to control traffic based on HTTP methods, paths, headers, and response codes.

---

Standard Kubernetes network policies operate at Layer 3 and 4, filtering based on IP addresses and ports. Cilium extends this with Layer 7 filtering that understands HTTP, allowing you to create policies based on HTTP methods, paths, headers, and more. This enables fine-grained security controls at the application level.

## Understanding Cilium Layer 7 Policies

Cilium uses eBPF to redirect matching HTTP traffic to a node-local Envoy proxy for Layer 7 enforcement. This provides:

- Low-latency filtering with an additional proxy hop
- Visibility into HTTP request details
- Method-based access control (GET, POST, DELETE, etc.)
- Path-based restrictions
- Header inspection and filtering
- Response code monitoring

Layer 7 policies complement Layer 3/4 policies. You still need basic network policies for port access, then add Layer 7 rules for application-level control.

## Installing Cilium with Layer 7 Support

Enable L7 policy support when installing Cilium:

```bash
helm install cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --set l7Proxy=true \
  --set operator.replicas=1
```

Verify the installation:

```bash
cilium status
cilium config view | grep enable-l7-proxy
```

## Basic HTTP Method Filtering

Allow only GET and POST requests to a service:

```yaml
# http-method-policy.yaml

apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-http-methods
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET"
        - method: "POST"
```

Deploy test applications:

```yaml
# api-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: hashicorp/http-echo
        args:
        - -listen=:8080
        - -text=API Server
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-server
  ports:
  - port: 8080
---
# frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: curl
        image: curlimages/curl
        command: ['sh', '-c', 'sleep 3600']
```

Apply and test:

```bash
kubectl apply -f api-server.yaml
kubectl apply -f http-method-policy.yaml

# Test allowed methods
kubectl exec -it deploy/frontend -- curl -X GET http://api-service:8080/  # Success
kubectl exec -it deploy/frontend -- curl -X POST http://api-service:8080/ # Success

# Test blocked method
kubectl exec -it deploy/frontend -- curl -X DELETE http://api-service:8080/ # Blocked (403)
```

## Path-Based Access Control

Restrict access based on URL paths:

```yaml
# path-based-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-path-restrictions
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  # Allow public access to /health and /metrics
  - fromEndpoints:
    - {}  # Any endpoint
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: "GET"
          path: "/health"
        - method: "GET"
          path: "/metrics"
  # Allow authenticated users access to /api/*
  - fromEndpoints:
    - matchLabels:
        role: authenticated
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: "GET"
          path: "/api/.*"  # Regex pattern
        - method: "POST"
          path: "/api/.*"
  # Allow admin access to everything
  - fromEndpoints:
    - matchLabels:
        role: admin
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: ".*"  # All methods
          path: "/.*"   # All paths
```

## Header-Based Filtering

Filter requests based on HTTP headers:

```yaml
# header-filtering-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-header-requirements
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        # Require API key header
        - method: "GET"
          path: "/api/.*"
          headers:
          - "X-API-Key: .*"  # Must have this header
        # Require specific API version
        - method: "POST"
          path: "/api/.*"
          headers:
          - "X-API-Version: v2"
          - "Content-Type: application/json"
```

Test header requirements:

```bash
# Without required header (blocked)
kubectl exec -it deploy/frontend -- curl http://api-service:8080/api/users

# With required header (allowed)
kubectl exec -it deploy/frontend -- curl -H "X-API-Key: secret123" http://api-service:8080/api/users
```

## Combining Layer 3/4 and Layer 7 Policies

Create comprehensive security with both layers:

```yaml
# combined-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-combined-policy
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  # Layer 3/4: Only accept from specific namespaces
  - fromEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      # Layer 7: Restrict HTTP methods and paths
      rules:
        http:
        - method: "GET"
          path: "/api/public/.*"
        - method: "POST"
          path: "/api/public/.*"
  # Admin access from platform namespace
  - fromEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: platform
        role: admin
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - {}  # Allow all HTTP traffic
```

## Read-Only Access Pattern

Implement read-only access for most users:

```yaml
# read-only-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: database-api-readonly
spec:
  endpointSelector:
    matchLabels:
      app: database-api
  ingress:
  # Most services get read-only access
  - fromEndpoints:
    - matchLabels:
        tier: application
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: "GET"
          path: "/.*"
        - method: "HEAD"
          path: "/.*"
  # Write service gets full access
  - fromEndpoints:
    - matchLabels:
        component: writer
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: "GET|POST|PUT|DELETE"
          path: "/.*"
```

## Monitoring L7 Policy Violations

Use Hubble or Cilium monitor to observe L7 verdicts. Policy audit mode is configured on the Cilium agent or endpoint, not as an annotation on an individual `CiliumNetworkPolicy`; it is primarily used for L3/L4 policy discovery.

Enable policy audit mode for all endpoints managed by the agent:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set policyAuditMode=true
```

Use Hubble for detailed visibility:

```bash
# Enable Hubble
cilium hubble enable --ui

# Port forward to Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Query L7 traffic
hubble observe --protocol http --from-pod frontend
```

## Limiting Request Rate by Method

CiliumNetworkPolicy does not provide a native `rateLimit` field for HTTP rules. Enforce request rate limits at the application, API gateway, ingress, or service mesh layer, and keep Cilium policies focused on which methods and paths are allowed:

```yaml
# write-method-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-write-methods
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        tier: frontend
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: "POST|PUT|DELETE"
          path: "/api/.*"
```

## Egress HTTP Filtering

Control outbound HTTP traffic from pods:

```yaml
# egress-http-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-egress-control
spec:
  endpointSelector:
    matchLabels:
      app: frontend
  egress:
  # Allow HTTP to external APIs
  - toFQDNs:
    - matchPattern: "api.external-service.com"
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        - method: "GET|POST"
          path: "/v1/.*"
          headers:
          - "Authorization: Bearer .*"
  # Allow internal API access
  - toEndpoints:
    - matchLabels:
        app: api-server
    toPorts:
    - ports:
      - port: "8080"
      rules:
        http:
        - method: ".*"
          path: "/.*"
  # Allow DNS
  - toEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: kube-system
        k8s:k8s-app: kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
```

## Debugging L7 Policies

Check if L7 proxy is processing traffic:

```bash
# Verify L7 proxy is enabled on endpoints
kubectl -n kube-system exec -it ds/cilium -- cilium-dbg endpoint list

# Check policy verdict
kubectl -n kube-system exec -it ds/cilium -- cilium-dbg monitor --type policy-verdict

# View L7 access logs
kubectl -n kube-system exec -it ds/cilium -- cilium-dbg monitor --type l7
```

Common issues:

**Policy not applying**: Verify endpoint labels match:

```bash
kubectl get pod -l app=api-server --show-labels
```

**L7 proxy not intercepting**: Check if ports are in policy enforcement mode:

```bash
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint get <endpoint-id>
```

**High latency**: L7 inspection adds overhead. Monitor:

```bash
kubectl -n kube-system exec ds/cilium -- cilium-dbg metrics list | grep proxy
```

## Performance Considerations

L7 policies have performance impact:

- Additional latency from proxying through Envoy
- CPU usage increases with policy complexity
- Memory usage grows with connection count

Optimize performance:

1. Use specific paths instead of broad regex patterns
2. Limit number of header matches
3. Consider implementing rate limiting at application level for high-traffic endpoints
4. Monitor Cilium proxy resource usage:

```bash
kubectl top pods -n kube-system -l k8s-app=cilium
```

Cilium's Layer 7 HTTP filtering provides application-level security that standard Kubernetes network policies cannot match. Use method-based filtering for read/write separation, path-based rules for endpoint protection, and header inspection for authentication enforcement. The eBPF datapath redirects matching traffic to Envoy for policy enforcement, making these controls practical for production workloads requiring fine-grained HTTP security.
