# Validation Summary: How to Configure CoreDNS for IPv6 DNS Resolution in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (hands-on configuration walkthrough with extensive YAML, shell, and PromQL examples)

## Technologies Covered
- CoreDNS (Corefile, plugins: kubernetes, forward, cache, dns64, dnssec, hosts, file, log, debug, prometheus, health, ready, loadbalance)
- Kubernetes (dual-stack networking, kubeadm, Services, ipFamilyPolicy/ipFamilies, NetworkPolicy, Deployment)
- IPv6 / DNS fundamentals (AAAA records, ip6.arpa reverse DNS, DNS64/NAT64, RFC 6052, RFC 7050)
- Prometheus / Grafana (CoreDNS metrics, alerting rules, PromQL)

## Sources Consulted
- CoreDNS dnssec plugin — https://coredns.io/plugins/dnssec/
- CoreDNS forward plugin (metrics) — https://coredns.io/plugins/forward/
- CoreDNS metrics plugin (metric labels) — https://coredns.io/plugins/metrics/
- CoreDNS kubernetes / cache / dns64 plugin docs — https://coredns.io/plugins/
- Kubernetes dual-stack GA blog — https://kubernetes.io/blog/2021/12/08/dual-stack-networking-ga/
- Kubernetes removed feature gates reference — https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- RFC 6052 (NAT64 well-known prefix 64:ff9b::/96) and RFC 7050 (ipv4only.arpa)

## Issues Found
1. **Obsolete `IPv6DualStack` feature gate would break kubelet.** The kubeadm `InitConfiguration` set `kubeletExtraArgs.feature-gates: "IPv6DualStack=true"`. Dual-stack went GA in Kubernetes 1.23 and the feature gate was removed (fully gone by 1.27); setting a removed gate causes kubelet to fail to start. Removed the now-pointless `InitConfiguration` block (its only purpose was the dead gate) and added a comment explaining dual-stack is enabled automatically by supplying both CIDRs in `ClusterConfiguration`.

2. **DNSSEC section incorrectly described the `dnssec` plugin as validation.** The CoreDNS `dnssec` plugin performs on-the-fly *signing* of zones CoreDNS is authoritative for — it does **not** validate upstream responses, and it requires a signing key (an empty `dnssec {}` block is non-functional). Corrected the section comments to state that DNSSEC security in this config actually comes from forwarding to validating upstream resolvers (Quad9), and removed the misleading/non-functional empty `dnssec` block.

3. **Prometheus alert used a non-existent label.** `CoreDNSIPv6ResolutionFailing` filtered `coredns_dns_responses_total{qtype="AAAA",...}`, but `coredns_dns_responses_total` has no `qtype`/`type` label (its labels are `server, zone, view, rcode, plugin`), so the alert would never produce data. Reworked it into a valid `CoreDNSResolutionFailing` alert based on the overall SERVFAIL rate (where failing AAAA/IPv6-upstream lookups surface), with a comment explaining CoreDNS does not break responses down by query type.

4. **Grafana query used a label that doesn't exist on the metric.** `coredns_forward_healthcheck_broken_total{to=~".*:.*:.*"}` — `coredns_forward_healthcheck_broken_total` has *no* labels (it only counts when all upstreams are down). Replaced with `coredns_proxy_healthcheck_failures_total{proxy_name="forward", to=~".*:.*:.*"}`, the current per-upstream health-check-failure metric that does carry a `to` label for matching IPv6 upstreams.

5. **Malformed PTR test query.** The `nslookup -type=PTR` example contained a garbled reverse name with an invalid nibble count (`...8.8.8.8.8.8.b.d...`). Replaced with the correct 32-nibble ip6.arpa reverse name for `2001:db8::1`.

## Review Notes
- The "Key Differences" table's PTR examples (`1.168.192.in-addr.arpa`, `1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa`) are schematic/abbreviated (they omit intermediate octets/nibbles to illustrate label reversal). Left as-is since they read as format illustrations, not runnable queries; a future revision could either show the full reverse names or label them explicitly as abbreviated.
- `coredns_cache_misses_total` is still emitted but is increasingly considered legacy; cache hit-ratio dashboards may prefer deriving misses from `coredns_cache_requests_total - coredns_cache_hits_total` on newer CoreDNS builds.
- The deprecated `coredns_forward_healthcheck_failures_total{to}` still works on CoreDNS 1.11.1; the post (post-fix) uses the recommended `coredns_proxy_*` replacement, which is the forward-looking choice.
- Plugin syntax otherwise verified correct: `cache { success/denial CAPACITY TTL }`, `loadbalance round_robin`, `forward` options (`max_concurrent`, `health_check`, `expire`, `policy`, `prefer_udp`), `kubernetes` `pods insecure|verified` and `endpoint_pod_names`, `dns64 { prefix 64:ff9b::/96 }`, and the health (8080) / ready (8181) / prometheus (9153) endpoint ports. The `coredns/coredns:1.11.1` image and `kubeadm.k8s.io/v1beta3` API are current and appropriate.
