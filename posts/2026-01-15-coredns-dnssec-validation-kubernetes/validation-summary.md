# Validation Summary: How to Enable DNSSEC Validation in CoreDNS for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (hands-on configuration walkthrough with Corefile snippets, Kubernetes manifests, and dig-based testing)

## Technologies Covered
- CoreDNS (Corefile, `forward`, `dnssec`, `kubernetes`, `cache`, `health`, `ready`, `prometheus` plugins)
- DNSSEC (RRSIG, DNSKEY, DS, NSEC/NSEC3, AD flag, SERVFAIL semantics)
- Kubernetes (Deployment, Service, ConfigMap, RBAC, NetworkPolicy, Pod Security Standards)
- DNS over TLS (DoT) with public validating resolvers (Cloudflare, Google, Quad9, CleanBrowsing)
- Prometheus / Grafana monitoring (ServiceMonitor, PrometheusRule)
- `dig` / `dnssec-keygen` (BIND tools)

## Sources Consulted
- CoreDNS `dnssec` plugin docs — https://coredns.io/plugins/dnssec/ (confirms the plugin *signs* served data on the fly; it does not validate upstream answers; syntax is `key file`/`key aws_secretsmanager` + `cache_capacity`; default zones are the enclosing block's zones; metrics are `coredns_dnssec_cache_entries`, `coredns_dnssec_cache_hits_total`, `coredns_dnssec_cache_misses_total`)
- CoreDNS `forward` plugin docs — https://coredns.io/plugins/forward/ (no DNSSEC validation; it proxies messages — `tls://`, `tls_servername`, `health_check`, `expire`, `max_concurrent`, `policy` are valid)
- CoreDNS `cache`, `kubernetes`, `health`, `ready`, `prometheus` plugin docs (Corefile fields, ports 8080/8181/9153, `success`/`denial`/`prefetch` cache args)
- Kubernetes DNS / CoreDNS docs (default DNS since k8s 1.13, kube-dns Service `10.96.0.10`, RBAC for endpoints/endpointslices)
- DNSSEC test-domain references: dnssec-failed.org (Verisign Labs), sigfail.verteiltesysteme.net, rhybar.cz — confirmed as intentionally-bogus domains that return SERVFAIL under a validating resolver
- DNSSEC status of google.com — confirmed *not* DNSSEC-signed (no DS/DNSKEY), so it cannot demonstrate the AD flag

## Issues Found
1. **Core conceptual error: the `dnssec` plugin was presented as performing DNSSEC validation.** The post framed "Approach 2: Native DNSSEC Validation" around the `dnssec` plugin and inserted empty `dnssec { cache_capacity 10000 }` blocks in front of `forward` blocks, implying they validate upstream responses. Per the official docs, the `dnssec` plugin only performs on-the-fly *signing* of zones CoreDNS is authoritative for, and neither it nor the `forward` plugin validates upstream answers. Validation is obtained solely by forwarding to a validating upstream resolver (Approach 1).
   - Rewrote the "Enabling DNSSEC Validation" intro to state clearly that CoreDNS does not validate itself and that validation comes from the validating forwarder, with the `dnssec` plugin reframed as a signing tool.
   - Retitled "Approach 2: Native DNSSEC Validation" → "Approach 2: Signing Internal Zones with the `dnssec` Plugin" and corrected its description.
   - Removed the misleading empty `dnssec` blocks that preceded `forward` in the forwarding-only configs (Approach 2 example reframed to a keyed signing config; Step 1 ConfigMap; DoT config; debug config; Quick Reference minimal Corefile; and the `.:53` forward block in the zone-signing example).
   - Fixed the Summary Table row (was "DNSSEC Plugin | Native DNSSEC validation | Enable for external queries") and added a "Validating Forwarder" row; corrected the closing paragraph.
2. **`dnssec` plugin options table was inaccurate.** It omitted the (required) `key file` directive, described `cache_capacity` as caching generic "DNSSEC records," and listed the default zone as ". (root)". Corrected to include `key file`, describe `cache_capacity` as caching signatures (RRSIGs), and state the default zones are those of the enclosing server block. Added `key file` to the syntax block.
3. **Signing key path was incomplete.** `key file /etc/coredns/keys/Kcluster.local` was changed to `Kcluster.local.+013+12345` to match the actual `dnssec-keygen` output naming (base name without the `.key`/`.private` extension, including the algorithm/key-tag suffix; algorithm 13 = ECDSAP256SHA256).
4. **AD-flag test used an unsigned domain.** `dig ... google.com +dnssec` cannot show the AD (Authenticated Data) flag because google.com is not DNSSEC-signed. Changed to `iana.org`, which is signed.
5. **Malformed test domain.** `bogus.d.]ns-oarc.net` contained a stray `]` and is not a real test domain. Replaced with `rhybar.cz`, a long-standing intentionally-broken DNSSEC test domain that returns SERVFAIL under a validating resolver.

## Review Notes
- Kubernetes manifests (Deployment, Service, RBAC, NetworkPolicy), health/ready/metrics ports (8080/8181/9153), the kube-dns ClusterIP (10.96.0.10), and "CoreDNS default since k8s 1.13" are all correct and were left unchanged.
- Prometheus metric names (`coredns_dns_requests_total`, `coredns_dns_responses_total`, `coredns_forward_requests_total`, `coredns_forward_responses_total`, `coredns_cache_hits_total/misses_total`, `coredns_dnssec_cache_hits_total/misses_total`, `coredns_dns_request_duration_seconds_bucket`) are valid. Note the `dnssec` cache metrics reflect the *signing* cache, not validation — they only carry data if you actually sign a zone.
- The two Mermaid diagrams ("Without/With DNSSEC" flowchart and the attack sequence) are conceptual illustrations and attribute validation to CoreDNS itself; they were left as-is since they convey the end-to-end concept, but strictly the validation is performed by the upstream resolver and relayed by CoreDNS. The sequence diagram's example name (`payment-api.prod.svc`) is an internal cluster name that is not DNSSEC-protected by default — DNSSEC validation only benefits external/public names unless `cluster.local` is signed and clients validate.
- The "Known-Bad DNSSEC Domains" comment labels ("Expired signatures", "Missing RRSIG") are loose — dnssec-failed.org and sigfail.verteiltesysteme.net are simply bogus (wrong/invalid signatures) rather than literally expired or missing RRSIG. Left as-is since all three reliably return SERVFAIL, which is the point being demonstrated.
- The CoreDNS image is pinned to `coredns/coredns:1.11.1`; newer releases (1.12.x) exist by 2026, and the "Update to latest version" command still references 1.11.1. Not incorrect, but a future refresh could bump the version.
