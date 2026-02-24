# How to Explicitly Deny Traffic with Authorization Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, DENY, Traffic Control, Security, Kubernetes

Description: How to use explicit DENY authorization policies in Istio to block specific traffic patterns, override ALLOW rules, and enforce hard security boundaries.

---

Explicit DENY policies in Istio are your strongest tool for blocking traffic. Unlike ALLOW policies where denial is implicit (anything that doesn't match is denied), DENY policies create explicit, unambiguous blocks that can't be overridden by any ALLOW policy. When you need to guarantee that certain traffic never flows, DENY is the way to go.

## Why Explicit DENY Matters

Consider this scenario: you have an ALLOW policy that lets the `frontend` namespace access your API. A developer adds a new ALLOW policy that accidentally opens up more than intended. With only ALLOW policies, the new overly-broad policy would let unwanted traffic through.

An explicit DENY policy acts as a hard boundary. No matter what ALLOW policies exist or get added in the future, the DENY policy blocks what you've specified.

## Evaluation Order

Istio evaluates policies in this strict order:

1. If any DENY policy matches, the request is denied (no exceptions)
2. If no ALLOW policies exist, the request is allowed
3. If ALLOW policies exist and any matches, the request is allowed
4. If ALLOW policies exist but none match, the request is denied

The key insight is step 1: DENY always wins. An ALLOW policy cannot override a DENY.

## Blocking Specific Services

Block a known problematic service from accessing a critical resource:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-legacy-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-gateway
  action: DENY
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/legacy/sa/old-checkout"
              - "cluster.local/ns/legacy/sa/deprecated-api"
```

Even if someone adds an ALLOW policy that permits traffic from the `legacy` namespace, these specific services are still blocked.

## Blocking Cross-Environment Traffic

Prevent development services from accidentally reaching production:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-dev-to-prod
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces:
              - "development"
              - "staging"
              - "sandbox"
              - "load-testing"
```

No selector means this applies to all workloads in the `production` namespace. Nothing from development environments can reach production services.

## Blocking Specific Paths Explicitly

Some paths should never be exposed, period:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-sensitive-paths
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: web-service
  action: DENY
  rules:
    - to:
        - operation:
            paths:
              - "/internal/*"
              - "/debug/*"
              - "/admin/system/*"
              - "/.well-known/openid-configuration"
```

This is more reliable than just not including these paths in ALLOW policies. DENY policies survive misconfigurations in ALLOW policies.

## Blocking by HTTP Headers

Block requests with suspicious or unwanted headers:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-suspicious-headers
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - when:
        - key: request.headers[x-custom-debug]
          values: ["true"]
    - when:
        - key: request.headers[user-agent]
          values: ["sqlmap*", "nikto*"]
```

This blocks requests at the ingress gateway that have debug headers or known scanning tool user agents.

## Combining DENY with Specific Conditions

DENY policies support the same `from`, `to`, and `when` conditions as ALLOW policies. You can create very targeted blocks:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-write-from-outside
  namespace: backend
spec:
  selector:
    matchLabels:
      app: data-service
  action: DENY
  rules:
    # Block write operations from outside the namespace
    - from:
        - source:
            notNamespaces: ["backend"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH", "DELETE"]
```

Within a single rule, `from` and `to` are AND-ed together. So this only denies requests that are BOTH from outside the `backend` namespace AND use write methods. GET requests from outside are still allowed (assuming there's an ALLOW policy for them).

## Multiple Rules in DENY

Multiple rules in a DENY policy are OR-ed. A request is denied if it matches ANY rule:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: multi-deny
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    # Rule 1: Block all traffic from sandbox
    - from:
        - source:
            namespaces: ["sandbox"]
    # Rule 2: Block DELETE from anyone outside production
    - from:
        - source:
            notNamespaces: ["production"]
      to:
        - operation:
            methods: ["DELETE"]
    # Rule 3: Block access to internal endpoints from everyone
    - to:
        - operation:
            paths: ["/internal/*"]
```

A request from `sandbox` is denied (rule 1). A DELETE from `frontend` is denied (rule 2). A request to `/internal/config` from anywhere is denied (rule 3).

## DENY Based on JWT Claims

Block users with specific JWT claim values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-suspended-users
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[account_status]
          values: ["suspended", "banned", "deactivated"]
```

Even if the JWT is valid and other ALLOW policies would permit the request, users with these account statuses are blocked.

## Defense-in-Depth Example

Here's a complete setup showing DENY and ALLOW working together:

```yaml
# Layer 1: Hard DENY - always blocked
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: hard-deny
  namespace: production
spec:
  action: DENY
  rules:
    # Never allow dev namespaces
    - from:
        - source:
            namespaces: ["development", "sandbox"]
    # Never expose internal paths
    - to:
        - operation:
            paths: ["/internal/*", "/debug/*", "/actuator/*"]
---
# Layer 2: ALLOW - controlled access
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: controlled-allow
  namespace: production
spec:
  action: ALLOW
  rules:
    # Internal mesh traffic
    - from:
        - source:
            namespaces: ["production", "istio-system"]
    # Monitoring
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            paths: ["/metrics"]
            methods: ["GET"]
```

The DENY layer blocks development access and sensitive paths unconditionally. The ALLOW layer then controls which production traffic is permitted.

## Testing Explicit DENY

```bash
# Test denied path
kubectl exec -n production deploy/test -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080/internal/config
# Expected: 403

# Test denied namespace
kubectl exec -n development deploy/test -- curl -s -o /dev/null -w "%{http_code}" http://api-service.production:8080/api/users
# Expected: 403

# Test allowed traffic
kubectl exec -n production deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://api-service:8080/api/users
# Expected: 200

# Check RBAC deny logs
kubectl logs -n production deploy/api-service -c istio-proxy | grep "rbac_access_denied"
```

## Debugging DENY Policies

When a DENY policy is blocking traffic you want to allow:

```bash
# List all DENY policies
kubectl get authorizationpolicies -A -o json | jq '.items[] | select(.spec.action == "DENY") | {name: .metadata.name, namespace: .metadata.namespace}'

# Enable detailed RBAC logging
istioctl proxy-config log deploy/api-service -n production --level rbac:debug

# Check what Envoy sees
kubectl logs -n production deploy/api-service -c istio-proxy --tail=50

# Analyze for issues
istioctl analyze -n production
```

When debugging, remember that DENY policies are evaluated first. If a request matches any DENY rule, it stops there - ALLOW policies are never checked.

## Temporary DENY for Incident Response

DENY policies are useful during security incidents. If you discover a compromised service, you can immediately block it:

```bash
# Emergency block
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: emergency-block
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/compromised-service"
EOF
```

This takes effect immediately (within seconds) across the entire production namespace. You don't need to modify any other policies.

Remove it when the incident is resolved:

```bash
kubectl delete authorizationpolicy emergency-block -n production
```

Explicit DENY policies are the hard stops in your authorization strategy. Use them for security boundaries that must never be crossed, regardless of what other policies exist. They're simple, powerful, and the best defense against accidental misconfigurations in your ALLOW policies.
