# Validation Summary: How to Configure CoreDNS Log Plugin for DNS Query Debugging and Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS
- CoreDNS log, cache, kubernetes, forward, prometheus, health, ready, reload, loop, and loadbalance plugins
- Kubernetes ConfigMaps, kubelet log rotation, and kubectl logs
- Fluentd log parsing
- Elasticsearch
- Grafana Loki / LogQL
- Prometheus / PromQL

## Sources Consulted
- CoreDNS log plugin documentation: https://coredns.io/plugins/log/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Grafana Loki LogQL log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric query documentation: https://grafana.com/docs/enterprise-logs/latest/query/metric_queries/
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd tail input documentation: https://docs.fluentd.org/input/tail

## Issues Found
- The structured logging example incorrectly used `format` as a subdirective inside the CoreDNS `log` block. CoreDNS expects custom formats as an argument to `log [NAMES...] [FORMAT]`. Updated the example to use valid `log . "..." { class all }` syntax.
- The structured logging section claimed JSON output, but the example did not produce JSON and CoreDNS logs through its normal logger. Updated the wording and example to use parser-friendly key-value output.
- The per-zone logging example put `in-addr.arpa` and `ip6.arpa` inside the `kubernetes` plugin while the server block only matched `cluster.local`. Updated the server block to include `cluster.local:53 in-addr.arpa:53 ip6.arpa:53`.
- The top queried service-domain shell pipeline used a `grep` pattern that would usually fail against CoreDNS common log lines because the query name is one field inside the quoted request. Replaced it with an `awk` extraction of the qname field.
- The cache hit section implied logs could directly measure cache hits. CoreDNS exposes cache hit/request metrics via the cache and prometheus plugins, while log latency is only approximate. Updated the section to use Prometheus metrics for cache hit ratio and kept log analysis as a rough estimate.
- The Fluentd regexp did not account for CoreDNS log lines beginning with `[INFO]`. Updated the regexp to match the actual CoreDNS common log prefix.
- The Grafana dashboard examples were labeled `promql` and used `| json` against non-JSON CoreDNS common logs. Updated the block to `logql` and used Loki's `pattern` parser plus `count_over_time`, `rate`, and `unwrap duration(...)` where appropriate.

## Review Notes
The remaining examples are generally correct for common Kubernetes CoreDNS deployments, but several commands assume the CoreDNS pods use the label `k8s-app=kube-dns`. Some clusters use different labels such as `k8s-app=coredns`, so readers may need to adjust selectors for their environment.
