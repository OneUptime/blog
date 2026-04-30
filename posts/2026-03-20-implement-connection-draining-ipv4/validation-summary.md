# Validation Summary: How to Implement Connection Draining for IPv4 Load Balancers

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy Runtime API
- NGINX Open Source upstream configuration
- NGINX Plus API
- AWS Application Load Balancer (ALB)
- AWS Network Load Balancer (NLB)
- Google Cloud Load Balancing backend services
- Kubernetes Pod lifecycle hooks

## Sources Consulted
- HAProxy Runtime API `set server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- HAProxy Runtime API `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/
- NGINX upstream module reference: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX Plus dynamic upstream configuration API: https://docs.nginx.com/nginx/admin-guide/load-balancer/dynamic-configuration-api/
- NGINX runtime control and graceful reloads: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- AWS ALB target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS ELB `DeregisterTargets` API: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DeregisterTargets.html
- AWS NLB target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS CLI `describe-target-health`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- Google Cloud connection draining: https://docs.cloud.google.com/load-balancing/docs/enabling-connection-draining
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/

## Issues Found
- The HAProxy example used `show servers state` to check whether active connections had drained. That command exposes persisted server state metadata, not live session counts. I replaced it with `show stat` and an `awk` filter that reads `scur`, which is the current session count for the target server.
- The HAProxy gradual weight-reduction loop used raw numeric values that implied percentage-style behavior. I changed the intermediate values to `50%`, `25%`, and `10%` so the example matches the documented weight syntax for relative reductions, while keeping `0` as the final absolute disable value before maintenance mode.
- The NGINX OSS section claimed there was no native draining support. Current NGINX Open Source documentation exposes the `drain` parameter on upstream `server` entries, with availability in OSS as of 1.29.6. I updated the section to use `drain` plus a graceful reload.
- The NGINX Plus API example used an older API path version. I updated the example to the current documented API version shown in the vendor docs.
- The ALB deregistration comment said ALB keeps sending existing connections for the full delay window. AWS documents that deregistering targets stop receiving new requests, while in-flight traffic is allowed to complete on existing connections. I corrected that wording.
- The NLB section implied that a deregistration delay alone cleanly closes TCP connections after the timeout. AWS documents that connection termination on deregistration is a separate target group attribute. I updated the example to include that attribute and corrected the explanation.
- The Kubernetes `preStop` note implied that `terminationGracePeriodSeconds` starts after the hook runs. Kubernetes documents that the grace-period countdown begins before `preStop` executes. I corrected the inline comment.

## Review Notes
- The NGINX OSS `drain` parameter is version-sensitive: the current post is accurate for NGINX Open Source 1.29.6 and later.
- HAProxy Runtime API changes are applied in memory; persistence across reloads depends on server-state configuration.
- NGINX Plus upstream API changes persist across reloads only when upstream state persistence is configured.
