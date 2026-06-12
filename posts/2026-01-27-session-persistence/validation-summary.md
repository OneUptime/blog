# Validation Summary: How to Implement Session Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (redis-py library)
- Redis (as session store)
- HAProxy (cookie persistence, source hash, stick tables, WebSocket)
- Nginx (ip_hash, hash-based consistent hashing, WebSocket proxying)
- AWS Application Load Balancer (ALB) — `aws elbv2` CLI
- AWS Network Load Balancer (NLB) — `aws elbv2` CLI
- Google Cloud Load Balancer — `gcloud compute backend-services`
- Azure Load Balancer / Application Gateway — `az network` CLI

## Sources Consulted
- HAProxy Configuration Manual (cookie directive, stick-table, balance source, hash-type, http-check): https://docs.haproxy.org/2.8/configuration.html
- Nginx upstream module documentation (ip_hash, hash, keepalive, server directive parameters): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx WebSocket proxying guide: https://nginx.org/en/docs/http/websocket.html
- AWS ELB v2 CLI reference — target group attributes for stickiness (`stickiness.enabled`, `stickiness.type`, `stickiness.lb_cookie.duration_seconds`, `stickiness.app_cookie.cookie_name`, `stickiness.app_cookie.duration_seconds`, `deregistration_delay.timeout_seconds`): https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS ALB sticky sessions docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/sticky-sessions.html
- Google Cloud `gcloud compute backend-services create` reference (`--session-affinity`, `--affinity-cookie-ttl-sec`, `--connection-draining-timeout`): https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Azure CLI reference for `az network lb rule create` (`--load-distribution` values: Default, SourceIP, SourceIPProtocol): https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Azure CLI reference for `az network application-gateway http-settings update` (`--cookie-based-affinity`, `--affinity-cookie-name`): https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- redis-py documentation for `Redis.get` / `Redis.setex`: https://redis-py.readthedocs.io/

## Issues Found
- **Missing `import json` in the Python Redis example.** The functions `get_session` and `save_session` use `json.loads` and `json.dumps`, but only the `redis` module was imported. Added `import json` alongside `import redis` so the example would actually run.

## Review Notes
- The HAProxy WebSocket frontend defines `acl is_websocket` twice with the same name; in HAProxy this creates an implicit OR between the two patterns, which is valid and appears intentional (match on `Upgrade: websocket` header OR a `ws` Host prefix). Kept as-is.
- `option http-keep-alive` in HAProxy defaults is redundant since keep-alive is the default mode, but it is harmless and arguably useful for clarity.
- The Nginx `ip_hash` upstream uses a `backup` server, which is supported with `ip_hash` (since Nginx 1.3.1 / 1.2.2). Correct.
- The GCP example labels the global TCP backend service as "Network Load Balancer." In current GCP terminology, the regional passthrough TCP/UDP LB is the "Network Load Balancer," while a global TCP backend service backs the proxy Network Load Balancer (formerly TCP Proxy LB). The command itself is syntactically valid; the label could be more precise but is not technically wrong under GCP's newer "proxy Network Load Balancer" naming.
- `listen 443 ssl;` in Nginx is still valid; from 1.25.1 the recommended way to enable HTTP/2 is the separate `http2 on;` directive, but the SSL listener syntax shown is correct.
- No version pinning is provided for HAProxy, Nginx, or the cloud CLIs; the directives and flags used are stable and supported across recent versions (HAProxy 2.x+, Nginx 1.18+, current AWS/GCP/Azure CLIs).
