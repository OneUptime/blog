# Validation Summary: How to Configure Kong Ingress Controller for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong Ingress Controller
- Kong Gateway
- Kubernetes Ingress
- Kubernetes Services and dual-stack networking
- Helm
- IPv6
- AWS Load Balancer Controller annotations

## Sources Consulted
- Kong Ingress Controller install docs: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong Helm charts overview: https://charts.konghq.com/
- Official `kong/ingress` chart values: https://raw.githubusercontent.com/Kong/charts/main/charts/ingress/values.yaml
- Official `kong/kong` chart values and README: https://raw.githubusercontent.com/Kong/charts/main/charts/kong/values.yaml
- Kong annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- KongIngress migration guide: https://developer.konghq.com/kubernetes-ingress-controller/migrate/kongingress/
- KongUpstreamPolicy / custom resources reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong service health checks guide: https://developer.konghq.com/kubernetes-ingress-controller/service-health-checks/
- Kong Admin API docs: https://developer.konghq.com/admin-api/
- Kong DB-less mode docs: https://developer.konghq.com/gateway/db-less-mode/
- Kong IP Restriction plugin docs: https://developer.konghq.com/plugins/ip-restriction/
- Kong Rate Limiting plugin docs: https://developer.konghq.com/plugins/rate-limiting/
- Kong Request Transformer plugin docs: https://developer.konghq.com/plugins/request-transformer/
- Kong preserve client IP guide: https://developer.konghq.com/kubernetes-ingress-controller/preserve-client-ip/
- Kong proxying behavior docs: https://developer.konghq.com/gateway/traffic-control/proxying/
- Kubernetes dual-stack Services docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS dual-stack NLB annotation example: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html

## Issues Found
- The Helm values example used top-level `proxy`, `admin`, and `env` keys while the post installs `kong/ingress`. I changed the example to use the correct `gateway.*` values structure for the `kong/ingress` chart.
- The verification command referenced `kong-proxy`, which does not match the default naming used by the `kong/ingress` chart. I updated it to `kong-gateway-proxy` and adjusted the JSONPath to handle providers that return a hostname instead of a literal IP.
- The post used the deprecated `KongIngress` CRD for upstream, route, and service configuration. I replaced it with the current `KongUpstreamPolicy` resource plus supported Ingress and Service annotations, per current Kong documentation.
- The `KongIngress` example used deprecated field placement and old snake_case fields. I replaced those with the current `KongUpstreamPolicy` schema, including `httpPath` and `httpFailures`.
- The Ingress example was missing current annotation equivalents for route behavior shown later in the deprecated `KongIngress` block. I added `konghq.com/preserve-host` and `konghq.com/https-redirect-status-code`.
- The rate-limiting section incorrectly suggested `/48`-prefix behavior and referenced `lua-resty-limit-traffic` as if it were the stock solution. I corrected the explanation to match the standard plugin behavior: `limit_by: ip` uses the full client IP address.
- Several IPv6 examples were syntactically invalid, including `2001:db8:corp::/48`, `2001:db8:malicious::/48`, and Admin API host literals like `[2001:db8::kong]`. I replaced them with valid documentation-safe IPv6 examples.
- The Admin API section attempted `POST` operations against the default `kong/ingress` deployment. Current Kong docs state that the default DB-less deployment makes entity CRUD endpoints effectively read-only. I changed the examples to read-only inspection and clarified that configuration should be applied through Kubernetes resources.
- The real-IP plugin example used an invalid Request Transformer template expression. I corrected it to the documented `$(headers["..."])` syntax and reframed it as an optional custom-header example rather than required real-IP handling.
- The real-IP Helm values example used a top-level `env` block inconsistent with the `kong/ingress` chart. I updated it to `gateway.env` and added `real_ip_recursive` as an optional current setting from Kong’s client IP guidance.
- The verification commands referenced the wrong deployment name and plaintext Admin API access. I updated them to the `kong-gateway` deployment and HTTPS Admin API on port `8444`.

## Review Notes
- The post is now technically correct for the current `kong/ingress` chart model, which deploys Kong Gateway in DB-less mode by default.
- Dual-stack `LoadBalancer` behavior still depends on cluster and cloud-provider support. The Kubernetes and AWS documentation both note that the provider must support dual-stack load balancers.
- The post remains Ingress-based, which Kong still supports, though current Kong docs recommend Gateway API as the preferred direction for new Kubernetes routing configuration.
