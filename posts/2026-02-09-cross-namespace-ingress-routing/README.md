# How to Configure Cross-Namespace Ingress Routing in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Namespaces, Routing, Multi-Tenancy

Description: Configure Kubernetes Ingress to route traffic across multiple namespaces, enabling centralized ingress management, multi-tenant architectures, and flexible service exposure strategies.

---

Kubernetes Ingress resources typically route traffic to services within the same namespace. But real-world architectures often need cross-namespace routing for multi-tenant setups, shared ingress controllers, or centralized traffic management. This guide shows you how to configure Ingress to route traffic across namespace boundaries.

## Understanding Cross-Namespace Routing

By default, an Ingress resource can only reference services in its own namespace. This is a security feature that prevents unauthorized access across namespace boundaries. However, several approaches enable cross-namespace routing while maintaining security.

Common use cases:

- Shared ingress controller serving multiple teams
- Centralized ingress configuration separate from application namespaces
- Platform teams managing routing for development teams
- Multi-tenant SaaS applications

## Approach 1: Ingress Per Namespace

The simplest approach: create Ingress resources in each namespace.

### Separate Ingress Resources

```yaml
# In namespace: team-a
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: team-a-ingress
  namespace: team-a
spec:
  ingressClassName: nginx
  rules:
  - host: team-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: team-a-service
            port:
              number: 8080
---
# In namespace: team-b
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: team-b-ingress
  namespace: team-b
spec:
  ingressClassName: nginx
  rules:
  - host: team-b.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: team-b-service
            port:
              number: 8080
```

This approach:

- Keeps configuration within namespace boundaries
- Allows teams to manage their own ingress
- Works with all ingress controllers
- Maintains clear separation of concerns

Deploy ingress controller once:

```bash
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.watchIngressWithoutClass=true
```

## Approach 2: External Service References

Use ExternalName services to reference services in other namespaces.

### Create ExternalName Service

```yaml
# In namespace: ingress-configs
apiVersion: v1
kind: Service
metadata:
  name: team-a-service-ref
  namespace: ingress-configs
spec:
  type: ExternalName
  externalName: team-a-service.team-a.svc.cluster.local
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: centralized-ingress
  namespace: ingress-configs
spec:
  ingressClassName: nginx
  rules:
  - host: team-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: team-a-service-ref
            port:
              number: 8080
```

This approach:

- Centralizes ingress configuration
- Uses standard Kubernetes resources
- Works with most ingress controllers
- Requires creating ExternalName services for each backend

Limitations:

- ExternalName services don't support session affinity
- Some ingress controllers handle ExternalName differently
- Adds extra DNS lookup overhead

## Approach 3: NGINX Ingress Controller Annotations

NGINX Ingress supports cross-namespace routing via annotations.

### Using Backend Protocol Annotation

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cross-namespace-ingress
  namespace: ingress-configs
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/upstream-vhost: "team-a-service.team-a.svc.cluster.local"
spec:
  ingressClassName: nginx
  rules:
  - host: team-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: team-a-service-proxy
            port:
              number: 8080
```

Create a local service that proxies:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: team-a-service-proxy
  namespace: ingress-configs
spec:
  type: ExternalName
  externalName: team-a-service.team-a.svc.cluster.local
```

### Using Configuration Snippet

For more control, use configuration snippets:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: custom-routing
  namespace: ingress-configs
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_pass http://team-a-service.team-a.svc.cluster.local:8080;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
spec:
  ingressClassName: nginx
  rules:
  - host: team-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dummy-service
            port:
              number: 80
```

## Approach 4: Gateway API (Future-Proof)

The Gateway API natively supports cross-namespace routing.

### Install Gateway API

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

### Create Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: gateway-system
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All  # Allow routes from any namespace
```

### Create HTTPRoute in Different Namespaces

```yaml
# In namespace: team-a
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: team-a-route
  namespace: team-a
spec:
  parentRefs:
  - name: shared-gateway
    namespace: gateway-system  # Reference gateway in different namespace
  hostnames:
  - "team-a.example.com"
  rules:
  - backendRefs:
    - name: team-a-service
      port: 8080
---
# In namespace: team-b
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: team-b-route
  namespace: team-b
spec:
  parentRefs:
  - name: shared-gateway
    namespace: gateway-system
  hostnames:
  - "team-b.example.com"
  rules:
  - backendRefs:
    - name: team-b-service
      port: 8080
```

