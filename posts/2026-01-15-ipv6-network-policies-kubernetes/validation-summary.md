# Validation Summary: How to Implement IPv6 Network Policies in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough)

## Technologies Covered
- Kubernetes dual-stack networking (IPv4/IPv6)
- Kubernetes NetworkPolicy API (`networking.k8s.io/v1`)
- Calico (IPPool, FelixConfiguration `projectcalico.org/v3`)
- Cilium (CiliumNetworkPolicy `cilium.io/v2`, L7 HTTP filtering, FQDN egress)
- kubeadm ClusterConfiguration (`kubeadm.k8s.io/v1beta3`)
- IPv6 addressing / CIDR notation (ULA, link-local, global unicast, documentation prefix)
- kubectl

## Sources Consulted
- Kubernetes NetworkPolicy reference and `ipBlock`/`except` validation rules — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes IPv4/IPv6 dual-stack docs — https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes kubeadm ClusterConfiguration (v1beta3) — https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- Calico IPPool / FelixConfiguration resource reference — https://docs.tigera.io/calico/latest/reference/resources/ippool
- Cilium Network Policy reference (L7, toFQDNs) — https://docs.cilium.io/en/stable/security/policy/
- RFC 4193 (Unique Local IPv6 Unicast Addresses, fc00::/7), RFC 4291 (IPv6 addressing architecture), RFC 3849 (2001:db8::/32 documentation prefix)
- Public DNS resolver IPv6 addresses: Google (2001:4860:4860::8888), Cloudflare (2606:4700:4700::1111)

## Issues Found
- **Invalid `except` CIDR in the `api-egress` NetworkPolicy (Pattern 1: Three-Tier Application).** The policy used `ipBlock.cidr: 2000::/3` with `except: [fd00::/8]`. Kubernetes requires every `except` entry to be a strict subset of the parent `cidr`. `fd00::/8` (ULA, in the `f` range) is **not** within `2000::/3` (global unicast, `2000::`–`3fff::`), so the API server rejects the policy with a validation error and it would never apply. Because global unicast `2000::/3` already excludes ULA, I removed the invalid `except` block and added a clarifying comment explaining why none is needed. This preserves the author's original intent (allow only global-unicast egress) while making the manifest valid.

## Review Notes
- **Dual-stack version claim:** The post says Kubernetes "has supported dual-stack networking since version 1.21." This is fair — dual-stack reached beta and was enabled by default in 1.21 — but it reached GA in 1.23. Left as-is since the statement is not incorrect.
- **ULA range terminology:** The post labels `fd00::/8` as "Unique Local Addresses (ULA)." Strictly, the ULA block is `fc00::/7` (RFC 4193); `fd00::/8` is the locally-assigned half that is actually used in practice. This is common, acceptable shorthand and not an error.
- **Calico `blockSize: 64`** on an IPv6 `/48` pool is structurally valid (the default is 122). A `/64` block is very large; operators may prefer a higher number, but it is not incorrect.
- **`api-kube-api` egress** uses an illustrative API server address `fd00:10:96::1/128` and correctly tells the reader to replace it. Real dual-stack clusters often expose the API server via the service CIDR's first address, so this is a reasonable placeholder.
- **Monitoring policy** allows ingress on ports 9090 and 8080 from Prometheus. The scrape target's metrics port (commonly 8080/metrics) is what matters for ingress; 9090 is Prometheus's own port and is harmless to include but not strictly required on the target. Not an error.
- All other manifests (default-deny, DNS egress with both UDP/TCP 53, namespace isolation, Cilium L7 regex paths, Cilium `toFQDNs`, the kubeadm dual-stack subnets including the `/108` IPv6 service CIDR limit, and the test/diagnostic bash scripts) verified as syntactically and semantically correct.
