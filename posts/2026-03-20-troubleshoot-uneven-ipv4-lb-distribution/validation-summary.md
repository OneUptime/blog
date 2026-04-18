# Validation Summary: How to Troubleshoot Uneven IPv4 Load Balancer Distribution

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- HAProxy (stats socket, CSV stats, balance algorithms, stick tables, health checks)
- Nginx (upstream module, `least_conn`, log parsing)
- AWS Application Load Balancer (cross-zone load balancing, target group stickiness)
- AWS CLI (`elbv2`, `cloudwatch`)
- Bash / awk / socat / grep tooling

## Sources Consulted
- HAProxy Management Guide (CSV stats column reference): https://docs.haproxy.org/2.8/management.html
- HAProxy Runtime API `show stat` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Configuration Manual (`balance`, `server` directives, `rise`/`fall`/`inter`): https://docs.haproxy.org/2.8/configuration.html
- Nginx upstream module docs (`least_conn`): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- AWS ELBv2 CLI reference: `modify-load-balancer-attributes`, `describe-target-group-attributes`, `modify-target-group-attributes`
- AWS CloudWatch `get-metric-statistics` CLI reference and AWS/ApplicationELB `RequestCountPerTarget` metric documentation

## Issues Found
Several HAProxy CSV stats column indices were incorrect. The CSV format has a fixed 1-based column ordering; the post referenced wrong columns that would have produced misleading output:

1. **Diagnose section (per-server traffic awk)** — used `$19` for "conns" and `$48` for "req". Column 19 is `weight` and column 48 is `req_rate_max`. Fixed to `$5` (`scur`, current sessions) and `$49` (`req_tot`, total HTTP requests).
2. **Cause 3 (current weights awk)** — used `$6` to print weights. Column 6 is `smax` (max sessions). Fixed to `$19` (`weight`).
3. **Cause 5 (fail/recovery awk)** — used `$13` for "fails" and `$14` for "downs". Columns 13 and 14 are `ereq` and `econ` (request/connection errors), not health-check counters. Fixed to `$22` (`chkfail`) and `$23` (`chkdown`).
4. **Verification section (live watch awk)** — used `$19` for "sessions". Fixed to `$5` (`scur`).

All other commands and configuration snippets (HAProxy `balance leastconn`, Nginx `least_conn` upstream block, HAProxy `server ... check inter rise fall` syntax, AWS CLI invocations for ALB attributes/target-group stickiness/CloudWatch metrics) were verified as correct.

## Review Notes
- The Nginx grep example assumes a custom log format that emits `upstream_addr="..."` (the default `combined` format does not include `$upstream_addr`). This is a reasonable assumption for the tutorial context but worth noting for readers using default log formats.
- The first code block in "Cause 1" is fenced as ```nginx but contains both an HAProxy backend stanza and an Nginx upstream block. Syntax highlighting will be imperfect, but the content is technically correct; left as-is per the "do not make stylistic changes" guidance.
- HAProxy CSV column ordering is stable across the 1.5 → 2.x line, so the corrected indices apply to current LTS releases.
