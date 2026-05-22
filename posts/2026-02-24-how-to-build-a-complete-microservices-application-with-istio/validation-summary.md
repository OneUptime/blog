# Validation Summary: How to Build a Complete Microservices Application with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio sidecar mode
- Kubernetes Deployments, Services, ServiceAccounts, and probes
- Istio Gateway and VirtualService routing
- Istio DestinationRule traffic policies and subsets
- Istio PeerAuthentication and AuthorizationPolicy
- Istio Telemetry API with OpenTelemetry providers
- kind local Kubernetes clusters
- istioctl and kubectl CLI workflows

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Telemetry API documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio OpenTelemetry access logging task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- kind quick start and multi-node configuration documentation: https://kind.sigs.k8s.io/docs/user/quick-start/

## Issues Found
- The OpenTelemetry providers used later in the Telemetry resource were not configured during Istio installation, and no collector was deployed for those providers. I added an OpenTelemetry Collector deployment step and changed the install command to use an IstioOperator manifest with `meshConfig.extensionProviders` for both OTLP tracing and OpenTelemetry access logs.
- The service manifests did not create or assign Kubernetes ServiceAccounts, but the AuthorizationPolicy used service account principals. I added ServiceAccount resources and `serviceAccountName` fields to the shown deployments, and updated the text so the omitted services follow the same pattern.
- The ingress VirtualService matched `:authority` through the `headers` map. Istio documents `authority` as a first-class HTTP match field, so I changed those matches to use `authority`.
- The product-service AuthorizationPolicy comment mentioned the API gateway, and ingress routes directly to product-service, but the policy did not allow the Istio ingress gateway identity. I added the ingress gateway service account principal.
- The canary example created a second VirtualService and DestinationRule for the same host as earlier examples, which can conflict or lose the previous traffic policy. I changed the canary snippets to update the existing `product-service` VirtualService and DestinationRule while preserving the retry, timeout, and circuit-breaker settings.

## Review Notes
The examples use short service host names such as `product-service`. Istio supports this, but its own reference recommends fully qualified service names to avoid namespace ambiguity in larger deployments. The post is still technically valid because the resources are in the same namespace as the services.
