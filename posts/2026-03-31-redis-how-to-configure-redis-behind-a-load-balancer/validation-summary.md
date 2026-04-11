# Validation Summary: How to Configure Redis Behind a Load Balancer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (primary/replica replication, Sentinel, Pub/Sub)
- HAProxy (TCP mode, tcp-check health checks)
- NGINX (stream module for TCP proxying)
- Predixy (Sentinel-aware Redis proxy)
- AWS Network Load Balancer (NLB)
- Python / Flask (health check HTTP endpoint)
- Twemproxy (mentioned, corrected)

## Sources Consulted
- Redis official documentation on replication and Sentinel: https://redis.io/docs/management/replication/ and https://redis.io/docs/management/sentinel/
- Twemproxy (nutcracker) GitHub repository and documentation: https://github.com/twitter/twemproxy — confirms Twemproxy is a sharding proxy with no Sentinel integration
- HAProxy documentation on tcp-check: https://docs.haproxy.org/2.8/configuration.html#4-tcp-check
- NGINX stream module documentation on proxy_timeout: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html#proxy_timeout
- Predixy GitHub repository and configuration reference: https://github.com/joyieldInc/predixy
- AWS NLB target group health check documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html

## Issues Found

1. **Twemproxy incorrectly described as Sentinel-aware (Pattern 3)**: The post stated "Use Predixy or Twemproxy, which integrate with Redis Sentinel." Twemproxy (nutcracker) is a sharding/partitioning proxy developed by Twitter. It does NOT integrate with Redis Sentinel and has no automatic primary discovery capability. Removed Twemproxy from this recommendation, keeping only Predixy which does support Sentinel.

2. **NGINX `proxy_timeout` set to 3s**: The `proxy_timeout` directive in NGINX's stream module controls the timeout between two successive read or write operations on a proxied connection. A value of 3s is far too low for Redis — idle connections in a pool would be terminated after just 3 seconds of inactivity. Changed to `300s`, which is appropriate for long-lived Redis connections.

3. **Cookie-based persistence mentioned for Redis Pub/Sub**: The post suggested "cookie-based persistence" as an option for Redis Pub/Sub connections. Cookies are an HTTP-layer concept and are not available for raw TCP connections like Redis. Corrected to specify source IP affinity, which is the appropriate TCP-level persistence mechanism.

4. **NLB health check script registration**: The post said to "Register this as a health check on the NLB target group" referring to a bash script. AWS NLB target groups only support TCP, HTTP, or HTTPS health checks — not arbitrary scripts. Clarified that the script needs to be exposed via an HTTP endpoint (such as the Python Flask service shown later in the post).

## Review Notes
- The HAProxy TCP health check configuration is a well-known and correct pattern for Redis primary detection.
- The Predixy configuration includes `Hash crc16` and `Distribution modula` settings which are more relevant to cluster/sharding scenarios than simple Sentinel setups, but they are valid Predixy configuration directives and won't cause errors.
- The Python Flask health check example works correctly but uses the development server (`app.run()`). For production use, a WSGI server like Gunicorn should be used. This is not a correctness issue for the blog post's educational purpose.
- The NGINX stream module requires compilation with `--with-stream` (or the dynamic module). This is not mentioned but is a common prerequisite that most readers would be aware of.
