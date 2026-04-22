# Validation Summary: How to Configure Skipper Ingress Controller for IPv6

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- IPv6
- Skipper ingress controller
- Kubernetes Deployments, Services, and Ingress
- Zalando RouteGroup CRD
- Skipper Eskip routes, predicates, filters, and backends
- AWS Load Balancer Controller dual-stack Service annotations

## Sources Consulted
- Skipper Kubernetes ingress controller deployment documentation: https://opensource.zalando.com/skipper/kubernetes/ingress-controller/
- Skipper Kubernetes ingress usage documentation: https://opensource.zalando.com/skipper/kubernetes/ingress-usage/
- Skipper RouteGroup CRD semantics: https://opensource.zalando.com/skipper/kubernetes/routegroup-crd/
- Skipper RouteGroup CRD schema: https://github.com/zalando/skipper/blob/master/dataclients/kubernetes/deploy/apply/routegroups_crd.yaml
- Skipper command-line configuration source: https://github.com/zalando/skipper/blob/master/config/config.go
- Skipper filters reference: https://opensource.zalando.com/skipper/reference/filters/
- Skipper predicates reference: https://opensource.zalando.com/skipper/reference/predicates/
- Skipper backends reference: https://opensource.zalando.com/skipper/reference/backends/
- Kubernetes IPv4/IPv6 dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API improvements and IngressClass deprecation note: https://kubernetes.io/blog/2020/04/02/improvements-to-the-ingress-api-in-kubernetes-1.18/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- RFC 3986 URI generic syntax for IPv6 literal bracket notation: https://www.rfc-editor.org/rfc/rfc3986

## Issues Found
- The Skipper deployment used a non-existent `-tls-listen-address` flag and exposed HTTPS without enabling Skipper Kubernetes TLS handling. Updated the example to use `-kubernetes-enable-tls`, `-address=[::]:9443`, and `-insecure-address=[::]:9090`, and added the HTTPS container port.
- The deployment used a non-existent `-trusted-proxies` flag. Removed it and documented the supported `-reverse-source-predicate` option for load balancers that place the client IP last in `X-Forwarded-For`.
- The rate limit examples used deprecated `localRatelimit` and the deployment did not enable ratelimit filters. Replaced `localRatelimit` with `clientRatelimit` and added `-enable-ratelimits`.
- The standard Ingress example had duplicate `zalando.org/skipper-filter` annotation keys. Combined the filters into a single Skipper filter chain with `->`.
- The Ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. Updated them to use `spec.ingressClassName: skipper`, while leaving a note in the conclusion that Skipper still supports the legacy annotation.
- The RouteGroup example used `match: Path("/ipv6-only")`, which is not a valid RouteGroup route field. Replaced it with the supported `path: /ipv6-only` field.
- The Eskip example used `Path("/api/*")`, which Skipper documents as undefined because free wildcards need a name. Replaced it with `PathSubtree("/api")`.
- Several placeholder IPv6 literals contained non-hexadecimal text such as `backend`, `app1`, `default`, `blocked`, and `skipper-lb`. Replaced them with valid documentation-prefix IPv6 addresses and CIDRs.
- The client IP header example used an unsupported `$(XForwardedFor().first())` template expression. Replaced it with Skipper's supported `${request.source}` placeholder.
- The verification curl command used an invalid IPv6 placeholder and did not account for TLS/SNI. Updated it to use a valid IPv6 literal with `curl --resolve` against the HTTPS hostname.

## Review Notes
- The examples now validate as YAML with duplicate-key detection.
- The deployment assumes the official Skipper ServiceAccount/RBAC manifests and the RouteGroup CRD are installed.
- The AWS dual-stack Service annotation is provider-specific; other Kubernetes platforms require their own dual-stack LoadBalancer support.
- `clientRatelimit` is per Skipper instance. Use Skipper cluster ratelimit filters if the intended limit must be shared across multiple Skipper pods.
- Pinning the Skipper image tag instead of using `latest` would be preferable for production, but this was left unchanged because it is not an IPv6 correctness issue.
