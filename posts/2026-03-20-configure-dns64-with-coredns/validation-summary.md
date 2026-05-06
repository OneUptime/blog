# Validation Summary: How to Configure DNS64 with CoreDNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CoreDNS
- DNS64
- NAT64
- Kubernetes
- `kubectl`
- Prometheus
- IPv6
- DNS

## Sources Consulted
- CoreDNS DNS64 plugin documentation: https://coredns.io/plugins/dns64/
- CoreDNS Prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS errors plugin documentation: https://coredns.io/plugins/errors/
- CoreDNS 1.7.0 release notes: https://coredns.io/2020/06/15/coredns-1.7.0-release/
- CoreDNS upstream repository and current release information: https://github.com/coredns/coredns
- Kubernetes documentation, Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 7050, Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.html

## Issues Found
- The install example pinned CoreDNS `1.11.1`, which was outdated relative to the current upstream release. I updated the download example to `1.14.2`.
- The post said the DNS64 `prefix` directive was required, but the official CoreDNS DNS64 documentation shows the well-known prefix `64:ff9b::/96` is the default. I corrected the option description to mark `prefix` as optional.
- The post used `translate_all false`, but the official DNS64 syntax exposes `translate_all` as a flag with no boolean argument. I corrected both Corefile examples accordingly.
- The DNS64 options section omitted `allow_ipv4`, which is an official DNS64 option and is relevant because DNS64 synthesis is IPv6-only by default. I added the missing option and clarified the default behavior.
- The basic Corefile comment for `errors` incorrectly said it returns `SERVFAIL` on errors. The official `errors` plugin documentation states that it logs errors to standard output. I corrected the comment.
- The testing section used `example.com` as a domain with only `A` records, but DNS64 synthesis only happens when no `AAAA` records are available. I replaced that with `ipv4only.arpa`, which RFC 7050 and RFC 8880 define specifically for this kind of DNS64/NAT64 testing.
- The testing section used plain `nslookup example.com`, which does not reliably demonstrate AAAA synthesis. I changed it to `nslookup -type=AAAA ipv4only.arpa`.
- The interactive Kubernetes test pod example omitted `--restart=Never`. The current `kubectl run` reference documents `--restart=Never` for this foreground disposable pod pattern, so I added it.
- The host-side `dig` example did not account for the CoreDNS DNS64 behavior that synthesis only occurs for queries received over IPv6 unless `allow_ipv4` is enabled. I changed the example to query an IPv6 CoreDNS service address explicitly.
- The monitoring section used a nonexistent metric name, `coredns_dns64_requests_total`. The official DNS64 plugin metric is `coredns_dns64_requests_translated_total{server}`. I corrected the metric and the example rate query.
- The monitoring section said CoreDNS exposes Prometheus metrics on port `9153` by default. Official documentation says metrics are only exposed when the `prometheus` plugin is enabled, with `localhost:9153` as the default bind address. I corrected the wording to match the configuration shown in the post.

## Review Notes
- CoreDNS DNS64 only synthesizes AAAA records for queries received over IPv6 by default. Readers testing from dual-stack or IPv4-only clients would need `allow_ipv4` enabled or an IPv6 transport path to observe synthesis.
- The statement about DNS64 being built in is accurate for standard CoreDNS release binaries. Custom CoreDNS builds can differ depending on which plugins are compiled in.
- I verified the broken `translate_all false` example against a real CoreDNS `1.14.2` binary; it fails with `plugin/dns64: ... unknown property 'false'`.
