# Validation Summary: How to Configure CoreDNS Rate Limiting to Prevent DNS Query Floods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS
- CoreDNS rrl plugin
- Kubernetes
- kubectl
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Go DNS lookups

## Sources Consulted
- CoreDNS in-tree plugins list: https://coredns.io/plugins/
- CoreDNS plugin.cfg: https://raw.githubusercontent.com/coredns/coredns/master/plugin.cfg
- CoreDNS rrl external plugin documentation: https://coredns.io/explugins/rrl/
- CoreDNS rrl GitHub README and source: https://github.com/coredns/rrl
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Go net.DNSError documentation: https://pkg.go.dev/net#DNSError

## Issues Found
- The post claimed a built-in CoreDNS `ratelimit` plugin exists in standard Kubernetes CoreDNS builds. CoreDNS does not include an in-tree `ratelimit` plugin; the maintained CoreDNS rate limiting plugin is the external `rrl` plugin. Updated the post to state that a custom CoreDNS image with `rrl:github.com/coredns/rrl` is required.
- The Corefile examples used invalid `ratelimit 100` syntax. Replaced them with documented `rrl` blocks using `requests-per-second`.
- The post described token bucket behavior and REFUSED responses. The rrl plugin tracks balances per client prefix and drops exceeded requests without writing a DNS response. Updated the explanation and response-handling text.
- The sliding-window example used unsupported `window 10s` syntax and implied 100 queries per 10-second window. Updated it to documented `window 10` syntax and clarified that `requests-per-second` remains a per-second allowance.
- The whitelist/blacklist example used unsupported directives. Replaced it with supported `ipv4-prefix-length`, `ipv6-prefix-length`, and `report-only` options.
- The metrics and alert examples referenced nonexistent `coredns_ratelimit_dropped_total`. Replaced this with `coredns_rrl_requests_exceeded_total` and `coredns_rrl_responses_exceeded_total`.
- The test command used `kubectl run` without `--command` for a custom command. Updated it to `kubectl run ... --command -- sh -c`.
- The metrics grep command searched for the old plugin name. Updated it to search for `coredns_rrl`.
- The log-counting command did not calculate average DNS QPS and depended on log output that is not enabled in the shown Corefile. Replaced it with a PromQL query using the documented `coredns_dns_requests_total` metric.

## Review Notes
The corrected article assumes readers can build and deploy a custom CoreDNS image containing the external rrl plugin. Managed Kubernetes offerings may not support replacing the CoreDNS image directly, so this should be checked against the target platform before production use.
