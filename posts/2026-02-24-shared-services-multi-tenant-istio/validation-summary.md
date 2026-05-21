# Validation Summary: How to Handle Shared Services in Multi-Tenant Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes namespaces and kubectl
- Istio AuthorizationPolicy
- Istio Sidecar
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy Lua filter
- Envoy global rate limiting
- Prometheus and Istio standard metrics

## Sources Consulted
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy Lua HTTP filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter

## Issues Found
- The tenant-routing VirtualService routed to `subset: default`, but no DestinationRule defined a `default` subset. Removed the subset references so the route targets the service normally.
- The Envoy Lua example used `headers():add("x-tenant-id", "tenant-a")`, which appends a header and can leave caller-supplied tenant headers in place. Changed it to `headers():replace(...)` so the proxy-controlled tenant value overwrites any existing value.
- The rate-limit ConfigMap used a `source_namespace` descriptor without showing how Envoy would emit that descriptor. Changed the descriptor key to `tenant_id` and added a note that the Envoy rate limit filter and route action must send the `x-tenant-id` header as that descriptor.

## Review Notes
- The AuthorizationPolicy examples using `source.namespaces` require mTLS-derived source identity, as noted in Istio's AuthorizationPolicy reference.
- EnvoyFilter is valid for these examples, but Istio documents that EnvoyFilter patches expose Envoy implementation details and should be reviewed carefully during Istio upgrades.
