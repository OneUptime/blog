# How to Set Up Per-Tenant Ingress in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingresses, Multi-Tenancy, Gateway, Networking

Description: Configure per-tenant ingress routing in Istio using dedicated gateways, shared gateways with tenant routing, and subdomain-based approaches.

---

In a multi-tenant Istio setup, each tenant needs a way to expose their services to external traffic. The question is how to structure the ingress layer. Do you give each tenant their own gateway? Share one gateway across all tenants? Use subdomains, paths, or headers to route traffic?

The answer depends on how much isolation you need and how many tenants you have. Here are the main approaches, with concrete configuration for each.

## Option 1: Shared Gateway with Per-Tenant VirtualServices

This is the most common approach. You run a single Istio ingress gateway and route traffic to different tenant namespaces based on the hostname.

First, create the shared gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: wildcard-tls
    hosts:
    - "*.example.com"
```

The wildcard TLS certificate covers all tenant subdomains. Store it as a Kubernetes secret in the `istio-system` namespace:

```bash
kubectl create secret tls wildcard-tls \
  --cert=wildcard.crt \
  --key=wildcard.key \
  -n istio-system
```

Now each tenant creates a VirtualService in their own namespace that binds to this shared gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tenant-a-ingress
  namespace: tenant-a
spec:
  hosts:
  - "tenant-a.example.com"
  gateways:
  - istio-system/shared-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: frontend
        port:
          number: 80
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tenant-b-ingress
  namespace: tenant-b
spec:
  hosts:
  - "tenant-b.example.com"
  gateways:
  - istio-system/shared-gateway
  http:
  - route:
    - destination:
        host: web-app
        port:
          number: 3000
```

The advantage here is simplicity. One gateway, one IP address, one load balancer. DNS just needs wildcard or per-tenant CNAME records pointing to the gateway's external IP.

## Option 2: Dedicated Gateway Per Tenant

For stronger isolation, give each tenant their own gateway deployment. This means separate Envoy pods, separate IP addresses, and separate scaling.

Deploy a tenant-specific gateway:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tenant-a-gateway
  namespace: tenant-a
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tenant-a-gateway
      istio: tenant-a-gateway
  template:
    metadata:
      labels:
        app: tenant-a-gateway
        istio: tenant-a-gateway
      annotations:
        inject.istio.io/templates: gateway
        sidecar.istio.io/inject: "true"
    spec:
      serviceAccountName: tenant-a-gateway
      containers:
      - name: istio-proxy
        image: auto
        securityContext:
          capabilities:
            drop:
            - ALL
          runAsUser: 1337
          runAsGroup: 1337
---
apiVersion: v1
kind: Service
metadata:
  name: tenant-a-gateway
  namespace: tenant-a
spec:
  type: LoadBalancer
  selector:
    app: tenant-a-gateway
  ports:
  - port: 443
    name: https
    targetPort: 8443
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tenant-a-gateway
  namespace: tenant-a
```

Then create the Gateway and VirtualService resources pointing to this dedicated deployment:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tenant-a-gateway
  namespace: tenant-a
spec:
  selector:
    istio: tenant-a-gateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: tenant-a-tls
    hosts:
    - "tenant-a.example.com"
    - "custom-domain.tenant-a.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tenant-a-routes
  namespace: tenant-a
spec:
  hosts:
  - "tenant-a.example.com"
  - "custom-domain.tenant-a.com"
  gateways:
  - tenant-a-gateway
  http:
  - route:
    - destination:
        host: api-service
        port:
          number: 8080
```

The TLS secret for a tenant-specific gateway lives in the tenant's namespace:

```bash
kubectl create secret tls tenant-a-tls \
  --cert=tenant-a.crt \
  --key=tenant-a.key \
  -n tenant-a
```

This approach gives each tenant their own IP address, which is useful when tenants need custom domains or when you need to apply different DDoS protection rules per tenant. The downside is cost: each gateway gets its own cloud load balancer.

## Option 3: Path-Based Tenant Routing

If all tenants share the same domain and are distinguished by URL path, you can route based on URI prefix:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: multi-tenant-routes
  namespace: istio-system
spec:
  hosts:
  - "api.example.com"
  gateways:
  - shared-gateway
  http:
  - match:
    - uri:
        prefix: /tenant-a/
    rewrite:
      uri: /
    route:
    - destination:
        host: api-service.tenant-a.svc.cluster.local
        port:
          number: 8080
  - match:
    - uri:
        prefix: /tenant-b/
    rewrite:
      uri: /
    route:
    - destination:
        host: api-service.tenant-b.svc.cluster.local
        port:
          number: 8080
```

The `rewrite` strips the tenant prefix so the backend services do not need to know about it. This works well for API-style services but gets awkward for web applications that generate URLs.

## Option 4: Header-Based Routing

Route based on a custom header that identifies the tenant:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: header-based-routing
  namespace: istio-system
spec:
  hosts:
  - "api.example.com"
  gateways:
  - shared-gateway
  http:
  - match:
    - headers:
        x-tenant-id:
          exact: tenant-a
    route:
    - destination:
        host: api-service.tenant-a.svc.cluster.local
        port:
          number: 8080
  - match:
    - headers:
        x-tenant-id:
          exact: tenant-b
    route:
    - destination:
        host: api-service.tenant-b.svc.cluster.local
        port:
          number: 8080
  - route:
    - destination:
        host: default-handler.shared-services.svc.cluster.local
        port:
          number: 8080
```

The default route at the bottom handles requests without a tenant header. You might want to return a 400 error there instead of routing to a service.

## Securing Per-Tenant Ingress

Whichever approach you use, make sure to add authorization policies on the ingress path. For a shared gateway, you want to ensure that requests routed to tenant-a's namespace actually came from a legitimate tenant-a source:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-auth
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
    - source:
        namespaces:
        - tenant-a
```

This allows traffic from the ingress gateway and from within the tenant namespace, but blocks everything else.

## Per-Tenant TLS Certificates

For subdomain-based routing with individual TLS certificates per tenant, use Istio's SDS (Secret Discovery Service). Each tenant can have their own certificate:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-cert-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https-tenant-a
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: tenant-a-cert
    hosts:
    - "tenant-a.example.com"
  - port:
      number: 443
      name: https-tenant-b
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: tenant-b-cert
    hosts:
    - "tenant-b.example.com"
```

Istio uses SNI (Server Name Indication) to select the right certificate based on the hostname the client is connecting to.

## Automating Tenant Ingress Setup

When you add a new tenant, you can automate the creation of all ingress resources with a simple script:

```bash
#!/bin/bash
TENANT=$1
DOMAIN="${TENANT}.example.com"

kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ${TENANT}-ingress
  namespace: ${TENANT}
spec:
  hosts:
  - "${DOMAIN}"
  gateways:
  - istio-system/shared-gateway
  http:
  - route:
    - destination:
        host: frontend
        port:
          number: 80
EOF

echo "Ingress configured for ${TENANT} at https://${DOMAIN}"
```

## Summary

The right ingress strategy depends on your isolation requirements. Shared gateways are cost-effective and simple to manage. Dedicated gateways provide the strongest isolation and support custom domains easily. Path-based and header-based routing work well for API platforms. Whichever approach you pick, combine it with authorization policies and proper TLS configuration to keep tenants secure and separated at the ingress layer.
