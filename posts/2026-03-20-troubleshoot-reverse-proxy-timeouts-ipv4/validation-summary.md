# Validation Summary: How to Troubleshoot Reverse Proxy IPv4 Connection Timeouts

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Nginx (reverse proxy timeout directives)
- HAProxy (timeout directives, termination state codes, stats socket)
- curl (`-w` timing output)
- tcpdump (proxy-to-backend traffic capture)
- socat (HAProxy admin socket access)

## Sources Consulted
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (verified defaults for `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`)
- Nginx `ngx_http_core_module` documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html (verified `keepalive_timeout`, `client_header_timeout`, `client_body_timeout` defaults)
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html (verified `keepalive`, `keepalive_timeout` in upstream block)
- HAProxy `configuration.txt` section 8.5 (Session state at disconnection): https://docs.haproxy.org/ (verified termination state code semantics)
- HAProxy `management.txt` (show stat CSV format / field numbers): https://docs.haproxy.org/ (verified column ordering)

## Issues Found

1. **HAProxy termination state codes were incorrect.**
   - Original: `cD = client disconnect`, `sD = server disconnect`, `SD = server timeout`, `cT = client timeout`
   - Per HAProxy docs section 8.5, the first character encodes the *reason* (uppercase = abort, lowercase = timeout) and the second encodes the *phase*. So `CD` = client abort during DATA (the real "client disconnect"), `SD` = server abort during DATA (the real "server disconnect"), `cD` = client-side timeout, `sD` = server-side timeout. `cT` would be a client-side timeout during the TARPIT phase (a rare, specific case), not a generic client timeout.
   - Fixed to use `CD`, `SD`, `cD`, `sD`, `--` with correct descriptions.

2. **HAProxy stats CSV awk column indices were wrong.**
   - Original: `dreq=$14`, `ereq=$16`, `econ=$19`, `eresp=$20`.
   - These indices appear to conflate the doc's 0-indexed field numbers with awk's 1-indexed positional variables, then drift. The actual CSV field order is `pxname,svname,qcur,qmax,scur,smax,slim,stot,bin,bout,dreq,dresp,ereq,econ,eresp,...`, so in awk the correct positions are `$11` (dreq), `$13` (ereq), `$14` (econ), `$15` (eresp).
   - Fixed to `$11`, `$13`, `$14`, `$15`.

## Review Notes
- All Nginx timeout defaults in the table are correct as of current Nginx documentation (60s for the proxy/client directives, 75s for `keepalive_timeout`).
- The `keepalive_timeout` directive inside an `upstream` block is valid (available since Nginx 1.15.3).
- `proxy_send_timeout` is accurately described as the idle time between successive write operations (not the total request-send time).
- The HAProxy termination-state taxonomy is notoriously easy to get wrong because uppercase vs lowercase encodes abort vs timeout; the corrected comments now reflect that.
