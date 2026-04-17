# Validation Summary: How to Set Up ClickHouse with Cloud-Native Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface port 8123, native TCP interface port 9000)
- Kubernetes Services (type LoadBalancer)
- AWS Elastic Load Balancing (ALB, target groups, stickiness)
- AWS CLI (`aws elbv2` commands)
- NGINX (upstream / reverse proxy)

## Sources Consulted
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http (ports, `/ping` response "Ok.\n")
- ClickHouse native TCP interface docs: https://clickhouse.com/docs/en/interfaces/tcp (port 9000)
- AWS CLI reference for `elbv2 create-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI reference for `elbv2 modify-target-group-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS ALB stickiness attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/sticky-sessions.html (`stickiness.enabled`, `stickiness.type=lb_cookie`, `stickiness.lb_cookie.duration_seconds`)
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer
- NGINX `upstream` / `least_conn` directive: https://nginx.org/en/docs/http/ngx_http_upstream_module.html

## Issues Found
No technical issues found.

- Port assignments (8123 HTTP, 9000 native TCP) are accurate.
- `/ping` response (`Ok.`) is correct.
- AWS CLI flags for `create-target-group` and `modify-target-group-attributes` (including stickiness keys) are valid and current.
- Kubernetes Service YAML is syntactically valid; default protocol (TCP) is correct for both ports.
- NGINX upstream config with `least_conn` is valid.

## Review Notes
- `aws elbv2 create-target-group` also requires `--vpc-id` in practice when `--target-type instance` is used. It is omitted here for brevity, which is common in documentation examples; readers reproducing the command will need to supply their own VPC ID.
- AWS ALB is L7 (HTTP/HTTPS only). The post correctly uses ALB for the HTTP interface and a Kubernetes `LoadBalancer` Service (L4) for the native protocol. Readers running on bare AWS (outside Kubernetes) would need an NLB for port 9000, which is implicit rather than stated explicitly.
- ClickHouse also exposes `/replicas_status` as a more thorough readiness probe for replicated tables; `/ping` is fine as a basic liveness check as the post describes.
