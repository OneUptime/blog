# How to Implement Request Routing Based on User Location

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Geo-Routing, Traffic Management, Kubernetes, Locality

Description: Learn how to route requests based on user geographic location using Istio's header-based routing, locality load balancing, and custom geo-detection.

---

Routing requests based on where users are located is important for several reasons: reducing latency by sending traffic to the nearest data center, complying with data residency regulations, serving localized content, and managing regional deployments. Istio doesn't have built-in GeoIP detection, but it provides the routing primitives you need to build location-based routing on top of your existing geo-detection infrastructure.

There are two main approaches: header-based routing where an external component adds location headers, and Istio's built-in locality-aware load balancing for multi-region clusters.

## Approach 1: Header-Based Geo-Routing

The most flexible approach is to have your load balancer or API gateway detect the user's location and add it as a request header. Most cloud load balancers can do this - AWS ALB adds the `CloudFront-Viewer-Country` header, Google Cloud adds `X-Appengine-Country`, and Cloudflare adds `CF-IPCountry`.

Once you have a geo header, Istio routes based on it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: content-service-vs
  namespace: default
spec:
  hosts:
  - content-service
  http:
  - match:
    - headers:
        x-user-country:
          exact: "US"
    route:
    - destination:
        host: content-service
        subset: us
  - match:
    - headers:
        x-user-country:
          regex: "DE|FR|IT|ES|NL|BE|AT|CH"
    route:
    - destination:
        host: content-service
        subset: eu
  - match:
    - headers:
        x-user-country:
          regex: "JP|KR|SG|AU|IN"
    route:
    - destination:
        host: content-service
        subset: apac
  - route:
    - destination:
        host: content-service
        subset: us
```

Define the regional subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: content-service-dr
  namespace: default
spec:
  host: content-service
  subsets:
  - name: us
    labels:
      region: us
  - name: eu
    labels:
      region: eu
  - name: apac
    labels:
      region: apac
```

Deploy regional versions of your service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-service-us
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: content-service
      region: us
  template:
    metadata:
      labels:
        app: content-service
        region: us
    spec:
      containers:
      - name: content
        image: myregistry/content-service:latest
        env:
        - name: DEFAULT_LOCALE
          value: "en-US"
        - name: CDN_REGION
          value: "us-east-1"
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-service-eu
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: content-service
      region: eu
  template:
    metadata:
      labels:
        app: content-service
        region: eu
    spec:
      containers:
      - name: content
        image: myregistry/content-service:latest
        env:
        - name: DEFAULT_LOCALE
          value: "de-DE"
        - name: CDN_REGION
          value: "eu-west-1"
        ports:
        - containerPort: 8080
```

## Adding Geo Headers at the Istio Gateway

If your external load balancer doesn't add geo headers, you can use an EnvoyFilter to add them based on a GeoIP lookup. This requires a GeoIP database:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: geo-header
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
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              -- In production, do a real GeoIP lookup
              -- This is a simplified example
              local xff = request_handle:headers():get("x-forwarded-for")
              if xff then
                -- Call your GeoIP service or use a Lua GeoIP library
                request_handle:headers():add("x-user-region", "us")
              end
            end
```

For production, you'd use a proper GeoIP service rather than the Lua inline approach. A dedicated GeoIP sidecar container or an external GeoIP API is more maintainable.

## Approach 2: Istio Locality-Aware Load Balancing

If you run a multi-region Kubernetes cluster (or multiple clusters), Istio can automatically route traffic to the closest endpoints using locality load balancing. This works based on Kubernetes node labels:

```bash
# Nodes should have topology labels
kubectl get nodes --show-labels | grep topology
```

Kubernetes nodes typically have these labels set by the cloud provider:

```
topology.kubernetes.io/region=us-east-1
topology.kubernetes.io/zone=us-east-1a
```

Enable locality load balancing in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service-dr
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

With this configuration, a request from a pod in `us-east-1a` will prefer endpoints in:
1. `us-east-1a` (same zone)
2. `us-east-1b` or `us-east-1c` (same region, different zone)
3. `eu-west-1a` (different region, as failover)

You must have outlier detection enabled for locality load balancing to work. Istio needs it to detect when local endpoints are unhealthy and should be failed over.

## Locality Failover Configuration

Control how traffic fails over between regions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service-dr
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east-1
          to: us-west-2
        - from: eu-west-1
          to: eu-central-1
        - from: ap-southeast-1
          to: ap-northeast-1
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

This ensures that US East traffic fails over to US West rather than jumping to Europe.

## Weighted Locality Distribution

Distribute traffic across regions with specific weights:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service-dr
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: us-east-1/*
          to:
            us-east-1/*: 80
            us-west-2/*: 20
        - from: eu-west-1/*
          to:
            eu-west-1/*: 90
            eu-central-1/*: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

This sends 80% of US East traffic to US East and 20% to US West, which helps balance load across regions.

## Data Residency Compliance

Some regulations (like GDPR) require that certain data stays within specific geographic boundaries. Use Istio routing to enforce this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-data-service-vs
  namespace: default
spec:
  hosts:
  - user-data-service
  http:
  - match:
    - headers:
        x-user-region:
          regex: "EU|EEA"
    route:
    - destination:
        host: user-data-service
        subset: eu-only
  - route:
    - destination:
        host: user-data-service
        subset: global
```

The `eu-only` subset only includes pods running in EU data centers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-data-service-dr
  namespace: default
spec:
  host: user-data-service
  subsets:
  - name: eu-only
    labels:
      region: eu
  - name: global
    labels:
      app: user-data-service
```

## Testing Geo-Routing

Verify your routing works by sending requests with different location headers:

```bash
# Test US routing
curl -H "Host: api.example.com" -H "x-user-country: US" \
  http://$INGRESS_IP/api/content

# Test EU routing
curl -H "Host: api.example.com" -H "x-user-country: DE" \
  http://$INGRESS_IP/api/content

# Test APAC routing
curl -H "Host: api.example.com" -H "x-user-country: JP" \
  http://$INGRESS_IP/api/content
```

Check which pod handled the request by looking at the response headers or logs.

## Monitoring Regional Traffic

Track traffic distribution across regions:

```bash
# Requests per region
sum(rate(istio_requests_total{destination_workload_namespace="default"}[5m])) by (destination_workload)

# Regional error rates
sum(rate(istio_requests_total{destination_workload="content-service-eu",response_code=~"5.."}[5m]))
```

Location-based routing with Istio combines header-based rules for application-level geo-routing with locality-aware load balancing for infrastructure-level optimization. Whether you need to comply with data residency laws, reduce latency for global users, or serve localized content, Istio's routing primitives give you the building blocks to implement whatever geo-routing strategy your application requires.
