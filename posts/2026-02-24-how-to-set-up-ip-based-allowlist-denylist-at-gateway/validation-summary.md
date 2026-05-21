# Validation Summary: How to Set Up IP-Based Allowlist/Denylist at Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio ingress gateway
- EnvoyFilter
- Envoy X-Forwarded-For and PROXY protocol handling
- Kubernetes kubectl commands
- Prometheus alerting rules
- CIDR notation and IP allowlist/denylist rules

## Sources Consulted
- Istio Ingress Access Control: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Configuring Gateway Network Topology: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Cloudflare IP ranges: https://www.cloudflare.com/ips/

## Issues Found
- The PROXY protocol example used `gatewayTopology.numTrustedProxies=1`, which configures X-Forwarded-For trusted hops rather than enabling PROXY protocol. Changed it to `gatewayTopology.proxyProtocol={}` and made the surrounding text refer to TCP load balancers with PROXY protocol.
- The denylist section said a DENY policy needs a corresponding ALLOW policy. Istio allows unmatched requests when no ALLOW policy applies to the workload, so this was corrected to explain that an allow-all policy is only needed when other ALLOW policies are already present on the same gateway.
- The AuthorizationPolicy examples used `security.istio.io/v1beta1`. Updated them to the current stable `security.istio.io/v1` API used in current Istio documentation.

## Review Notes
- The EnvoyFilter example is technically valid and appears in Istio documentation, but Istio's gateway topology settings are the preferred higher-level configuration for X-Forwarded-For and PROXY protocol behavior.
- The post uses IPv4 examples only. Istio also supports single IP and CIDR matching for the configured address fields; IPv6 coverage could be added separately if needed.
