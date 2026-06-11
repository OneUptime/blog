# Validation Summary: How to Build Host-Based Routing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP Host headers
- Node.js HTTP and DNS APIs
- Express.js and vhost middleware
- Redis sorted sets and ioredis
- PostgreSQL connection pooling with node-postgres
- Nginx virtual hosts and rate limiting
- Kubernetes networking.k8s.io/v1 Ingress
- ingress-nginx annotations
- Traefik dynamic HTTP routing
- Prometheus metrics with prom-client

## Sources Consulted
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js DNS documentation: https://nodejs.org/api/dns.html
- MDN Host header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Host
- Express vhost middleware documentation: https://expressjs.com/en/resources/middleware/vhost/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Nginx server names documentation: https://nginx.org/en/docs/http/server_names.html
- Nginx ngx_http_limit_req_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Traefik HTTP routers rules and priority documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Redis sorted set command documentation: https://redis.io/docs/latest/commands/zadd/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
- Wildcard host matching in the custom JavaScript router matched multiple subdomain labels, while the examples describe tenant subdomains and Kubernetes/Traefik wildcard hosts use single-label wildcard semantics. Updated the custom wildcard matchers to reject extracted subdomains containing dots.
- The subdomain extraction middleware accepted hosts that merely ended with the base domain string, such as suffix lookalikes. Changed the check to require `.${baseDomain}`.
- The host-aware rate limiter diagram labeled the algorithm as a token bucket, but the code implements a Redis sorted-set sliding window. Updated the diagram label to `Sliding Window`.
- The host-aware rate limiter added rejected requests to the Redis sorted set before returning `429`, which would make denied requests extend the window. Moved the `zadd`/`expire` write so it only runs after the request is accepted.
- The Nginx wildcard tenant regex used `.+`, allowing multi-label tenants such as `a.b.tenant.example.com`. Changed it to `[^.]+` for a single DNS label.
- The Kubernetes ingress-nginx example used undocumented `nginx.ingress.kubernetes.io/rate-limit` and `rate-limit-window` annotations. Replaced them with the documented `nginx.ingress.kubernetes.io/limit-rpm`.
- The Traefik example used v2-style named `HostRegexp` syntax. Updated the rules to v3-compatible Go-regexp syntax.
- The security validation wildcard check allowed multi-label wildcard matches. Updated it to require a single extracted subdomain label.

## Review Notes
The code remains tutorial-grade and includes placeholders such as `db`, handler functions, and certificate provisioning hooks that must be supplied by a real application. The Redis sliding-window limiter is still a simplified implementation and is not fully atomic under high concurrency; production systems should use a Lua script or a proven rate-limiting library for strict limits.
