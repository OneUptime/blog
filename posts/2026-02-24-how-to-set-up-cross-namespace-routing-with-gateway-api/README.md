# How to Set Up Cross-Namespace Routing with Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Multi-tenancy, Kubernetes, Networking

Description: Learn how to configure cross-namespace routing with the Kubernetes Gateway API and Istio, including shared gateways, ReferenceGrants, namespace selectors, and multi-team gateway architectures.

---

In real-world Kubernetes clusters, services are spread across multiple namespaces - often one per team or per environment. The Gateway API has built-in support for cross-namespace routing, which lets a single shared gateway serve traffic for services in different namespaces. This is one of the biggest improvements over the classic Ingress resource, which had limited cross-namespace support.

## The Cross-Namespace Model

The Gateway API uses a two-sided permission model for cross-namespace references:

1. **The Gateway** must allow routes from other namespaces (via `allowedRoutes`)
2. **Routes** must explicitly reference the gateway in another namespace (via `parentRefs`)
3. **Backend references** across namespaces need a `ReferenceGrant` in the target namespace

This means both sides need to opt in. A gateway can't force routes on a namespace, and a namespace can't attach routes to a gateway without the gateway's permission.

## Setting Up a Shared Gateway

Create a gateway in a central namespace that allows routes from multiple namespaces:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: wildcard-cert
    allowedRoutes:
      namespaces:
        from: All
```

`from: All` means any namespace can attach routes to this gateway. This is the simplest setup but gives the least control.

## Restricting Access with Namespace Selectors

For better security, use namespace selectors to control which namespaces can attach routes:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: production-http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: production
  - name: staging-http
    protocol: HTTP
    port: 8080
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: staging
```

Label the namespaces that should have access:

```bash
kubectl label namespace team-a gateway-access=production
kubectl label namespace team-b gateway-access=production
kubectl label namespace staging gateway-access=staging
```

Now only namespaces with the `gateway-access: production` label can attach routes to the production listener, and only namespaces with `gateway-access: staging` can use the staging listener.

## Creating Routes from Other Namespaces

Teams create HTTPRoutes in their own namespaces that reference the shared gateway:

```yaml
# In team-a namespace
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: team-a-app
  namespace: team-a
spec:
  parentRefs:
  - name: shared-gateway
    namespace: istio-ingress
    sectionName: production-http
  hostnames:
  - "team-a.example.com"
  rules:
  - backendRefs:
    - name: team-a-service
      port: 80
---
# In team-b namespace
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: team-b-app
  namespace: team-b
spec:
  parentRefs:
  - name: shared-gateway
    namespace: istio-ingress
    sectionName: production-http
  hostnames:
  - "team-b.example.com"
  rules:
  - backendRefs:
    - name: team-b-service
      port: 80
```

Each team manages their own routes independently. They can update their routing without affecting other teams.

## Using ReferenceGrant for Cross-Namespace Backends

Sometimes a route needs to send traffic to a service in a different namespace than where the route lives. This requires a ReferenceGrant in the target namespace.

Say team-a wants to route some traffic to a shared service in the `shared-services` namespace:

```yaml
# HTTPRoute in team-a namespace
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: team-a-with-shared
  namespace: team-a
spec:
  parentRefs:
  - name: shared-gateway
    namespace: istio-ingress
  hostnames:
  - "team-a.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /auth
    backendRefs:
    - name: auth-service
      namespace: shared-services
      port: 80
  - backendRefs:
    - name: team-a-service
      port: 80
```

The ReferenceGrant in the shared-services namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-team-a
  namespace: shared-services
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-a
  to:
  - group: ""
    kind: Service
```

This grants team-a's HTTPRoutes permission to reference Services in the shared-services namespace. Without this ReferenceGrant, the cross-namespace backend reference would be rejected.

## Broader ReferenceGrants

You can allow multiple namespaces to reference your services:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-all-teams
  namespace: shared-services
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-a
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-b
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-c
  to:
  - group: ""
    kind: Service
```

Or allow specific services only:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-auth-only
  namespace: shared-services
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-a
  to:
  - group: ""
    kind: Service
    name: auth-service
```

This restricts team-a to only reference the `auth-service` in shared-services, not any other service.

## Cross-Namespace TLS Certificate References

If your TLS certificates are managed centrally but gateways are in different namespaces:

```yaml
# ReferenceGrant in the cert-store namespace
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-cert-ref
  namespace: cert-store
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: istio-ingress
  to:
  - group: ""
    kind: Secret
```

Then reference the certificate:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: wildcard-cert
        namespace: cert-store
    allowedRoutes:
      namespaces:
        from: All
```

## Multi-Team Architecture Example

Here's a complete example of a production setup with multiple teams:

```yaml
# Central gateway
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: wildcard-cert
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchExpressions:
          - key: env
            operator: In
            values: ["production"]
---
# Team A's routes
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: payments-api
  namespace: payments-team
spec:
  parentRefs:
  - name: production-gateway
    namespace: istio-ingress
  hostnames:
  - "payments.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
    backendRefs:
    - name: payments-api
      port: 80
---
# Team B's routes
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: users-api
  namespace: users-team
spec:
  parentRefs:
  - name: production-gateway
    namespace: istio-ingress
  hostnames:
  - "users.example.com"
  rules:
  - backendRefs:
    - name: users-api
      port: 80
```

Label the team namespaces:

```bash
kubectl label namespace payments-team env=production
kubectl label namespace users-team env=production
```

## Hostname Isolation

For additional security, you can restrict which hostnames each listener accepts, preventing one team from claiming another team's hostname:

```yaml
listeners:
- name: payments
  protocol: HTTPS
  port: 443
  hostname: "payments.example.com"
  tls:
    mode: Terminate
    certificateRefs:
    - name: payments-cert
  allowedRoutes:
    namespaces:
      from: Selector
      selector:
        matchLabels:
          team: payments
- name: users
  protocol: HTTPS
  port: 443
  hostname: "users.example.com"
  tls:
    mode: Terminate
    certificateRefs:
    - name: users-cert
  allowedRoutes:
    namespaces:
      from: Selector
      selector:
        matchLabels:
          team: users
```

Each listener handles a specific hostname and only allows routes from the owning team's namespace.

## Checking Route Attachment Status

Verify that cross-namespace routes attached successfully:

```bash
kubectl get httproute -A
kubectl get httproute team-a-app -n team-a -o yaml
```

Look at the status:

```yaml
status:
  parents:
  - parentRef:
      name: shared-gateway
      namespace: istio-ingress
    conditions:
    - type: Accepted
      status: "True"
```

If `Accepted` is False, check:
- Does the namespace have the required labels?
- Does the gateway allow routes from this namespace?
- Does a ReferenceGrant exist for cross-namespace backend references?

```bash
kubectl get referencegrant -A
istioctl analyze -n team-a
```

## Debugging Cross-Namespace Issues

```bash
# Check all routes attached to a gateway
kubectl get httproute -A -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,GATEWAY:.spec.parentRefs[0].name'

# Check the gateway's listener status for attached route counts
kubectl get gateway shared-gateway -n istio-ingress -o jsonpath='{.status.listeners}' | python3 -m json.tool

# Verify Envoy configuration includes the cross-namespace routes
istioctl proxy-config route deploy/shared-gateway-istio -n istio-ingress
```

Cross-namespace routing is what makes the Gateway API practical for real organizations. Instead of every team managing their own ingress, you get a shared infrastructure layer with proper access controls. Teams stay independent while sharing the same entry point into the cluster.
