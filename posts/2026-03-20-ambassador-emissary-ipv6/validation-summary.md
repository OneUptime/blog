# Validation Summary: How to Configure Ambassador/Emissary Ingress for IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Emissary-Ingress (formerly Ambassador)
- Kubernetes dual-stack Services
- AWS Network Load Balancer and AWS Load Balancer Controller
- Envoy listener and admin APIs
- Kubernetes CRDs: `Mapping`, `Host`, `Listener`, `Module`, and `RateLimitService`
- IPv6, TLS, and `X-Forwarded-For`

## Sources Consulted
- Emissary Helm install docs: https://emissary-ingress.dev/docs/3.6/topics/install/helm/
- Emissary Listener CRD docs: https://emissary-ingress.dev/docs/4.0/topics/running/listener/
- Emissary `ambassador` Module docs: https://emissary-ingress.dev/docs/4.0/topics/running/ambassador/
- Emissary add request headers docs: https://emissary-ingress.dev/docs/4.0/topics/using/headers/add-request-headers/
- Emissary load balancing docs: https://emissary-ingress.dev/docs/4.0/topics/running/load-balancer/
- Emissary service discovery and resolvers docs: https://emissary-ingress.dev/docs/4.0/topics/running/resolvers/
- Emissary basic rate limiting docs: https://emissary-ingress.dev/docs/4.0/topics/using/base-rate-limiting/
- Emissary rate limit service docs: https://emissary-ingress.dev/docs/4.0/topics/running/services/rate-limit-service/
- Emissary communication/TLS docs: https://emissary-ingress.dev/docs/3.9/howtos/configure-communications/
- Kubernetes dual-stack Services docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- AWS EKS NLB docs: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy listener/address docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/listeners.proto and https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto.html
- Emissary chart source: https://github.com/emissary-ingress/emissary/blob/master/charts/emissary-ingress/values.yaml and https://github.com/emissary-ingress/emissary/blob/master/charts/emissary-ingress/templates/service.yaml
- Emissary CRD/schema source: https://github.com/emissary-ingress/emissary/blob/master/charts/emissary-crds/templates/mappings.yaml and https://app.getambassador.io/yaml/emissary/latest/emissary-crds.yaml

## Issues Found
- The Helm section used `service.ipFamilyPolicy` in chart values, but the current Emissary chart exposes `service.ipFamilies` and does not template `ipFamilyPolicy`. I fixed this by adding the required CRD installation step from the official Helm docs and moving dual-stack service configuration to a `kubectl patch` on the created `Service`.
- The AWS load balancer annotations were outdated and incomplete for current EKS guidance. I replaced them with the AWS Load Balancer Controller annotations for an internet-facing dual-stack NLB with IP targets.
- The `Mapping` example used `set_request_headers`, which is not the current Emissary field. I changed it to `add_request_headers` and added `enable_ipv6: true` so the example actually enables AAAA-based upstream resolution.
- The `Mapping` example included a `load_balancer` block without a compatible resolver. Current Emissary docs require an endpoint-capable resolver for explicit `load_balancer` policy configuration, so I removed that block rather than leave an incomplete example.
- The `Host` example used `acmeProvider` as if it were supported in Emissary. Current Emissary docs mark ACME flows as Ambassador Edge Stack only, so I replaced that example with an Emissary-compatible `tlsSecret` configuration.
- The rate-limiting example used old `rate_limits` syntax and tried to limit on the raw `X-Forwarded-For` header. I replaced it with current `labels` syntax, added the `domain` field to `RateLimitService`, and used the documented `remote_address` label so the example works for trusted IPv4 or IPv6 client addresses.
- The client IP extraction section described “trusted proxy CIDRs”, but the configuration shown was actually trusted XFF hop-count handling. I corrected the comments and added `use_remote_address: false`, which current Emissary docs require when relying on XFF from an L7 proxy.
- Several verification commands were inaccurate. I replaced `kubectl get pods -o wide` with a `podIPs` query, changed the Envoy admin check to query listener addresses instead of names with `/listeners?format=json`, and replaced the invalid load balancer `jsonpath`/HTTPS test flow with a hostname-based IPv6 verification step that matches SNI and certificate behavior.
- The conclusion overstated how Emissary resolves backends in dual-stack mode. I corrected it to reflect Kubernetes service-level discovery and Emissary’s `enable_ipv6` setting.

## Review Notes
- Emissary’s versioned docs are in transition, so I cross-checked a few chart and CRD details directly in the upstream Emissary repository and published CRD YAML.
- Cloud-provider IPv6 behavior is still provider-specific. The post is now technically correct, but successful external IPv6 exposure still depends on cluster dual-stack support and the installed cloud load balancer controller.
