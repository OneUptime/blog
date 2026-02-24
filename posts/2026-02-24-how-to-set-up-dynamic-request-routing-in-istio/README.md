# How to Set Up Dynamic Request Routing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Routing, VirtualService, Kubernetes

Description: A complete guide to setting up dynamic request routing in Istio using VirtualService rules based on headers, URIs, and other request attributes.

---

One of the most powerful features in Istio is the ability to route requests dynamically based on their content. Instead of routing all traffic for a service to the same set of pods, you can send requests to different versions, different backends, or different configurations based on HTTP headers, URI paths, query parameters, or other request attributes.

This is the foundation for canary deployments, A/B testing, feature flags, and many other traffic management patterns. This post walks through how to set it up from scratch.

## Prerequisites

Dynamic routing in Istio requires two resources working together:

1. **DestinationRule**: Defines the subsets (versions) of a service
2. **VirtualService**: Defines the routing rules that select which subset receives traffic

You also need your service deployments labeled with version information.

## Setting Up Service Versions

Start with a service that has multiple versions deployed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-api-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-api
      version: v1
  template:
    metadata:
      labels:
        app: product-api
        version: v1
    spec:
      containers:
        - name: product-api
          image: product-api:1.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-api-v2
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: product-api
      version: v2
  template:
    metadata:
      labels:
        app: product-api
        version: v2
    spec:
      containers:
        - name: product-api
          image: product-api:2.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: product-api
  namespace: production
spec:
  selector:
    app: product-api
  ports:
    - port: 8080
      name: http
```

The Service selects pods with `app: product-api`, which matches both v1 and v2. Without Istio routing rules, Kubernetes distributes traffic across both versions equally.

## Defining Subsets with DestinationRule

Create a DestinationRule that defines version subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-api
  namespace: production
spec:
  host: product-api.production.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Each subset filters pods by their labels. The subset name is what you reference in VirtualService routing rules.

## Routing Based on HTTP Headers

Route requests to different versions based on a custom header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
    - product-api
  http:
    - match:
        - headers:
            x-api-version:
              exact: "v2"
      route:
        - destination:
            host: product-api
            subset: v2
    - route:
        - destination:
            host: product-api
            subset: v1
```

Requests with the header `x-api-version: v2` go to the v2 deployment. Everything else goes to v1. The last route without a match condition acts as the default.

Test it:

```bash
# Goes to v1
curl http://product-api:8080/products

# Goes to v2
curl -H "x-api-version: v2" http://product-api:8080/products
```

## Routing Based on URI Path

Route different API paths to different backends:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
    - product-api
  http:
    - match:
        - uri:
            prefix: /api/v2/
      route:
        - destination:
            host: product-api
            subset: v2
    - match:
        - uri:
            prefix: /api/v1/
      route:
        - destination:
            host: product-api
            subset: v1
    - route:
        - destination:
            host: product-api
            subset: v1
```

URI matching supports three modes:

- `exact`: Matches the full path exactly
- `prefix`: Matches the beginning of the path
- `regex`: Matches against a regular expression

```yaml
# Exact match
uri:
  exact: /api/v2/products

# Prefix match
uri:
  prefix: /api/v2/

# Regex match
uri:
  regex: "/api/v[0-9]+/products"
```

## Routing Based on Query Parameters

You can match on query parameters using headers matching with the authority or by using the URI regex. Istio doesn't have a dedicated query parameter match field, but you can use URI regex:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
    - product-api
  http:
    - match:
        - queryParams:
            version:
              exact: "2"
      route:
        - destination:
            host: product-api
            subset: v2
    - route:
        - destination:
            host: product-api
            subset: v1
```

## Combining Match Conditions

You can combine multiple conditions. Within a single match block, conditions are AND-ed. Multiple match blocks in the same rule are OR-ed:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
    - product-api
  http:
    # Match: (header x-env=staging AND path starts with /api/v2)
    # OR (header x-beta-user=true)
    - match:
        - headers:
            x-env:
              exact: "staging"
          uri:
            prefix: /api/v2
        - headers:
            x-beta-user:
              exact: "true"
      route:
        - destination:
            host: product-api
            subset: v2
    - route:
        - destination:
            host: product-api
            subset: v1
```

## Weighted Routing

Split traffic between versions by percentage:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
    - product-api
  http:
    - route:
        - destination:
            host: product-api
            subset: v1
          weight: 90
        - destination:
            host: product-api
            subset: v2
          weight: 10
```

This sends 90% of traffic to v1 and 10% to v2. Weights must add up to 100.

You can combine weighted routing with match conditions for more sophisticated patterns:

```yaml
http:
  # Beta users always get v2
  - match:
      - headers:
          x-beta-user:
            exact: "true"
    route:
      - destination:
          host: product-api
          subset: v2
  # Everyone else gets 90/10 split
  - route:
      - destination:
          host: product-api
          subset: v1
        weight: 90
      - destination:
          host: product-api
          subset: v2
        weight: 10
```

## URI Rewriting

When routing to different backends, you might need to rewrite the URI:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
    - product-api
  http:
    - match:
        - uri:
            prefix: /legacy/
      rewrite:
        uri: /api/v1/
      route:
        - destination:
            host: product-api
            subset: v1
```

Requests to `/legacy/products` get rewritten to `/api/v1/products` before being sent to the v1 backend.

## Verifying Routes

Check that your routing rules are applied correctly:

```bash
# See the routes configured in the proxy
istioctl proxy-config routes deploy/frontend -n production -o json

# Analyze for misconfigurations
istioctl analyze -n production

# Test with actual requests
kubectl exec deploy/test-client -n production -- curl -v -H "x-api-version: v2" http://product-api:8080/products
```

## Debugging Routing Issues

If requests aren't going where expected:

1. Check that the DestinationRule subsets match actual pod labels
2. Verify that the VirtualService host matches the service name
3. Check match conditions - order matters, and the first matching rule wins
4. Look at proxy access logs for the response flags

```bash
# Check if subsets have endpoints
istioctl proxy-config endpoints deploy/frontend -n production --cluster "outbound|8080|v2|product-api.production.svc.cluster.local"
```

Dynamic routing is the building block for progressive delivery strategies. Once you have the basics working, you can build sophisticated deployment workflows that gradually shift traffic, test with specific user groups, and roll back instantly by changing a routing rule.
