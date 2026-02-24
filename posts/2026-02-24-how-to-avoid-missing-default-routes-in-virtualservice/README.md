# How to Avoid Missing Default Routes in VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Routing, Kubernetes, Networking

Description: Understand why missing default routes in Istio VirtualServices cause 404 errors and learn patterns to always include proper catch-all routes.

---

You deploy a new VirtualService with some fancy header-based routing, and everything works in testing. Then production traffic starts flowing and your support team starts getting reports of random 404 errors. The culprit? A missing default route. This is one of the most common and most frustrating Istio misconfigurations because it only affects traffic that does not match your explicit conditions.

Here is why this happens and how to prevent it.

## How VirtualService Routing Works

When a request arrives at a service, Istio evaluates the VirtualService rules in order. It uses the first matching rule and routes the request to the specified destination. If no rule matches, Istio returns a 404 Not Found.

This behavior catches people off guard because without Istio, a Kubernetes Service routes to any healthy pod. With Istio and a VirtualService that has match conditions, you are now responsible for handling every possible request pattern.

Consider this VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: production
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            x-user-type:
              exact: "beta"
      route:
        - destination:
            host: reviews
            subset: v2
    - match:
        - headers:
            x-user-type:
              exact: "internal"
      route:
        - destination:
            host: reviews
            subset: v3
```

What happens when a request comes in without the `x-user-type` header? Neither match condition is satisfied, and the request gets a 404. In production, most of your traffic probably does not have this header, meaning most users see a 404.

## The Fix: Always Add a Default Route

The solution is simple. Add a route without a match condition as the last entry:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: production
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            x-user-type:
              exact: "beta"
      route:
        - destination:
            host: reviews
            subset: v2
    - match:
        - headers:
            x-user-type:
              exact: "internal"
      route:
        - destination:
            host: reviews
            subset: v3
    - route:
        - destination:
            host: reviews
            subset: v1
```

The last route has no `match` field, so it matches everything that was not caught by the previous rules.

## Detecting Missing Default Routes

Run a quick check across your cluster:

```bash
kubectl get virtualservice -A -o json | jq -r '
  .items[] |
  select(.spec.http) |
  select(all(.spec.http[-1]; .match)) |
  "\(.metadata.namespace)/\(.metadata.name): MISSING DEFAULT ROUTE"
'
```

This script checks if the last HTTP route in each VirtualService has a match condition. If it does, there is no default route.

You can also use istioctl analyze, which catches some of these issues:

```bash
istioctl analyze --all-namespaces
```

## Common Scenarios Where Default Routes Get Missed

### Canary Deployments

During canary rollouts, people often set up percentage-based routing and forget the default:

```yaml
# BAD: What happens to the other 90%?
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: api
            subset: canary
```

Fix it by adding the stable version as the default:

```yaml
# GOOD: All traffic is accounted for
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: api
            subset: canary
    - route:
        - destination:
            host: api
            subset: stable
```

### A/B Testing

When you have multiple match conditions for A/B tests:

```yaml
# BAD: Users not in any test group get 404
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
spec:
  hosts:
    - frontend
  http:
    - match:
        - headers:
            x-test-group:
              exact: "A"
      route:
        - destination:
            host: frontend
            subset: variant-a
    - match:
        - headers:
            x-test-group:
              exact: "B"
      route:
        - destination:
            host: frontend
            subset: variant-b
    - route:
        - destination:
            host: frontend
            subset: control
```

The control group route at the bottom catches everyone not assigned to a test group.

### URI-Based Routing

```yaml
# BAD: Requests to /api/v3 or any other path get 404
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-v1
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: api-v2
```

Add a default that either routes to a specific version or returns a useful error:

```yaml
    - route:
        - destination:
            host: api-v1
      fault:
        abort:
          httpStatus: 404
          percentage:
            value: 0
```

Actually, a better approach is to just have the default route point to your latest stable version:

```yaml
    - route:
        - destination:
            host: api-v2
```

## Weight-Based Routing Pitfall

Weight-based routing is a special case that does not need an additional default route because the weights handle traffic distribution:

```yaml
# This is fine - weights cover 100% of traffic
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - route:
        - destination:
            host: api
            subset: v1
          weight: 90
        - destination:
            host: api
            subset: v2
          weight: 10
```

However, if you combine weights with match conditions, you still need a default:

```yaml
# BAD: Weight-based routing only applies to matched requests
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - match:
        - headers:
            x-environment:
              exact: "staging"
      route:
        - destination:
            host: api
            subset: v1
          weight: 50
        - destination:
            host: api
            subset: v2
          weight: 50
    - route:
        - destination:
            host: api
            subset: v1
```

## CI/CD Validation

Add a validation step to your deployment pipeline that rejects VirtualServices without default routes:

```bash
#!/bin/bash

# Validate VirtualService files before applying
for file in "$@"; do
  # Check if file contains VirtualService
  if grep -q "kind: VirtualService" "$file"; then
    # Check if last http route has a match condition
    LAST_ROUTE_HAS_MATCH=$(yq eval '.spec.http[-1] | has("match")' "$file")

    if [ "$LAST_ROUTE_HAS_MATCH" = "true" ]; then
      echo "ERROR: $file - VirtualService missing default route"
      echo "  The last HTTP route has a match condition."
      echo "  Add a route without match conditions as the last entry."
      exit 1
    fi
  fi
done

echo "All VirtualServices have default routes"
```

## Use OPA/Gatekeeper for Enforcement

For cluster-wide enforcement, use a Gatekeeper constraint:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiomissingdefaultroute
spec:
  crd:
    spec:
      names:
        kind: IstioMissingDefaultRoute
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package istiomissingdefaultroute

        violation[{"msg": msg}] {
          input.review.object.kind == "VirtualService"
          http_routes := input.review.object.spec.http
          count(http_routes) > 0
          last_route := http_routes[count(http_routes) - 1]
          last_route.match
          msg := "VirtualService must have a default route (last route without match conditions)"
        }
```

Missing default routes are preventable. Make it a rule that every VirtualService review explicitly checks for a default route. Add automated validation to your pipeline. And when you do find a missing default route in production, fix it immediately because every second it is missing, some percentage of your users are getting unexplained 404 errors.
