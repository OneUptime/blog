# Validation Summary: How to Configure Apache APISIX for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache APISIX
- NGINX
- IPv6
- etcd
- curl

## Sources Consulted
- Apache APISIX Admin API: https://apisix.apache.org/docs/apisix/admin-api/
- Apache APISIX Installation Guide: https://apisix.apache.org/docs/apisix/installation-guide/
- Apache APISIX Upstream terminology and examples: https://apisix.apache.org/docs/apisix/terminology/upstream/
- Apache APISIX `ip-restriction` plugin: https://apisix.apache.org/docs/apisix/plugins/ip-restriction/
- Apache APISIX source `conf/config.yaml`: https://raw.githubusercontent.com/apache/apisix/master/conf/config.yaml
- Apache APISIX source `conf/config.yaml.example`: https://github.com/apache/apisix/blob/master/conf/config.yaml.example
- Apache APISIX source `apisix/cli/config.lua`: https://github.com/apache/apisix/blob/master/apisix/cli/config.lua
- Apache APISIX source `apisix/cli/ops.lua`: https://github.com/apache/apisix/blob/master/apisix/cli/ops.lua
- Apache APISIX source `apisix/cli/ngx_tpl.lua`: https://github.com/apache/apisix/blob/master/apisix/cli/ngx_tpl.lua
- NGINX `listen` directive reference: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen

## Issues Found
- The post used an unsupported top-level `admin_api` block and `etcd.hosts` key. I changed these to the current APISIX 3.x layout under `deployment.admin` and `deployment.etcd.host`.
- The post used `ip: "::"` for listener bindings. APISIX renders listener addresses directly into NGINX `listen` directives, where IPv6 literals must be bracketed; for the gateway listeners, I switched to the documented dual-stack pattern of `enable_ipv6: true` with `ip` omitted.
- The post implied separate IPv4 and IPv6 Admin API listeners. Current APISIX exposes a single `deployment.admin.admin_listen` entry, so I corrected the example to bind the Admin API on IPv6 loopback instead of using a nonexistent `admin_listen_ipv6` field.
- The Admin API examples targeted `http://[::1]:9180`, but the default `allow_admin` list only permits `127.0.0.0/24`. I added `::1/128` so the documented IPv6 Admin API requests are actually authorized.
- I changed `upstream_id` from a string to a number to align with APISIX Admin API examples and reduce ambiguity.
- I updated the verification and troubleshooting text to reflect the corrected listener behavior, `allow_admin` requirement, and the proper etcd config path.

## Review Notes
- Reviewed against current Apache APISIX 3.x documentation and source as of 2026-05-06. The corrected post is accurate for current 3.x config layout, but APISIX’s documented examples are maintained against the latest 3.x release rather than every historical minor version.
- The gateway listeners can be dual-stack through `enable_ipv6: true`, but the Admin API is configured through a single `admin_listen` entry in current APISIX source.
