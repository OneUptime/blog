# Validation Summary: How to Configure Traefik Ingress Controller for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy / Traefik Ingress Controller
- Traefik Helm Chart
- Kubernetes Ingress
- Traefik IngressRoute and Middleware CRDs
- Kubernetes dual-stack Services
- IPv6, X-Forwarded-For, and IP allowlists
- Helm, kubectl, and curl

## Sources Consulted
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- Traefik Helm chart Service template helpers: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/templates/_service.tpl
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/
- Traefik IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik IPAllowList middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ipallowlist/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Traefik official image Dockerfile: https://github.com/traefik/traefik-library-image/blob/master/v3.6/scratch/Dockerfile

## Issues Found
- The Helm values placed `ipFamilyPolicy` and `ipFamilies` directly under `service`, but the Traefik chart adds arbitrary Kubernetes Service fields through `service.spec`. Moved the dual-stack fields under `service.spec` and kept `type: LoadBalancer` there.
- The Helm values set entry point container ports to `80` and `443` and used `ports.websecure.tls.enabled`, which does not match the current chart values shape. Updated the example to use chart defaults-style container ports `8000` and `8443`, `exposedPort` values `80` and `443`, and `ports.websecure.http.tls.enabled`.
- The example used extra `additionalArguments` for entry point addresses even though the chart already generates entry point address arguments from `ports.*`. Replaced those with the chart-supported `ports.*.forwardedHeaders.trustedIPs` values.
- The standard Ingress referenced an undefined "real IP" middleware and described it as stripping `X-Forwarded-For`. Removed that middleware reference and added the documented `router.tls: "true"` annotation for a TLS Ingress on `websecure`.
- The IngressRoute example used a `certResolver` without configuring a resolver and included a Headers middleware that did not handle IPv6 client IPs. Replaced the resolver with a Kubernetes TLS Secret and removed the misleading middleware.
- The IP allowlist example contained an invalid IPv6 CIDR, `2001:db8:corp::/48`. Replaced it with the valid documentation-prefix example `2001:db8:100::/48`.
- The `ipStrategy.depth` comment said it skipped one proxy, but Traefik defines `depth` as selecting an address from the right side of `X-Forwarded-For`. Updated the comment to match Traefik's documented behavior.
- The backend Service section was labeled as a Traefik Service even though the YAML defined the application backend Service. Renamed the section and filename comment to refer to the backend service.
- The verification commands used `ip` and `ss` inside the Traefik pod. The default Traefik image is minimal and should not be assumed to contain those tools, so the checks now use Kubernetes-reported pod IPs and Deployment arguments.
- The curl examples used invalid placeholder IPv6 literals such as `2001:db8::traefik` and tested HTTP despite the route examples being TLS-based. Replaced them with a valid placeholder address and `curl --resolve` HTTPS examples so Host/SNI are correct.
- The dashboard port-forward command targeted a Service port that the default chart does not expose. Changed it to port-forward the Deployment on `8080` and clarified that it applies when `api.insecure` is enabled for local testing.
- The conclusion used the invalid `[:]:port` entry point syntax and overstated that `PreferDualStack` guarantees both external load balancer addresses. Corrected the entry point syntax and clarified that cloud load balancer IPv6 support is required.

## Review Notes
The article is technically valid after the corrections. In a future revision, it could include provider-specific cloud load balancer annotations because external IPv6 behavior varies by Kubernetes provider.
