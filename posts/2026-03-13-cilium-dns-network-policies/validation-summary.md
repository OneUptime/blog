# Validation Summary: DNS Policies with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- DNS and FQDN-based egress policy
- Hubble
- Helm

## Sources Consulted
- Cilium DNS-based policy guide: https://docs.cilium.io/en/latest/security/dns/
- Cilium network policy language, DNS based rules: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium policy troubleshooting for toFQDNs: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Layer 7 protocol visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/

## Issues Found
- The Helm command used `dnsPolicyUnload` and `dnsProxy.enableTransparentMode` as Helm values. The current Cilium Helm reference does not expose those names as chart values; DNS/FQDN policy requires Layer 7 proxy support. Changed the command to set `l7Proxy=true`.
- The DNS egress allow rules only allowed UDP/53 traffic and did not include an L7 `rules.dns` stanza. Cilium documentation states `toFQDNs` rules require an L7 DNS rule covering the endpoint so the DNS proxy can observe DNS responses. Added `rules.dns.matchPattern: "*"` and changed DNS port protocol to `ANY`.
- The kube-dns `toEndpoints` selectors used unprefixed or incomplete labels in several examples. Updated them to the documented Cilium label form: `"k8s:io.kubernetes.pod.namespace": kube-system` and `"k8s:k8s-app": kube-dns`.
- The wildcard section said it allowed all subdomains while using `*.amazonaws.com`, which only matches a single DNS label under `amazonaws.com` in Cilium pattern semantics. Changed the wording to "nested subdomains" and used `**.amazonaws.com`, the documented pattern for cascaded subdomains.
- The FQDN cache inspection command used `cilium fqdn cache list`. Current Cilium troubleshooting documentation uses `cilium-dbg fqdn cache list`. Updated the command accordingly.

## Review Notes
The remaining concepts are consistent with Cilium documentation: `toFQDNs` policies dynamically allow IPs learned from DNS responses, DNS visibility requires L7 DNS policy/proxying, and Hubble can observe DNS/L7 flows when L7 visibility is enabled. The examples assume CoreDNS/kube-dns pods carry the common `k8s-app: kube-dns` label in `kube-system`; clusters with customized DNS deployments may need selector adjustments.
