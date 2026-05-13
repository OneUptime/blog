# Validation Summary: How to Optimize Node Local DNS Cache with Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (GlobalNetworkPolicy, projectcalico.org/v3 API)
- Kubernetes (kubectl, ConfigMap, DaemonSet)
- NodeLocal DNSCache
- CoreDNS (cache plugin, metrics)
- Prometheus / Prometheus Operator (PrometheusRule CRD)
- Mermaid (diagram rendering)

## Sources Consulted
- Kubernetes NodeLocal DNSCache docs: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- NodeLocal DNSCache reference manifest (k8s.io/dns): https://github.com/kubernetes/dns/tree/master/cmd/node-cache
- CoreDNS cache plugin metrics docs: https://coredns.io/plugins/cache/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

Verified items:
- Link-local IP `169.254.20.10` matches the documented default for NodeLocal DNSCache.
- Metrics port `9253` matches the default Prometheus port exposed by the CoreDNS cache plugin inside node-local-dns.
- ConfigMap name `node-local-dns` in `kube-system` and the pod label `k8s-app=node-local-dns` match the reference NodeLocal DNSCache manifest.
- Calico GlobalNetworkPolicy structure (`apiVersion`, `kind`, `spec.order`, `spec.selector: all()`, `spec.egress[].action/protocol/destination.nets/destination.ports`) is valid; uppercase `UDP`/`TCP` protocol values are accepted by the Calico v3 API.
- PrometheusRule manifest is structurally correct (`apiVersion: monitoring.coreos.com/v1`, `groups[].rules[].alert/expr/for/labels/annotations`).
- The awk pipeline matches the CoreDNS `coredns_cache_hits_total` / `coredns_cache_misses_total` metric lines via substring match, so the hit-rate computation runs as written.

## Review Notes
- The awk one-liner overwrites `hits`/`misses` on each matching line, so when the metrics include multiple label combinations (e.g., per-server/per-type), only the final matching value is used. The computation is still syntactically correct, but for a true cluster-wide hit rate users may want to sum the values. This is a minor accuracy caveat, not an error.
- Mermaid node labels use `\n` for line breaks; this works in current Mermaid versions but `<br/>` is the more portable form across renderers.
- The post mentions a `health` endpoint as a configuration option; in node-local-dns this is provided by the CoreDNS `health` plugin (default `:8080/health`) configured via the Corefile in the ConfigMap, which is consistent with the post's framing.
