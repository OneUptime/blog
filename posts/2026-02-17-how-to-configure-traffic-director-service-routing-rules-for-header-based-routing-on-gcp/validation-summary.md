# Validation Summary: How to Configure Traffic Director Service Routing Rules for Header-Based Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Traffic Director / Cloud Service Mesh
- Google Cloud URL maps and backend services
- Google Kubernetes Engine
- Kubernetes Services and Deployments
- Kubernetes Gateway API HTTPRoute
- Envoy route configuration
- Python Flask and Requests

## Sources Consulted
- Google Cloud Compute Engine URL maps REST resource: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud SDK `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK `gcloud compute backend-services add-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- GKE standalone NEGs: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/standalone-neg
- Cloud Service Mesh Gateway API reference: https://cloud.google.com/service-mesh/docs/gateway/reference
- Cloud Service Mesh supported routing features: https://docs.cloud.google.com/service-mesh/docs/service-routing/features
- Kubernetes Gateway API HTTPRoute specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Envoy route configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route.proto.html

## Issues Found
- The Kubernetes Services did not expose standalone GKE NEGs, so the Compute backend services had no GKE Pod endpoints to attach. Added `cloud.google.com/neg` annotations and `targetPort` fields, plus `gcloud compute backend-services add-backend` examples for the generated NEGs.
- The setup commands referenced separate manifest names that did not match the combined YAML example. Updated the example and apply command to use `backend-services.yaml`.
- The URL map `routeRules.matchRules` matched only headers. Google Cloud URL map route rules must also specify one path matcher such as `prefixMatch`, `fullPathMatch`, `regexMatch`, or `pathTemplateMatch`. Added `prefixMatch: /` to each rule.
- The URL map response header addition was nested under `routeAction`, which is not the correct field location. Moved it to the route rule `headerAction.responseHeadersToAdd` field.
- The Gateway API example used a regex to model a portable header-present match. HTTPRoute core header matching is exact matching, and `RegularExpression` support is implementation-specific. Changed the rule to match `X-Beta-User: true`.
- The Gateway API example used a Gateway parent for a service-to-service mesh route, while the article describes clients calling the in-cluster service name. Updated the HTTPRoute parent reference to the frontend Kubernetes Service for Gateway API for Mesh.
- The article implied Envoy can automatically propagate inbound request headers across separate application-created downstream calls. Clarified that Envoy can mutate headers on proxied requests, but applications or a dedicated filter must copy inbound routing headers into new outbound requests.

## Review Notes
- The URL map commands still assume the rest of the Traffic Director/Cloud Service Mesh xDS setup already exists, including target proxy, forwarding rule, and Envoy bootstrap. The post now states that assumption explicitly.
- The GKE NEG backend example uses `us-central1-a` as a placeholder zone and must be repeated for every zone containing cluster endpoints.
