# How to Implement Namespace-Based Multi-Tenancy with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Tenancy, Kubernetes, Namespaces, Service Mesh, Security

Description: A practical guide to implementing namespace-based multi-tenancy in Istio with traffic isolation, authorization policies, and per-tenant configuration.

---

Running multiple tenants on a shared Kubernetes cluster is one of those things that sounds simple until you actually try it. You create a namespace per tenant, deploy their workloads, and call it a day, right? Not quite. Without proper network isolation and policy enforcement, tenants can discover and call each other's services freely. That is where Istio comes in.

Istio's service mesh gives you the tools to enforce hard boundaries between tenants at the network level, even when they share the same cluster. This guide walks through a practical setup for namespace-based multi-tenancy using Istio.

## The Basic Architecture

The idea is straightforward: each tenant gets their own Kubernetes namespace, and Istio enforces isolation between those namespaces. Here is what the layout looks like:

```
cluster/
  istio-system/          # Istio control plane
  tenant-a/              # Tenant A workloads
  tenant-b/              # Tenant B workloads
  shared-services/       # Common services (optional)
```

First, create the tenant namespaces with Istio injection enabled:

```bash
kubectl create namespace tenant-a
kubectl label namespace tenant-a istio-injection=enabled
kubectl label namespace tenant-a tenant=tenant-a

kubectl create namespace tenant-b
kubectl label namespace tenant-b istio-injection=enabled
kubectl label namespace tenant-b tenant=tenant-b
```

The `tenant` label is important. You will use it later in authorization policies to identify which namespace belongs to which tenant.

## Enforcing Namespace Isolation with AuthorizationPolicy

By default, Istio allows all traffic between all services in the mesh. For multi-tenancy, you want to flip that to a deny-by-default model and then explicitly allow traffic within each tenant's namespace.

Start by creating a mesh-wide deny-all policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: istio-system
spec:
  {}
```

This empty spec with no rules means "deny everything." Apply it to the `istio-system` namespace and it takes effect mesh-wide (because of the root namespace).

Now, allow intra-namespace traffic for each tenant:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-b
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-b
```

With these policies, services in `tenant-a` can talk to other services in `tenant-a`, but they cannot reach anything in `tenant-b`, and vice versa.

## Using Sidecar Resources for Service Discovery Isolation

Authorization policies block the actual traffic, but tenants can still discover services in other namespaces through Istio's service registry. A tenant's sidecar proxy will receive configuration for every service in the mesh unless you limit it.

Use the `Sidecar` resource to scope each tenant's view:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
```

This tells Envoy proxies in `tenant-a` to only load configuration for services in their own namespace, `istio-system`, and `shared-services`. They will not even know `tenant-b` exists.

Do the same for tenant-b:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-b
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
```

This has a nice side effect: it reduces the amount of configuration that the Envoy proxies need to process, which improves performance in large clusters.

## Enabling Mutual TLS Between Services

Mutual TLS (mTLS) ensures that traffic between services is encrypted and authenticated. In a multi-tenant setup, this is non-negotiable. Istio assigns each service a SPIFFE identity based on its service account and namespace, so mTLS also gives you cryptographic proof of the caller's identity.

Enable strict mTLS mesh-wide:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

With strict mTLS, any traffic that is not encrypted with a valid mesh certificate gets rejected. This means even if someone bypasses the authorization policies somehow, they still cannot impersonate a service from another tenant without a valid certificate for that namespace.

## Per-Tenant Ingress Configuration

Each tenant typically needs their own ingress point. You can handle this with Istio's Gateway resource, either using a shared gateway with tenant-specific routing, or with dedicated gateway deployments per tenant.

Here is a shared gateway approach with per-tenant VirtualServices:

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
      credentialName: wildcard-cert
    hosts:
    - "*.tenant-a.example.com"
    - "*.tenant-b.example.com"
```

Then each tenant gets a VirtualService in their namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tenant-a-routes
  namespace: tenant-a
spec:
  hosts:
  - "app.tenant-a.example.com"
  gateways:
  - istio-system/shared-gateway
  http:
  - route:
    - destination:
        host: frontend.tenant-a.svc.cluster.local
        port:
          number: 80
```

## Network Policies as a Second Layer

Istio operates at Layer 7, but you should also add Kubernetes NetworkPolicies as a Layer 3/4 safety net. If the sidecar is somehow bypassed (init container failure, misconfigured pod), network policies still block cross-namespace traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-a
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-a
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

Note the DNS egress rule. Without it, pods cannot resolve service names.

## Automating Tenant Onboarding

When you have dozens of tenants, you do not want to manually create all these resources. Write a script or use a Helm chart that takes a tenant name and generates all the necessary resources:

```bash
#!/bin/bash
TENANT=$1

kubectl create namespace $TENANT
kubectl label namespace $TENANT istio-injection=enabled tenant=$TENANT

# Apply authorization policy
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: $TENANT
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - $TENANT
EOF

# Apply sidecar resource
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: $TENANT
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
EOF

echo "Tenant $TENANT onboarded successfully"
```

## Testing the Isolation

Always verify that your isolation actually works. Deploy a simple test pod in each namespace and try to call services across namespaces:

```bash
# From tenant-a, try to reach a service in tenant-b
kubectl exec -n tenant-a deploy/sleep -- curl -s http://httpbin.tenant-b:8000/headers

# This should return a 403 Forbidden or RBAC: access denied
```

If you get back a successful response, something is misconfigured. Check that your deny-all policy is in the root namespace and that the per-namespace allow policies are correctly scoped.

## Wrapping Up

Namespace-based multi-tenancy with Istio gives you strong isolation without the overhead of running separate clusters per tenant. The key layers are: authorization policies for traffic control, sidecar resources for service discovery scoping, mTLS for cryptographic identity, and network policies as a fallback. Stack all of them together and you get a setup where tenants genuinely cannot interfere with each other, even if they try.
