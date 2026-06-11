# Validation Summary: How to Build Least Connections Algorithm

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Python dataclasses and threading locks
- Least-connections load balancing
- Weighted least-connections load balancing
- NGINX upstream load balancing
- NGINX Plus active health checks
- HAProxy leastconn balancing, health checks, weights, and stick tables

## Sources Consulted
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- NGINX HTTP upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX HTTP upstream health-check module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html
- NGINX HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/

## Issues Found
- The Python `Server` and `WeightedServer` examples initialized `_lock` through an init-visible `None` field and `__post_init__`. Changed these to `field(default_factory=Lock, init=False, repr=False)` so each instance gets its own internal lock using the standard dataclasses pattern.
- The basic and weighted `handle_request` examples selected a server and incremented its connection count in separate steps. Under concurrent requests, multiple threads could choose the same stale minimum before any increment was recorded. Changed both examples to select and increment inside the load-balancer lock.
- The NGINX Plus health-check example placed the custom `health_check uri=/api/health match=json_health` directive in a separate `/health` location without proxying to the upstream. Moved the custom health check into the proxied location, where NGINX Plus active health checks are configured for the upstream group.
- The HAProxy stick-table example used `tcp-request content` for source-IP connection limiting in an HTTP frontend. Changed it to `tcp-request connection`, matching HAProxy's connection-level tracking pattern for `conn_cur` limits.

## Review Notes
The examples are suitable educational implementations, not production-ready reverse proxies. A production load balancer would also need real request forwarding, shared state across processes where applicable, draining behavior, timeout/error handling, observability, and careful handling of HTTP multiplexing semantics.
