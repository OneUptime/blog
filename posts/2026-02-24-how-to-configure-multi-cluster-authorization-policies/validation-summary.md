# Validation Summary: How to Configure Multi-Cluster Authorization Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio multi-cluster service mesh
- SPIFFE workload identities
- Istio EnvoyFilter
- Istio Telemetry API
- istioctl
- Kubernetes ServiceAccount and kubectl
- Argo CD ApplicationSet

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts: https://istio.io/latest/docs/concepts/security/
- Istio trust domain migration task: https://preliminary.istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/

## Issues Found
- Updated Istio AuthorizationPolicy examples from `security.istio.io/v1beta1` to the current stable `security.istio.io/v1` API.
- Corrected the EnvoyFilter API version from `networking.istio.io/v1beta1` to `networking.istio.io/v1alpha3`, which is the documented EnvoyFilter API version.
- Fixed the Lua EnvoyFilter configuration to use `defaultSourceCode.inlineString` and to insert before `envoy.filters.http.router`, matching current Istio EnvoyFilter examples.
- Changed the cluster header Lua code from `headers():add(...)` to `headers():replace(...)` and added a spoofing caveat, because app-supplied duplicate headers could otherwise affect authorization decisions.
- Corrected the text that said a VirtualService was being configured, since the example is an EnvoyFilter.
- Completed the Argo CD ApplicationSet example with required Application template fields, including `template.metadata.name`, `spec.project`, and `targetRevision`.
- Updated the Telemetry example from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1`.
- Corrected the `istioctl x authz check` explanation: it reports AuthorizationPolicies from the proxy's Envoy config, rather than simulating a specific request decision.
- Updated the trust-domain policy example to use `cluster.local` as Istio's authorization-policy pointer to the current trust domain and aliases, per Istio best practices.

## Review Notes
The YAML snippets parse successfully. The custom-header approach is technically workable for HTTP traffic, but it remains weaker than using distinct service accounts because it depends on all relevant traffic being forced through the sidecar/proxy that overwrites the header.
