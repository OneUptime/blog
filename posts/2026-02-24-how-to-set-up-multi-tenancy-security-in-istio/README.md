# How to Set Up Multi-Tenancy Security in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Tenancy, Security, Namespace Isolation, Kubernetes

Description: How to implement multi-tenant security in Istio with namespace isolation, Sidecar resources, authorization policies, and tenant-specific configurations.

---

Running multiple tenants on a shared Kubernetes cluster is cost-effective but risky if isolation is weak. Tenants shouldn't see each other's traffic, access each other's services, or interfere with each other's configurations. Istio provides several mechanisms to create strong isolation boundaries between tenants while still allowing shared infrastructure components.

Multi-tenancy in Istio typically means one namespace (or a group of namespaces) per tenant, with strict policies preventing cross-tenant access.

## Tenant Namespace Setup

Start by organizing namespaces per tenant with clear labeling:

```bash
kubectl create namespace tenant-acme
kubectl create namespace tenant-globex
kubectl create namespace tenant-initech

kubectl label namespace tenant-acme tenant=acme istio-injection=enabled
kubectl label namespace tenant-globex tenant=globex istio-injection=enabled
kubectl label namespace tenant-initech tenant=initech istio-injection=enabled
```

Labels help with policy targeting and make it clear which tenant owns which namespace.

## Strict mTLS Per Tenant

Enforce mTLS in each tenant namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: tenant-acme
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: tenant-globex
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: tenant-initech
spec:
  mtls:
    mode: STRICT
```

Strict mTLS ensures that only pods with valid Istio identities can communicate. Since identities include the namespace, you can verify the tenant in authorization policies.

## Default Deny and Tenant Isolation

Apply a deny-all policy in each tenant namespace, then allow only intra-tenant traffic:

```yaml
# Deny all traffic by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: tenant-acme
spec:
  {}
---
# Allow traffic within the same tenant
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-tenant
  namespace: tenant-acme
spec:
  rules:
    - from:
        - source:
            namespaces:
              - tenant-acme
---
# Allow health probes
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: tenant-acme
spec:
  rules:
    - to:
        - operation:
            paths:
              - /healthz
              - /readyz
            methods:
              - GET
```

Repeat this pattern for each tenant namespace. Services within `tenant-acme` can communicate freely, but nothing from `tenant-globex` or `tenant-initech` can reach them.

## Sidecar Resource for Configuration Isolation

Without a Sidecar resource, every sidecar in the mesh gets configuration for every service. This means a tenant's sidecar knows the service endpoints of other tenants. While the authorization policy blocks actual traffic, the information leakage is still undesirable.

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: tenant-sidecar
  namespace: tenant-acme
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "shared-services/*"
```

This limits what services the sidecar knows about. Pods in `tenant-acme` only see their own services, the Istio control plane, and shared services. They have no visibility into `tenant-globex` or `tenant-initech` services at the configuration level.

Apply the same pattern for other tenants:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: tenant-sidecar
  namespace: tenant-globex
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "shared-services/*"
```

## Shared Services

Most multi-tenant setups have shared services that all tenants need to access, like logging, monitoring, or a shared database:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: shared-db-access
  namespace: shared-services
spec:
  selector:
    matchLabels:
      app: shared-database
  rules:
    - from:
        - source:
            namespaces:
              - tenant-acme
              - tenant-globex
              - tenant-initech
      to:
        - operation:
            ports:
              - "5432"
```

This allows all tenants to access the shared database but only on port 5432.

If shared services need to be accessible but with different permission levels per tenant, use service account-based rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: shared-api-access
  namespace: shared-services
spec:
  selector:
    matchLabels:
      app: shared-api
  rules:
    # Acme gets full access
    - from:
        - source:
            principals:
              - cluster.local/ns/tenant-acme/sa/acme-app
      to:
        - operation:
            methods:
              - GET
              - POST
              - PUT
              - DELETE
    # Globex gets read-only access
    - from:
        - source:
            principals:
              - cluster.local/ns/tenant-globex/sa/globex-app
      to:
        - operation:
            methods:
              - GET
```

## Ingress Isolation

Each tenant should have their own ingress configuration. You can use a single shared ingress gateway with tenant-specific routing:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tenant-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-acme
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: acme-tls-cert
      hosts:
        - "acme.example.com"
    - port:
        number: 443
        name: https-globex
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: globex-tls-cert
      hosts:
        - "globex.example.com"
```

Each tenant's VirtualService routes traffic to their namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: acme-ingress
  namespace: tenant-acme
spec:
  hosts:
    - "acme.example.com"
  gateways:
    - istio-system/tenant-gateway
  http:
    - route:
        - destination:
            host: frontend.tenant-acme.svc.cluster.local
            port:
              number: 8080
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: globex-ingress
  namespace: tenant-globex
spec:
  hosts:
    - "globex.example.com"
  gateways:
    - istio-system/tenant-gateway
  http:
    - route:
        - destination:
            host: frontend.tenant-globex.svc.cluster.local
            port:
              number: 8080
```

The authorization policy on each tenant's frontend should allow the ingress gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-gateway
  namespace: tenant-acme
spec:
  selector:
    matchLabels:
      app: frontend
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account
```

## Egress Isolation Per Tenant

Each tenant might need access to different external services. Use namespace-scoped ServiceEntries:

```yaml
# Acme can access Stripe
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe
  namespace: tenant-acme
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  exportTo:
    - "."
---
# Globex can access PayPal
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: paypal
  namespace: tenant-globex
spec:
  hosts:
    - api.paypal.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  exportTo:
    - "."
```

Acme can't reach PayPal, and Globex can't reach Stripe. Each tenant's external dependencies are isolated.

## Resource Quotas for Tenants

Istio policies don't limit compute resources. Combine them with Kubernetes resource quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "20"
```

This prevents a tenant from consuming all cluster resources and affecting other tenants.

## RBAC for Tenant Administrators

Give each tenant's team admin access only to their namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-admin
  namespace: tenant-acme
subjects:
  - kind: Group
    name: acme-engineers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: admin
  apiGroup: rbac.authorization.k8s.io
```

Tenants can manage their own deployments, services, and Istio resources within their namespace but can't modify anything in other namespaces.

## Monitoring Per Tenant

Use Istio's telemetry to track metrics per tenant namespace:

```bash
# Check traffic stats for a tenant
kubectl exec -it <pod-name> -c istio-proxy -n tenant-acme -- \
  pilot-agent request GET stats | grep "upstream_rq_total"
```

In Prometheus, filter metrics by namespace to get per-tenant dashboards:

```promql
sum(rate(istio_requests_total{destination_workload_namespace="tenant-acme"}[5m])) by (destination_service)
```

Multi-tenancy security in Istio is built on four pillars: namespace isolation with deny-all policies, configuration isolation with Sidecar resources, ingress/egress isolation with scoped policies, and resource isolation with Kubernetes quotas and RBAC. Layer all four together for strong tenant boundaries.
