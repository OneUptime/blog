# How to Route Traffic Based on Query Parameters in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Traffic Routing, Query Parameters, Kubernetes

Description: Learn how to use Istio VirtualService to route traffic based on URL query parameters for feature flags, testing, and version routing.

---

Routing based on query parameters is useful when you want to control traffic flow without requiring clients to set custom headers. Users can just append a query parameter to the URL, and Istio sends them to the right service version. This is great for feature flags, debugging, and QA testing.

## How Query Parameter Matching Works

Istio VirtualService supports matching on query parameters through the `queryParams` field in the match condition. You can match using exact values, prefix matching, or regex patterns.

The basic structure looks like this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            version:
              exact: "2"
      route:
        - destination:
            host: my-app
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

With this configuration, a request to `http://my-app?version=2` goes to v2, while `http://my-app` or `http://my-app?version=1` goes to v1.

## Prerequisites

You need a DestinationRule that defines the subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: default
spec:
  host: my-app
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

And of course, two deployments with the appropriate version labels.

## Exact Match on Query Parameters

The simplest case is an exact match. The query parameter value must match exactly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            env:
              exact: "staging"
      route:
        - destination:
            host: my-app
            subset: staging
    - route:
        - destination:
            host: my-app
            subset: production
```

Hitting `http://my-app/api/data?env=staging` routes to the staging subset. Note that the match is case-sensitive, so `env=Staging` would not match.

## Regex Match on Query Parameters

For more flexible matching, use regex:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            feature:
              regex: "^(new-ui|dark-mode|beta)$"
      route:
        - destination:
            host: my-app
            subset: experimental
    - route:
        - destination:
            host: my-app
            subset: stable
```

This matches any of the listed feature flag values and routes them to the experimental subset.

## Combining Query Parameters with Other Conditions

You can combine query parameter matching with header matching, URI matching, and more. When conditions are in the same match block, they are all required (AND logic):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            debug:
              exact: "true"
          headers:
            x-user-role:
              exact: "admin"
      route:
        - destination:
            host: my-app
            subset: debug
    - route:
        - destination:
            host: my-app
            subset: production
```

This routes to the debug subset only when both `?debug=true` is in the URL AND the `x-user-role: admin` header is present. You need both conditions to be true.

For OR logic, use separate match blocks:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            debug:
              exact: "true"
        - headers:
            x-debug:
              exact: "true"
      route:
        - destination:
            host: my-app
            subset: debug
    - route:
        - destination:
            host: my-app
            subset: production
```

Now either the query parameter OR the header is enough to trigger the route.

## Feature Flags with Query Parameters

A practical use case is implementing feature flags. Different teams can test different features by appending query parameters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            feature:
              exact: "checkout-v2"
      route:
        - destination:
            host: checkout-v2
            port:
              number: 80
    - match:
        - queryParams:
            feature:
              exact: "search-v3"
      route:
        - destination:
            host: search-v3
            port:
              number: 80
    - route:
        - destination:
            host: my-app
            subset: v1
```

QA testers hit `http://my-app/checkout?feature=checkout-v2` to test the new checkout flow, while everyone else gets the stable version.

## Multiple Query Parameters

You can match on multiple query parameters simultaneously:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            version:
              exact: "2"
            region:
              exact: "eu"
      route:
        - destination:
            host: my-app-eu
            subset: v2
    - route:
        - destination:
            host: my-app
            subset: v1
```

A request to `http://my-app?version=2&region=eu` matches the first rule. Both parameters need to be present and have the specified values.

## Prefix Matching

Sometimes you do not know the exact value but know it starts with something specific:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - queryParams:
            tenant:
              prefix: "enterprise-"
      route:
        - destination:
            host: my-app
            subset: enterprise
    - route:
        - destination:
            host: my-app
            subset: standard
```

Any tenant ID starting with `enterprise-` gets routed to the enterprise subset.

## Testing Your Configuration

Verify that query parameter routing is working:

```bash
# Apply the configuration
kubectl apply -f virtualservice.yaml

# Test with the query parameter
curl "http://my-app.default.svc.cluster.local/api/data?version=2"

# Test without it
curl "http://my-app.default.svc.cluster.local/api/data"

# Check the Envoy routes
istioctl proxy-config routes deploy/my-app-v1 -o json
```

## Limitations to Keep in Mind

There are a few things to be aware of when routing on query parameters:

1. **Query parameters are not stripped** - Istio routes based on them but does not remove them from the request. Your application still sees the full URL.

2. **Order of parameters does not matter** - `?a=1&b=2` and `?b=2&a=1` both match the same rules.

3. **URL encoding** - Query parameter values are matched after URL decoding. So `%20` is treated as a space.

4. **No negation** - You cannot say "route if this parameter is NOT present." You can only match on what is there.

5. **Performance** - Matching on query parameters adds a small overhead compared to header matching, but it is negligible for most workloads.

Query parameter routing is a clean way to implement feature toggles and testing workflows without requiring clients to modify HTTP headers. It is especially useful for browser-based testing where adding custom headers is not straightforward.
