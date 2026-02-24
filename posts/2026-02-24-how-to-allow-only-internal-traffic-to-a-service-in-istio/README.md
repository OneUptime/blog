# How to Allow Only Internal Traffic to a Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, AuthorizationPolicy, Internal Traffic, Kubernetes

Description: Restrict a service to only accept traffic from within the mesh using Istio AuthorizationPolicy and PeerAuthentication for internal-only service protection.

---

Some services should never be exposed to external traffic. Internal APIs, admin dashboards, background job processors, database proxies - these all need to be accessible within the cluster but locked down from the outside. Istio gives you the tools to enforce this at the mesh level so you do not have to rely solely on Kubernetes NetworkPolicies or application-level checks.

## The Problem

By default, any service in Kubernetes that has a Service resource can be reached by anything that can route to it. If you have an ingress gateway, it could potentially route external traffic to internal services (either by misconfiguration or deliberately). Even without an ingress, if your cluster has a load balancer or NodePort, there might be unintended external access paths.

You want to ensure that certain services only accept requests from other services within the mesh, not from external sources.

## Approach 1: AuthorizationPolicy with Source Principals

The most direct way to restrict a service to internal mesh traffic is with an AuthorizationPolicy that only allows requests from authenticated mesh identities (SPIFFE identities).

First, make sure mTLS is enabled. With Istio's default installation, mTLS is in PERMISSIVE mode. Switch to STRICT for the namespace or specific workloads:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: internal-services
spec:
  mtls:
    mode: STRICT
```

This ensures all traffic to workloads in the `internal-services` namespace must use mTLS. External traffic (which does not have a valid mesh certificate) will be rejected.

```bash
kubectl apply -f peer-authentication.yaml
```

Now add an AuthorizationPolicy that only allows traffic from within the mesh:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: internal-only
  namespace: internal-services
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/*/sa/*"]
```

This allows any service account from any namespace in the local cluster. The principal format `cluster.local/ns/*/sa/*` matches any workload with a valid SPIFFE identity in the mesh.

```bash
kubectl apply -f authorization-policy.yaml
```

## Approach 2: Restrict to Specific Namespaces

If you want to be more restrictive and only allow traffic from specific namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: internal-only
  namespace: internal-services
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["production", "staging"]
```

Only workloads in the `production` and `staging` namespaces can call services in `internal-services`. Requests from other namespaces will be denied.

## Approach 3: Deny External at the Ingress Gateway

Another layer of protection is to explicitly exclude internal services from your ingress gateway configuration. If your Gateway and VirtualService only route to public services, internal services are not exposed:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "api.example.com"
      tls:
        mode: SIMPLE
        credentialName: api-cert
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: public-api-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/public-gateway
  http:
    - match:
        - uri:
            prefix: /api/public
      route:
        - destination:
            host: public-api.default.svc.cluster.local
```

Since the VirtualService only routes to `public-api`, internal services are not reachable through the gateway. But this is defense by omission. It is better to have explicit deny rules on the internal services themselves.

## Combining Both Approaches

The most robust setup combines PeerAuthentication with AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: internal-services
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: internal-services
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/*/sa/*"]
```

The PeerAuthentication blocks non-mTLS traffic at the transport level. The AuthorizationPolicy blocks traffic that does not have a valid mesh identity at the application level. Together, they create two layers of protection.

## Per-Service Internal Lock

You can apply the policy to specific workloads instead of the entire namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-api-internal-only
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/*/sa/*"]
```

This applies only to pods with the `app: admin-api` label. Other services in the `default` namespace are unaffected.

## Handling the Ingress Gateway

One thing to watch out for: the Istio ingress gateway itself has a mesh identity (`cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account`). If your AuthorizationPolicy allows all mesh principals, the ingress gateway can still reach your internal services.

To block the ingress gateway specifically:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-ingress-gateway
  namespace: internal-services
spec:
  action: DENY
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
```

DENY rules take precedence over ALLOW rules. So this blocks the ingress gateway even if another policy allows all mesh principals.

## Testing

Test that internal traffic works:

```bash
# From a pod within the mesh
kubectl exec deploy/frontend -n production -c frontend -- curl -s http://admin-api.internal-services.svc.cluster.local/health
# Expected: 200 OK
```

Test that external traffic is blocked:

```bash
# From a pod without sidecar (simulate external traffic)
kubectl run test-no-sidecar --image=curlimages/curl --restart=Never --labels="sidecar.istio.io/inject=false" -- curl -s http://admin-api.internal-services.svc.cluster.local/health
kubectl logs test-no-sidecar
# Expected: Connection refused or RBAC denied
kubectl delete pod test-no-sidecar
```

Check the authorization policy status:

```bash
istioctl analyze -n internal-services
```

Look at the Envoy access log for RBAC denials:

```bash
kubectl logs deploy/admin-api -n internal-services -c istio-proxy | grep "rbac_access_denied_matched_policy"
```

## Monitoring Denied Requests

Set up Prometheus alerts for authorization denials:

```yaml
# Prometheus alert rule
groups:
  - name: istio-security
    rules:
      - alert: InternalServiceExternalAccess
        expr: sum(rate(istio_requests_total{response_code="403",destination_service_namespace="internal-services"}[5m])) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "External access attempts to internal services detected"
```

## Common Mistakes

**Forgetting STRICT mTLS.** If PeerAuthentication is in PERMISSIVE mode, plaintext traffic is accepted. An attacker who can reach the pod network could bypass your AuthorizationPolicy by sending plaintext requests (which would not have a principal).

**Empty AuthorizationPolicy.** An AuthorizationPolicy with no rules and action ALLOW denies everything. An AuthorizationPolicy with no rules and action DENY allows everything. Be explicit about your rules.

**Not accounting for health checks.** Kubernetes liveness and readiness probes come from the kubelet, which is outside the mesh. Istio handles this by rewriting probe paths, but if you have strict policies, make sure health checks still work.

## Summary

Restricting services to internal-only traffic in Istio is best done with a combination of STRICT PeerAuthentication and AuthorizationPolicy. PeerAuthentication ensures mTLS is required, blocking any non-mesh traffic at the transport level. AuthorizationPolicy adds application-level checks on the caller's identity. For extra safety, explicitly deny the ingress gateway principal if your internal services should never be externally accessible. Always test from both inside and outside the mesh to verify your policies work correctly.
