# Validation Summary: How to Implement Request Routing Based on User Location

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes Deployments and node topology labels
- Amazon CloudFront viewer location headers
- Google Cloud Load Balancing custom request headers
- Google App Engine request headers
- Cloudflare visitor location headers
- Prometheus / PromQL metrics queries

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes assigning pods to nodes: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Amazon CloudFront request headers: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-cloudfront-headers.html
- Google Cloud Load Balancing custom headers: https://cloud.google.com/load-balancing/docs/https/custom-headers-global
- Google App Engine request headers: https://cloud.google.com/appengine/docs/standard/reference/request-headers
- Cloudflare HTTP headers reference: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Envoy Lua HTTP filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter

## Issues Found
- The post said AWS ALB adds `CloudFront-Viewer-Country`. That header is added by Amazon CloudFront, not Application Load Balancer. Updated the sentence to refer to CloudFront.
- The post said Google Cloud adds `X-Appengine-Country`. That header is specific to App Engine, while Google Cloud Load Balancing supports custom request headers such as `{client_region}`. Updated the provider examples to distinguish those services.
- The EnvoyFilter example added `x-user-region: us`, but the routing example matched `x-user-country` with uppercase country codes. Updated the example to add `x-user-country: US`.
- The locality load balancing section said Istio routes traffic to the closest endpoints, which can imply end-user geolocation. Updated the wording to clarify that locality load balancing is based on the source workload locality.
- The post said outlier detection is required for locality load balancing to work. Istio requires outlier detection for locality failover to work properly; locality load balancing itself can be enabled separately. Updated the wording.
- The data residency section cited GDPR as requiring data to remain within specific geographic boundaries. This was too broad. Updated the wording to refer to regulatory or contractual requirements generally.

## Review Notes
The Istio `networking.istio.io/v1beta1` examples remain valid, although current Istio documentation commonly shows `networking.istio.io/v1` for VirtualService and DestinationRule. The PromQL examples use valid Istio standard metric and label names, but grouping by `destination_workload` reports workload names rather than geographic regions unless regional workload names or custom telemetry labels are in use.
