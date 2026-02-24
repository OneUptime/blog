# How to Isolate Tenant Traffic with Istio Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Multi-Tenancy, Security, Service Mesh

Description: Learn how to use Istio AuthorizationPolicy resources to enforce strict traffic isolation between tenants in a shared Kubernetes cluster.

---

When you run multiple tenants on the same Kubernetes cluster, one of your biggest concerns is making sure tenant A cannot poke around in tenant B's services. Kubernetes namespaces give you a logical boundary, but they do not enforce any network-level isolation on their own. Istio's AuthorizationPolicy is the tool that actually locks things down.

This guide focuses specifically on using Istio authorization to create hard traffic boundaries between tenants.

## How Istio Authorization Works

Istio authorization operates at the Envoy proxy level. Every request that flows through the mesh passes through an Envoy sidecar, and that sidecar evaluates authorization policies before forwarding the request. The policies are evaluated locally in the proxy, so there is no network hop to an external authorization server.

The evaluation order is:
1. If any CUSTOM policy matches, delegate to external authorizer
2. If any DENY policy matches, deny the request
3. If any ALLOW policy matches, allow the request
4. If no ALLOW policies exist, allow by default
5. If ALLOW policies exist but none match, deny

That last point is crucial. Once you create an ALLOW policy in a namespace, all traffic that does not match an ALLOW rule gets denied. This is the foundation of tenant isolation.

## Setting Up the Deny-by-Default Baseline

The first step is establishing a mesh-wide deny-all policy. Apply this to the root namespace (istio-system):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: istio-system
spec:
  {}
```

This policy has no rules, which means it creates an ALLOW policy that matches nothing. Since no traffic matches, everything gets denied. Every single request in the mesh will now return `RBAC: access denied` unless you explicitly allow it.

Test it:

```bash
kubectl exec -n tenant-a deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.tenant-a:8000/get
# Should return 403
```

## Allowing Intra-Tenant Traffic

Now you need to punch holes in the deny-all for legitimate traffic. For each tenant namespace, create an AuthorizationPolicy that allows traffic from the same namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-tenant
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
```

This says: for any workload in the `tenant-a` namespace, allow requests that originate from other workloads in the `tenant-a` namespace. Anything from `tenant-b` or any other namespace gets denied.

Apply the same pattern for every tenant namespace:

```bash
for tenant in tenant-a tenant-b tenant-c; do
  kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-tenant
  namespace: $tenant
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - $tenant
EOF
done
```

## Using Service Account Identity for Finer Control

Namespace-level isolation is a good start, but sometimes you need more granularity. Maybe only specific services within a tenant should be able to call certain backends. Istio authorization supports matching on service account identities.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: tenant-a
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/tenant-a/sa/frontend"
```

This policy applies only to pods with the label `app: backend-api` in `tenant-a`, and only allows requests from the service account `frontend` in `tenant-a`. Even other services within the same tenant cannot reach the backend unless you add rules for them.

The `principals` field uses the SPIFFE identity format that Istio assigns through mTLS certificates. For this to work, you need mTLS enabled (which you should have anyway in a multi-tenant setup).

## Allowing Access to Shared Services

Most multi-tenant setups have shared services like databases, caches, or internal APIs that all tenants need access to. You handle this by creating policies in the shared namespace that allow traffic from tenant namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-tenants-to-shared-db
  namespace: shared-services
spec:
  selector:
    matchLabels:
      app: shared-database
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
        - tenant-b
        - tenant-c
```

You also need to allow the shared service namespace in each tenant's Sidecar resource so the tenants can actually discover the shared services, but that is a separate concern from authorization.

## Controlling Ingress Gateway Access

Traffic coming from outside the cluster through the Istio ingress gateway also needs authorization policies. The ingress gateway runs in `istio-system`, so you need to allow traffic from it into tenant namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-gateway
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
```

Without this, external traffic that comes through the gateway will hit the deny-all policy and get blocked.

## Handling JWT-Based Tenant Identification

If your tenants send traffic through a shared API gateway and include a JWT token with a tenant claim, you can use that in authorization policies too:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: tenant-a
spec:
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-tenant-jwt
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals:
        - "https://auth.example.com/*"
    when:
    - key: request.auth.claims[tenant]
      values:
      - "tenant-a"
```

This ensures that even if someone has a valid JWT, they can only access services in `tenant-a` if their token has `tenant: tenant-a` in the claims.

## Debugging Authorization Failures

When something gets denied and you are not sure why, the first thing to check is the Envoy access logs:

```bash
kubectl logs -n tenant-a deploy/my-service -c istio-proxy | grep "403"
```

You can also enable Envoy's RBAC debug logging:

```bash
istioctl proxy-config log deploy/my-service -n tenant-a --level rbac:debug
```

Then make the failing request again and check the proxy logs. The debug output will tell you exactly which policy denied the request and why.

Another useful tool is `istioctl x authz check`:

```bash
istioctl x authz check deploy/my-service -n tenant-a
```

This shows you all the authorization policies that apply to a specific workload, which helps you understand the effective policy.

## Common Pitfalls

One mistake people make is creating a DENY policy when they should use ALLOW. If you create a deny-all at the mesh level and then try to add DENY policies per tenant, you are layering denies on top of an already-denied baseline. Use the empty ALLOW pattern at the root, and then explicit ALLOW policies per namespace.

Another pitfall is forgetting about health check traffic. Kubernetes kubelet sends health check probes directly to the pod, bypassing the sidecar. These are not affected by Istio authorization. But if your health checks go through the sidecar (for example, using port forwarding through the proxy), you need to account for them in your policies.

Also watch out for headless services. Traffic to headless services resolves directly to pod IPs, and the authorization policy still applies, but the source namespace detection works differently depending on whether mTLS is enabled.

## Verifying Isolation

After setting everything up, run a comprehensive test. Deploy a test pod in each tenant namespace and systematically try to reach services in every other namespace:

```bash
# Should succeed (same namespace)
kubectl exec -n tenant-a deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.tenant-a:8000/get

# Should fail (cross namespace)
kubectl exec -n tenant-a deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.tenant-b:8000/get

# Should succeed (shared service)
kubectl exec -n tenant-a deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://shared-api.shared-services:8080/health
```

Run these tests as part of your CI pipeline so you catch any regressions when someone modifies the policies.

## Summary

Istio authorization is the core mechanism for enforcing tenant isolation in a shared cluster. Start with a deny-all baseline, add ALLOW policies per namespace, use service account identities for fine-grained control, and always verify your isolation with automated tests. Combined with mTLS and Sidecar resources, authorization policies give you a multi-tenant setup that you can actually trust.
