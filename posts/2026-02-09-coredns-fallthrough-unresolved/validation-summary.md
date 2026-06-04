# Validation Summary: How to Configure CoreDNS Fallthrough Behavior for Unresolved DNS Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS kubernetes plugin
- CoreDNS hosts plugin
- CoreDNS rewrite plugin
- CoreDNS forward plugin
- CoreDNS prometheus metrics
- kubectl
- Prometheus/PromQL

## Sources Consulted
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS rewrite plugin documentation: https://coredns.io/plugins/rewrite/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS manual, query processing and fallthrough behavior: https://coredns.io/manual/toc/
- CoreDNS plugin ordering source, plugin.cfg: https://github.com/coredns/coredns/blob/master/plugin.cfg

## Issues Found
- Corrected the general fallthrough explanation. CoreDNS fallthrough applies when a supporting plugin is authoritative for the query zone and cannot generate an answer; it is not a blanket behavior for every plugin or every external query.
- Replaced the external-domain fallthrough example with a reverse DNS example. In the standard Kubernetes CoreDNS configuration, ordinary external names are outside the kubernetes plugin's authoritative zones and are forwarded without needing kubernetes fallthrough.
- Corrected wording around the kubernetes plugin so fallthrough is described as commonly needed for reverse DNS zones, not required for all external queries.
- Corrected the rewrite example wording. The rewrite plugin uses rewrite rules and `continue`/`stop`, not a `fallthrough` directive.
- Adjusted the query-flow explanation to account for CoreDNS plugin ordering, where rewrite is registered before hosts in the standard plugin order.
- Updated debugging guidance because the `log` plugin shows query and response information, not full per-plugin progression.
- Replaced deprecated/incorrect Prometheus metric examples. `coredns_forward_requests_total` is deprecated, and `coredns_kubernetes_dns_programming_duration_seconds_count` measures DNS programming latency, not queries handled by the kubernetes plugin.
- Fixed the PromQL alert expression to aggregate both numerator and denominator before division so label mismatches do not produce an empty or incorrect result.
- Removed guidance implying Corefile plugin order can be used as a general performance ordering mechanism. CoreDNS plugin execution order is determined by the compiled plugin order, with an exception noted by the forward plugin docs for multiple forward directives in one server block.
- Corrected the conclusion so it no longer states that kubernetes fallthrough is what ensures external domains resolve.

## Review Notes
The Corefile snippets are generally syntactically consistent with current CoreDNS plugin documentation. The examples remain conceptual and should still be tested against the specific CoreDNS build shipped by a Kubernetes distribution, because available plugins and compiled plugin order can vary by build.
