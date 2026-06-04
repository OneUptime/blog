# Validation Summary: How to Configure Istio Traffic Shifting with Header-Based Routing for K8s A/B

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio RequestAuthentication
- Kubernetes Deployments and Services
- kubectl
- Prometheus
- Kiali

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio JWT claim based routing task: https://istio.io/latest/docs/tasks/security/authentication/jwt-route/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Lua filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Updated Istio networking resources from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version used in current Istio documentation.
- Changed the advanced and combined VirtualService examples to use the same `metadata.name: web-app` as the earlier VirtualService, so applying those examples replaces the existing route config instead of creating multiple VirtualServices for the same host.
- Narrowed the deployment example wording from "any application type" to "any HTTP-based application" because the post's header matching examples apply to HTTP-style traffic, not arbitrary TCP protocols.
- Replaced the EnvoyFilter/Lua JWT-header example with a `RequestAuthentication` `outputClaimToHeaders` example. The original snippet used the deprecated Envoy Lua `inline_code` field and assumed a JWT payload header that Istio does not emit unless configured. `RequestAuthentication` is the Istio-supported mechanism for copying verified JWT claims to headers.
- Added a caveat that `outputClaimToHeaders` is currently experimental in Istio and should be verified before using it for production rollout logic.

## Review Notes
- The remaining Kubernetes Deployment and Service manifests are syntactically valid examples for selecting versioned Pods behind one Service.
- The VirtualService header match examples correctly use lowercase hyphenated header keys and supported `exact`, `prefix`, and `regex` match types.
- The Prometheus examples use Istio's standard `istio_requests_total`, `destination_version`, and `response_code` labels. In real deployments, dashboards may need additional labels such as namespace, destination service, or reporter to avoid aggregating unrelated traffic.
- Istio documentation recommends fully qualified service hostnames to avoid namespace ambiguity. The short `web-app` hostname is valid here because all resources are shown in the `default` namespace, but fully qualified names are safer for production examples.
