# Validation Summary: How to Configure Tenant Isolation with Sidecar Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Sidecar resources
- Istio service discovery and xDS configuration
- Envoy sidecar proxies
- Kubernetes namespaces and workloads
- Istio AuthorizationPolicy
- Kubernetes and Istio CLI commands

## Sources Consulted
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio traffic management Sidecars concept documentation: https://istio.io/latest/docs/concepts/traffic-management/#sidecars
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debug endpoints documentation: https://preliminary.istio.io/latest/docs/ops/integrations/integration-guide/debug-endpoints/
- Istio mesh outbound traffic policy reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#MeshConfig-OutboundTrafficPolicy

## Issues Found
- The post stated that default sidecars know about every service in every namespace. Istio scopes this to exported services and configuration visible to the sidecar namespace, so the wording was changed to "every exported service."
- The post implied that `Sidecar` host scoping alone prevents workloads from reaching anything outside the configured hosts. Istio's documentation warns that Sidecar scoping limits generated configuration and that unmatched traffic may still be allowed under the default `ALLOW_ANY` behavior. The workload-specific section was updated to say the proxy only receives service-specific configuration for those hosts, and that `REGISTRY_ONLY` is needed to drop unknown outbound traffic.
- The `REGISTRY_ONLY` section described the setting as preventing data exfiltration. Istio explicitly says this setting is not an outbound security policy or firewall. The text was changed to explain that it drops unknown outbound traffic and helps catch missing configuration, while real egress security should use network policy, firewall rules, or an egress gateway.
- The xDS metrics example used `kubectl exec` into the `istiod` deployment to run `curl`. The documented access pattern for localhost-only debug endpoints is to port-forward `deploy/istiod` and curl `localhost:15014` locally. The command was updated accordingly.

## Review Notes
- The Sidecar API version `networking.istio.io/v1`, `workloadSelector`, `ingress`, `egress.hosts`, `defaultEndpoint`, and `outboundTrafficPolicy.mode` fields are current and valid.
- The `istioctl proxy-config cluster deploy/my-service -n tenant-a` form is valid according to the current `istioctl proxy-config cluster` command reference.
- The AuthorizationPolicy example is syntactically valid, but its `source.namespaces` and `source.principals` matches require mTLS-derived peer identity.
