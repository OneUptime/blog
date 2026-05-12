# Validation Summary: How to Secure Node Local DNS Cache with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (GlobalNetworkPolicy, projectcalico.org/v3 API)
- Kubernetes (kubectl, DaemonSet, ConfigMap)
- NodeLocal DNSCache
- CoreDNS
- Prometheus / Prometheus Operator (PrometheusRule)
- Mermaid (diagram syntax)

## Sources Consulted
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- kubernetes/dns project node-local-dns manifests and configuration defaults
- CoreDNS cache plugin metrics naming (`coredns_cache_hits_total`, `coredns_cache_misses_total`)
- Calico GlobalNetworkPolicy reference (projectcalico.org/v3 API)
- Prometheus Operator PrometheusRule CRD docs

## Issues Found
No technical issues found.

- The link-local IP `169.254.20.10` matches the example/default used in the upstream node-local-dns manifests (link-local 169.254.0.0/16 range).
- The metrics port `9253` matches the default Prometheus port exposed by node-local-dns.
- The ConfigMap name `node-local-dns` in `kube-system` and the pod label selector `k8s-app=node-local-dns` are correct.
- The Calico `GlobalNetworkPolicy` syntax (apiVersion, kind, selector, egress rules, nets, ports) is valid.
- The `PrometheusRule` syntax and the use of `up{job="node-local-dns"} == 0` are standard.

## Review Notes
- The awk-based metric scraping uses substring patterns `/cache_hits/` and `/cache_misses/`. The actual CoreDNS cache metrics are `coredns_cache_hits_total` and `coredns_cache_misses_total`; the substring patterns will match them, but multiple labeled series (e.g., `type="success"`, `type="denial"`) mean the script only captures the last matching value rather than aggregating. The script still produces a meaningful estimate but is a simplification.
- The Mermaid `\n` line break inside the node label `NodeLocal DNS\n169.254.20.10` is supported by recent Mermaid versions but older renderers may show the literal characters; `<br/>` is more universally supported.
- `calicoctl` is listed as a prerequisite but the post only uses `kubectl`. Not a technical error, just a minor inconsistency.
- The description mentions "preventing DNS rebinding attacks" but the actual policy snippet limits egress to the link-local DNS IP, which is more about egress restriction than rebinding mitigation per se. The policy is still correct.
