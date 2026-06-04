# Validation Summary: How to Implement Namespace-Based Traffic Routing with Service Mesh

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- Istio service mesh
- Istio VirtualService, DestinationRule, EnvoyFilter, and AuthorizationPolicy APIs
- Envoy global rate limiting
- Flagger canary deployments
- Prometheus / Istio telemetry metrics
- Grafana dashboard configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio traffic-management best practices for DestinationRule lookup and exportTo: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio configuration scoping / exportTo documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Flagger deployment strategy documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Kubernetes kubectl create namespace / label / run command behavior: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- Istio networking and security examples used older `v1beta1` API versions where the current stable documentation uses `networking.istio.io/v1` and `security.istio.io/v1`. Updated the VirtualService, DestinationRule, and AuthorizationPolicy snippets to current stable API versions.
- The setup commands created only `prod`, `staging`, and `dev`, while later examples used `shared-services`. Added creation and sidecar-injection labeling for `shared-services`, and made namespace creation/labeling idempotent with `--dry-run=client`, `kubectl apply`, and `--overwrite`.
- The rate-limit section mixed local rate limiting with an unused external rate-limit ConfigMap, so the per-namespace limits would not be enforced. Reworked the snippet to use Envoy global rate limiting, a trusted `x-source-namespace` header set by the VirtualService routes, and a route-level descriptor that matches the ConfigMap.
- The circuit-breaker example used `exportTo` as if it selected source namespaces. Istio documentation defines `exportTo` as configuration visibility, while DestinationRule lookup depends on the client namespace, service namespace, and mesh root namespace. Moved the example DestinationRules into the `prod` and `dev` client namespaces and scoped them with `exportTo: ["."]`.
- The outlier-detection field `consecutiveErrors` is not the current Istio field. Replaced it with `consecutive5xxErrors`.
- The authorization example used the older ingress gateway principal `istio-ingressgateway-service-account`. Replaced it with the simpler current service-account selector format `istio-system/istio-ingressgateway` and noted the mTLS requirement for namespace and service-account source matching.
- The Flagger example used header `match` conditions together with weighted progressive delivery fields. Flagger documents that HTTP match conditions are used for A/B testing and cause `maxWeight` and `stepWeight` to be ignored. Updated the example to show separate namespace-scoped Canary resources for different rollout rates.
- The test section routed to an `experimental` subset without deploying an experimental backend, and curled a Kubernetes Service that was never created. Added the experimental Deployment and the `backend` Service.

## Review Notes
- YAML fenced blocks parse successfully.
- `istioctl` is not installed in the workspace, so Istio analyzer validation could not be run locally.
- The rate-limit snippet assumes an Envoy-compatible rate-limit service named `ratelimit` is deployed in `istio-system` on port 8081 using the shown ConfigMap.
