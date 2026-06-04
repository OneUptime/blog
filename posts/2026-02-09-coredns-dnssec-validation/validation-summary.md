# Validation Summary: How to Implement CoreDNS DNSSEC Validation for Secure DNS Resolution

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- CoreDNS
- Kubernetes DNS
- DNSSEC
- Unbound recursive resolver
- Prometheus and Prometheus Operator resources
- BIND DNSSEC utilities (`dnssec-keygen`, `dnssec-signzone`)

## Sources Consulted
- CoreDNS `dnssec` plugin documentation: https://coredns.io/plugins/dnssec/
- CoreDNS `forward` plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS `cache` plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS `prometheus` plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS `log` plugin documentation: https://coredns.io/plugins/log/
- CoreDNS `sign` plugin documentation: https://coredns.io/plugins/sign/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Unbound configuration documentation: https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html
- Unbound `unbound-anchor` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- BIND 9 DNSSEC guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html

## Issues Found
- The post incorrectly claimed CoreDNS performs recursive DNSSEC validation with `dnssec { validate }`. The CoreDNS `dnssec` plugin signs authoritative responses and has no `validate` option, so I rewrote the guidance to use DNSSEC-validating recursive resolvers upstream of CoreDNS.
- The post used unsupported CoreDNS directives: `validate`, `trust-anchor`, `log-failures`, `insecure`, and `serve` inside the `dnssec` plugin. I removed those directives and replaced them with documented `forward`, `log`, `cache`, and authoritative signing examples.
- The trust anchor section incorrectly configured trust anchors in CoreDNS. I changed it to configure the root trust anchor in a validating resolver, using Unbound's documented `auto-trust-anchor-file`.
- The monitoring section listed DNSSEC cache metrics as if they measured recursive validation. CoreDNS `dnssec` cache metrics apply to the signing plugin's RRSIG cache, not upstream validation, so I replaced them with CoreDNS response, DO-bit, and cache metrics.
- The alerting examples referenced non-existent DNSSEC validation cache metrics. I changed them to use documented CoreDNS response and cache metrics and noted that SERVFAIL is not DNSSEC-specific.
- The upstream resolver section said `prefer_udp` forces DNS over TCP. That is incorrect; `force_tcp` is the CoreDNS `forward` option that uses TCP even for UDP client requests. I corrected the snippets and explanation.
- The internal zone section incorrectly said CoreDNS can validate a zone with `dnssec { validate serve }`. I changed it to show serving a signed zone with the `file` plugin and separately signing authoritative responses with the documented `dnssec` plugin `key file` syntax.
- The debugging examples attempted to log DNSSEC validation failures through unsupported CoreDNS `dnssec` options. I changed them to use the documented `log` plugin and to point detailed validation logging at the validating resolver.

## Review Notes
The post is now accurate as a DNSSEC-validated resolution guide for Kubernetes using CoreDNS as the cluster forwarder and a validating recursive resolver as the validator. CoreDNS can serve or sign DNSSEC data authoritatively, but it should not be described as a recursive DNSSEC validator unless a separate validation plugin or validating upstream resolver is used.
