# How to Configure Istio Traffic Shifting with Header-Based Routing for Kubernetes A/B Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, A/B Testing, Traffic Management

Description: Learn how to implement advanced traffic shifting in Istio using header-based routing to conduct A/B tests in Kubernetes with precise user segmentation and feature flag control.

---

A/B testing is critical for validating new features before full rollout. While basic traffic splitting sends a percentage of requests to different versions, header-based routing gives you precise control over which users see which version. This guide shows you how to configure Istio for header-based traffic shifting in Kubernetes.

## Why Header-Based Routing for A/B Tests

Traditional percentage-based traffic splitting is useful, but it has limitations. Users might see different versions on consecutive requests, creating inconsistent experiences. Header-based routing solves this by routing based on user attributes, session tokens, or feature flags.

With header-based routing, you can target specific user segments like beta users, geographic regions, or premium subscribers. You can also integrate with feature flag systems to control which users see new features without redeploying your application.

## Prerequisites

You need a Kubernetes cluster with Istio installed. Make sure you have the Istio sidecar injector enabled in your namespace. You should also have kubectl and istioctl CLI tools configured.

## Deploying Two Versions of Your Service

First, deploy two versions of your application. We'll use a simple web service as an example, but this works for any application type.

```yaml
# deployment-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-v1
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: v1
  template:
    metadata:
      labels:
        app: web-app
        version: v1
    spec:
      containers:
      - name: web-app
        image: your-registry/web-app:v1
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "v1"
```

```yaml
# deployment-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-v2
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: v2
  template:
    metadata:
      labels:
        app: web-app
        version: v2
    spec:
      containers:
      - name: web-app
        image: your-registry/web-app:v2
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "v2"
```

Deploy both versions:

```bash
kubectl apply -f deployment-v1.yaml
kubectl apply -f deployment-v2.yaml
```

Create a single Kubernetes Service that selects both versions:

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  selector:
    app: web-app  # Selects both v1 and v2
  ports:
  - port: 8080
    targetPort: 8080
```

```bash
kubectl apply -f service.yaml
```

## Creating Istio DestinationRule for Version Subsets

The DestinationRule defines subsets for each version. These subsets are referenced in the VirtualService for routing decisions.

```yaml
# destinationrule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-app
  namespace: default
spec:
  host: web-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

```bash
kubectl apply -f destinationrule.yaml
```

## Configuring Header-Based Routing with VirtualService

Now create the VirtualService that routes traffic based on headers. This example routes users with a specific header to v2 while sending everyone else to v1.

```yaml
# virtualservice-header-routing.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app
  namespace: default
spec:
  hosts:
  - web-app
  http:
  # Route 1: Beta users get v2
  - match:
    - headers:
        x-user-group:
          exact: beta
    route:
    - destination:
        host: web-app
        subset: v2
  # Route 2: Premium users get v2
  - match:
    - headers:
        x-user-tier:
          exact: premium
    route:
    - destination:
        host: web-app
        subset: v2
  # Route 3: Users with feature flag enabled get v2
  - match:
    - headers:
        x-feature-new-ui:
          exact: "true"
    route:
    - destination:
        host: web-app
        subset: v2
  # Route 4: Default route to v1
  - route:
    - destination:
        host: web-app
        subset: v1
```

```bash
kubectl apply -f virtualservice-header-routing.yaml
```

The order of match rules matters. Istio evaluates them top to bottom and uses the first matching rule. Place more specific rules before generic ones.

## Testing Header-Based Routing

Test your configuration by sending requests with different headers. First, test the default route without headers:

```bash
kubectl run test-pod --rm -it --image=curlimages/curl -- sh
curl http://web-app:8080
# Should return v1
```

Test with the beta user header:

```bash
curl -H "x-user-group: beta" http://web-app:8080
# Should return v2
```

Test with the premium tier header:

```bash
curl -H "x-user-tier: premium" http://web-app:8080
# Should return v2
```

Test with the feature flag header:

```bash
curl -H "x-feature-new-ui: true" http://web-app:8080
# Should return v2
```

## Advanced Header Matching Patterns

Istio supports several header matching strategies beyond exact matching. You can use regex patterns for complex matching logic.

```yaml
# virtualservice-advanced-matching.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app-advanced
  namespace: default
spec:
  hosts:
  - web-app
  http:
  # Regex matching for user IDs ending in even numbers
  - match:
    - headers:
        x-user-id:
          regex: ".*[02468]$"
    route:
    - destination:
        host: web-app
        subset: v2
  # Prefix matching for regional routing
  - match:
    - headers:
        x-user-region:
          prefix: "eu-"
    route:
    - destination:
        host: web-app
        subset: v2
  # Multiple header conditions (AND logic)
  - match:
    - headers:
        x-user-group:
          exact: beta
        x-consent-analytics:
          exact: "true"
    route:
    - destination:
        host: web-app
        subset: v2
  # Default route
  - route:
    - destination:
        host: web-app
        subset: v1
```

## Combining Headers with Weight-Based Splitting

You can combine header-based routing with percentage-based traffic splitting for gradual rollouts within specific user segments.

```yaml
# virtualservice-combined-routing.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app-combined
  namespace: default
spec:
  hosts:
  - web-app
  http:
  # Beta users get 50/50 split between v1 and v2
  - match:
    - headers:
        x-user-group:
          exact: beta
    route:
    - destination:
        host: web-app
        subset: v1
      weight: 50
    - destination:
        host: web-app
        subset: v2
      weight: 50
  # All other users get v1
  - route:
    - destination:
        host: web-app
        subset: v1
```

This gives you progressive exposure within a segment. You can gradually increase the weight to v2 as confidence grows.

## Integrating with Feature Flag Systems

For production A/B testing, integrate with feature flag platforms like LaunchDarkly or Unleash. Your API gateway or frontend can add headers based on feature flag evaluations.

Here's an example using an Envoy filter to add headers based on JWT claims:

```yaml
# envoyfilter-jwt-headers.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: jwt-to-header
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.jwt_authn"
    patch:
      operation: INSERT_AFTER
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              local jwt = request_handle:headers():get("x-jwt-payload")
              if jwt then
                -- Parse JWT and extract feature flags
                -- Add header based on flags
                request_handle:headers():add("x-feature-new-ui", "true")
              end
            end
```

## Monitoring Your A/B Test

Use Istio's telemetry features to monitor traffic distribution. Check the Kiali dashboard to visualize traffic flow between versions.

Query Prometheus for request counts per version:

```promql
# Requests to v1
sum(rate(istio_requests_total{destination_version="v1"}[5m]))

# Requests to v2
sum(rate(istio_requests_total{destination_version="v2"}[5m]))
```

Monitor error rates to ensure v2 isn't introducing issues:

```promql
# Error rate for v2
sum(rate(istio_requests_total{destination_version="v2",response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{destination_version="v2"}[5m]))
```

## Conclusion

Header-based routing in Istio gives you precise control over A/B testing in Kubernetes. Unlike simple percentage-based splitting, you can target specific user segments, integrate with feature flags, and ensure consistent user experiences. This approach is essential for professional A/B testing where user segmentation and controlled rollouts matter.

Start with simple exact header matching, then add regex patterns and combined weight-based splitting as your testing strategy matures. Always monitor your tests with Istio's observability features to validate that traffic routes correctly and new versions perform well.
