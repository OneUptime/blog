# Validation Summary: How to Configure Load Balancer Session Persistence with IPv4 Source Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- NGINX
- AWS Application Load Balancer (ALB)
- AWS Network Load Balancer (NLB)
- AWS CLI
- IPv4-based session persistence

## Sources Consulted
- HAProxy session persistence documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/session-persistence/
- NGINX `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- AWS Application Load Balancer target group attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS Network Load Balancer target group attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS CLI `modify-target-group-attributes` reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html

## Issues Found
- The NLB section incorrectly said source IP-based persistence is used automatically. AWS documentation says target group stickiness is disabled by default, so the post was updated to show explicit NLB stickiness configuration with `stickiness.enabled=true` and `stickiness.type=source_ip`.
- The HAProxy explanation overstated the guarantee by saying requests will always go to the same backend server for 30 minutes. HAProxy and NGINX both document that traffic can move if the selected server becomes unavailable, so the wording was updated to reflect persistence to the same available backend.
- The NGINX section heading used `upstream_hash`, which is not an NGINX directive name. The heading was simplified to avoid implying a non-existent directive.

## Review Notes
- `ip_hash` in NGINX uses the first three octets of an IPv4 address as the hash key; `hash $remote_addr consistent` is the more precise example when full-IP hashing is desired.
- AWS ALB stickiness remains cookie-based rather than source-IP-based.
- NLB sticky sessions are not supported for TLS or QUIC listeners.