Gateway API requires ReferenceGrant for cross-namespace access:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-team-routes
  namespace: gateway-system
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-a
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-b
  to:
  - group: ""
    kind: Service
```

## Approach 5: Service Mesh Integration

Service meshes like Istio provide cross-namespace routing.

### Istio VirtualService

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cross-namespace-routing
  namespace: istio-system
spec:
  hosts:
  - "team-a.example.com"
  gateways:
  - shared-gateway
  http:
  - match:
    - uri:
        prefix: "/v1"
    route:
    - destination:
        host: team-a-service.team-a.svc.cluster.local
        port:
          number: 8080
  - match:
    - uri:
        prefix: "/v2"
    route:
    - destination:
        host: team-a-v2-service.team-a.svc.cluster.local
        port:
          number: 8080
```

Configure Istio Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*.example.com"
```

## Security Considerations

When routing across namespaces, implement proper security:

### RBAC for Ingress Management

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ingress-manager
  namespace: team-a
rules:
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-ingress-manager
  namespace: team-a
subjects:
- kind: ServiceAccount
  name: team-a-admin
  namespace: team-a
roleRef:
  kind: Role
  name: ingress-manager
  apiGroup: rbac.authorization.k8s.io
```

### Network Policies

Restrict traffic flow between namespaces:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: team-a
spec:
  podSelector:
    matchLabels:
      app: team-a-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
```

### Limit Cross-Namespace Access

For ExternalName approach, restrict which namespaces can be referenced:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: allowed-service-ref
  namespace: ingress-configs
  labels:
    allowed-reference: "true"
spec:
  type: ExternalName
  externalName: service.allowed-namespace.svc.cluster.local
```

Implement admission webhook to validate:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: validate-cross-namespace-ingress
webhooks:
- name: ingress.validation.example.com
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["networking.k8s.io"]
    apiVersions: ["v1"]
    resources: ["ingresses"]
  clientConfig:
    service:
      name: ingress-validator
      namespace: platform-system
```

## Multi-Tenant Routing Patterns

### Path-Based Multi-Tenancy

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-tenant-ingress
  namespace: platform
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /tenant-a
        pathType: Prefix
        backend:
          service:
            name: tenant-a-ref
            port:
              number: 8080
      - path: /tenant-b
        pathType: Prefix
        backend:
          service:
            name: tenant-b-ref
            port:
              number: 8080
```

### Host-Based Multi-Tenancy

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: host-based-routing
  namespace: platform
spec:
  ingressClassName: nginx
  rules:
  - host: tenant-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tenant-a-ref
            port:
              number: 8080
  - host: tenant-b.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tenant-b-ref
            port:
              number: 8080
```

## Monitoring Cross-Namespace Routing

Track routing behavior across namespaces:

```bash
# View all ingress resources
kubectl get ingress -A

# Check specific routing
kubectl describe ingress <name> -n <namespace>

# For NGINX Ingress, check backend status
kubectl exec -n ingress-nginx nginx-ingress-controller-xxxxx -- \
  curl http://localhost:10254/nginx_status
```

Create alerts for routing failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ingress-alerts
  namespace: monitoring
spec:
  groups:
  - name: ingress
    rules:
    - alert: CrossNamespaceRoutingFailure
      expr: |
        rate(nginx_ingress_controller_requests{status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate in cross-namespace routing"
```

## Best Practices

When implementing cross-namespace routing:

- Start with per-namespace Ingress resources for simplicity
- Use ExternalName services for centralized management
- Implement strict RBAC for ingress configuration
- Apply network policies to control traffic flow
- Document cross-namespace dependencies
- Use Gateway API for new deployments
- Monitor routing errors and latency
- Validate configurations in staging first
- Consider service mesh for complex scenarios
- Keep ingress controller version current

Cross-namespace routing enables powerful multi-tenant and centralized management patterns in Kubernetes. Choose the approach that fits your security requirements and operational model, then implement appropriate controls to maintain isolation between tenants.
