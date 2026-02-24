# How to Avoid Over-Permissive Authorization Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Security, Kubernetes, Zero Trust

Description: Learn how to identify and fix over-permissive authorization policies in Istio that can expose your services to unauthorized access in production.

---

Authorization policies are your primary access control mechanism in Istio. They determine which services can talk to which other services, and under what conditions. The problem is that writing tight authorization policies takes effort, and under time pressure, teams tend to go broad. A policy that allows "everything from everywhere" technically works, but it completely undermines the zero-trust model that makes a service mesh valuable.

Here is how to identify over-permissive policies and replace them with properly scoped ones.

## What Makes a Policy Over-Permissive

An authorization policy is over-permissive when it grants more access than a service actually needs. Here are the most common patterns:

### The "Allow All" Policy

```yaml
# This is effectively no security at all
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: production
spec:
  action: ALLOW
  rules:
    - {}
```

An empty rule matches all traffic. This policy allows any source to reach any service in the namespace using any method on any path.

### Wildcard Principals

```yaml
# Too broad - allows any authenticated identity
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-authenticated
  namespace: production
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["*"]
```

Using `*` for principals means any service with a valid mTLS identity can access the target. In a shared cluster, that could be hundreds of services.

### Missing Path Restrictions

```yaml
# Allows all paths - including admin endpoints
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
```

This allows the frontend to access every endpoint on the api-server, including admin APIs, health checks, and debug endpoints.

## Audit Existing Policies

Start by listing all authorization policies and checking for red flags:

```bash
# List all policies
kubectl get authorizationpolicy -A

# Find policies with no 'from' restriction
kubectl get authorizationpolicy -A -o yaml | grep -B20 "rules:" | grep -B20 "action: ALLOW" | grep -v "from:"

# Find policies with wildcard principals
kubectl get authorizationpolicy -A -o yaml | grep -A5 "principals:" | grep '"*"'
```

For a more thorough audit:

```bash
#!/bin/bash
echo "=== Authorization Policy Audit ==="

for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  policies=$(kubectl get authorizationpolicy -n "$ns" -o json 2>/dev/null)
  count=$(echo "$policies" | jq '.items | length')

  if [ "$count" -gt 0 ]; then
    echo "Namespace: $ns ($count policies)"

    # Check for allow-all rules
    echo "$policies" | jq -r '.items[] | select(.spec.rules[]? | keys | length == 0) | "  WARN: \(.metadata.name) has empty rules (allow-all)"'

    # Check for wildcard principals
    echo "$policies" | jq -r '.items[] | select(.spec.rules[]?.from[]?.source.principals[]? == "*") | "  WARN: \(.metadata.name) uses wildcard principals"'
  fi
done
```

## Apply the Principle of Least Privilege

Every authorization policy should answer three questions:
1. WHO can access (specific service accounts)
2. WHAT they can access (specific paths and methods)
3. WHEN they can access (conditions)

Here is a properly scoped policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/v1/products", "/api/v1/products/*", "/api/v1/cart", "/api/v1/cart/*"]
```

Notice that this policy:
- Targets a specific workload (api-server)
- Allows only a specific caller (frontend service account)
- Restricts to specific HTTP methods
- Limits to specific URL paths

## Build Policies from Actual Traffic

Instead of guessing what access is needed, build policies from observed traffic. Use Istio's access logs to see what is actually happening:

```bash
# Enable access logging if not already on
kubectl get configmap istio -n istio-system -o yaml | grep accessLogFile

# Check recent traffic to a service
kubectl logs deploy/api-server -c istio-proxy --tail=100 | jq -r '[.source_workload, .method, .path] | @tsv' 2>/dev/null | sort | uniq -c | sort -rn
```

This shows you exactly which services are calling which paths with which methods. Use this data to write precise policies.

## Use Namespace Isolation

Restrict cross-namespace communication explicitly:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-cross-namespace
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces: ["production", "istio-system"]
```

This denies traffic from any namespace except production and istio-system.

## Protect Sensitive Endpoints

Admin endpoints, health checks, and metrics endpoints need special attention:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: protect-admin
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/admin/*", "/debug/*", "/metrics"]
      from:
        - source:
            notPrincipals: ["cluster.local/ns/monitoring/sa/prometheus", "cluster.local/ns/production/sa/admin-service"]
```

This denies access to admin, debug, and metrics paths from everyone except Prometheus and the admin service.

## Test Policies Before Deploying

Always test authorization policies in a non-production environment:

```bash
# Apply policy in dry-run mode
kubectl apply -f policy.yaml --dry-run=server

# Test with a specific request
kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://api-server:8080/api/v1/products
# Should return 200

kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://api-server:8080/admin/users
# Should return 403

kubectl exec deploy/unauthorized-service -- curl -s -o /dev/null -w "%{http_code}" http://api-server:8080/api/v1/products
# Should return 403
```

## Implement Gradual Tightening

If you have existing over-permissive policies, do not try to fix everything at once. Use a phased approach:

Phase 1: Add logging to see what would be blocked:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: audit-mode
  namespace: production
  annotations:
    security.istio.io/audit: "true"
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - from:
        - source:
            notPrincipals: ["cluster.local/ns/production/sa/frontend"]
```

Phase 2: Monitor logs for denied requests that should be allowed. Add those callers to your allow list.

Phase 3: Switch from audit to enforcement.

## Monitor Policy Denials

After deploying policies, monitor for unexpected denials:

```bash
# Check for RBAC denied responses
kubectl logs deploy/api-server -c istio-proxy --tail=1000 | grep "403"

# Check Istio RBAC metrics
curl -s "http://localhost:9090/api/v1/query?query=istio_requests_total{response_code='403'}" | jq '.data.result'
```

Set up alerts for spikes in 403 responses, which could indicate either an attack or a policy that is too tight:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: authz-alerts
spec:
  groups:
    - name: istio-authz
      rules:
        - alert: HighAuthzDenialRate
          expr: |
            sum(rate(istio_requests_total{response_code="403"}[5m])) by (destination_service)
            > 10
          for: 5m
          labels:
            severity: warning
```

Over-permissive authorization is a security debt that compounds over time. Start with least privilege, build policies from observed traffic, and monitor continuously. The goal is to have every service-to-service communication path explicitly documented and authorized through your Istio policies.
