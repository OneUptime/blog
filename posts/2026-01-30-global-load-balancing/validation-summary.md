# Validation Summary: How to Build Global Load Balancing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Global load balancing
- GeoDNS and latency-based DNS routing
- Anycast and BGP routing
- AWS Route 53
- Terraform AWS provider
- Cloudflare Load Balancing API
- Cloudflare Workers
- Kubernetes health probes
- FastAPI
- Prometheus and PromQL
- CDN and multi-region architecture patterns

## Sources Consulted
- AWS Route 53 geolocation routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html
- AWS Route 53 latency-based routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html
- AWS Route 53 health checks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html
- AWS Route 53 alias health evaluation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-complex-configs.html
- Terraform AWS provider `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS provider `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Cloudflare Load Balancing API reference: https://developers.cloudflare.com/api/resources/load_balancers/
- Cloudflare manage load balancers: https://developers.cloudflare.com/load-balancing/load-balancers/create-load-balancer/
- Cloudflare manage pools: https://developers.cloudflare.com/load-balancing/pools/create-pool/
- Cloudflare manage monitors: https://developers.cloudflare.com/load-balancing/monitors/create-monitor/
- Cloudflare Workers module migration: https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
- Cloudflare Workers Fetch API: https://developers.cloudflare.com/workers/runtime-apis/fetch/
- FastAPI lifespan events: https://fastapi.tiangolo.com/advanced/events/
- FastAPI response handling: https://fastapi.tiangolo.com/advanced/additional-status-codes/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus histograms and `histogram_quantile`: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The Terraform Route 53 health check examples used `ip_address = aws_lb.*.dns_name`. `ip_address` must be an IPv4 or IPv6 address, so the examples now use `fqdn = aws_lb.*.dns_name`.
- The general anycast description implied IP-layer routing is simply faster than DNS-based routing. It now states the more precise behavior: anycast avoids DNS cache and TTL delays for normal routing decisions, while failover still depends on BGP convergence.
- The latency-based routing description said it measures actual user-to-server latency. It now describes the behavior more generally as routing from network latency measurements to the lowest observed-latency endpoint.
- The Cloudflare monitor example tried to set `User-Agent`, but Cloudflare monitor documentation says that header cannot be overridden. The example now uses a supported `Host` header and changes the expected body to the stable substring `healthy`.
- The Cloudflare pool example used deprecated `notification_email`. It was removed; health notifications should be configured through Cloudflare's centralized notification service.
- The Cloudflare Worker example used deprecated Service Worker `addEventListener('fetch')` syntax. It now uses the recommended ES module `export default { fetch() }` format.
- The Worker request forwarding code reused `request.body` for all methods and modified request headers after constructing the request. It now builds a mutable `Headers` object before constructing the upstream request and omits a body for `GET` and `HEAD`.
- The Worker health check comment claimed a short timeout, but the code did not enforce one. It now uses `AbortController`.
- The FastAPI example used deprecated `@app.on_event` startup and shutdown handlers. It now uses a lifespan context manager.
- Several FastAPI error responses returned `str(dict)` or hand-written JSON strings with `application/json`. They now use `JSONResponse` with structured JSON content.
- The FastAPI timestamps used `datetime.utcnow()`, which is deprecated in current Python. They now use timezone-aware UTC timestamps.

## Review Notes
- The examples are intentionally illustrative and still assume surrounding resources exist, such as AWS load balancers, Route 53 zones, Cloudflare account permissions, database credentials, and application metrics.
- Cloudflare `pop_pools` are Enterprise-only according to the API reference; the example is technically valid for eligible plans but should be called out in future revisions if plan availability matters.
