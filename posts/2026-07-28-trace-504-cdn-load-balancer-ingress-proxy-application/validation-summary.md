# Validation Summary: How to Trace a 504 Across CDN, Load Balancer, Ingress, Proxy, and App

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- HTTP 504 Gateway Timeout semantics
- Distributed tracing and W3C Trace Context
- Cloudflare CDN, Ray IDs, Logpush, and Workers subrequest logs
- AWS Application Load Balancer access logs and request tracing
- Google Cloud Load Balancing backend service timeouts
- Kubernetes Services, EndpointSlices, Pods, and kubectl
- ingress-nginx upstream access logging
- NGINX reverse proxy logging and upstream timing variables
- curl request routing with `--resolve`

## Sources Consulted
- [RFC 9110: 504 Gateway Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Cloudflare: Error 502 or 504](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-502-504/)
- [Cloudflare Ray ID](https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/)
- [Cloudflare HTTP request log fields](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/)
- [Cloudflare: 504 responses with origin status 0 in Logpush](https://developers.cloudflare.com/logs/faq/504-origin-status-0/)
- [Cloudflare Worker subrequest logs](https://developers.cloudflare.com/logs/faq/worker-subrequests/)
- [AWS Application Load Balancer access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [AWS Application Load Balancer request tracing](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-request-tracing.html)
- [AWS: Troubleshoot Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html)
- [Google Cloud backend services and timeout semantics](https://cloud.google.com/load-balancing/docs/backend-service)
- [ingress-nginx log format](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/log-format/)
- [ingress-nginx ConfigMap options](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [NGINX HTTP log module](https://nginx.org/en/docs/http/ngx_http_log_module.html)
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [curl command-line reference](https://curl.se/docs/manpage.html#--resolve)

## Issues Found
- W3C trace-context propagation mentioned only `traceparent`. Added propagation of an accompanying `tracestate` header because conforming trace-context propagation preserves both headers when `tracestate` is present.
- The Kubernetes commands used `<namespace>` and `<service>` directly in a Bash block. In a shell, angle brackets are redirection operators, so the example would not run as shown. Replaced them with initialized shell variables and quoted expansions.
- The ALB access-log discussion could imply that a missing line becomes proof after coverage is checked. AWS documents ALB access logging as best effort, so the wording now treats absence as supporting evidence rather than proof even after coverage and delivery checks.

## Review Notes
- The post correctly distinguishes a status forwarded by an outer proxy from a timeout generated locally, and it consistently advises readers to preserve each product's local status and timing semantics.
- Cloudflare's `OriginResponseStatus=0` caveat, Worker `ParentRayID` chaining, ALB `elb_status_code` versus `target_status_code`, ingress-nginx default log fields, NGINX timing-variable definitions, EndpointSlice selector, and curl `--resolve` syntax were verified against current official documentation.
- No deprecated APIs or version-specific claims requiring further changes were found.
