# Validation Summary: How to Debug DNS Resolution Issues in Talos Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Talos Linux (talosctl, machine configuration, dns-resolve-cache service)
- Kubernetes (kubectl, pod DNS, services, endpoints)
- CoreDNS (configuration, metrics, cache plugin)
- glibc resolver (resolv.conf, ndots, single-request-reopen)
- Netfilter / conntrack (nf_conntrack_max sysctl)
- tcpdump / pcap (BPF filters)

## Sources Consulted
- Talos Linux documentation — `talosctl` CLI reference (https://www.talos.dev/v1.9/reference/cli/)
- Talos Linux machine configuration reference for `machine.network.nameservers` and `machine.sysctls`
- Talos Linux network resources (`ResolverStatus`, accessed via `talosctl get resolvers`)
- Talos `dns-resolve-cache` service documentation (host DNS proxy on 127.0.0.53)
- Kubernetes DNS for Services and Pods (https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- Kubernetes Pod DNS Config (`dnsConfig`, `options`)
- CoreDNS plugin documentation: `cache` plugin (https://coredns.io/plugins/cache/)
- CoreDNS metrics plugin (port 9153, metric names like `coredns_dns_requests_total`, `coredns_forward_healthcheck_failures_total`)
- glibc resolver(5) man page for `ndots`, `single-request-reopen`
- Standard kubeadm/Talos CoreDNS Service definition (`kube-dns` service, labels `k8s-app=kube-dns`, ConfigMap `coredns`, Deployment `coredns`)

## Issues Found
- **`kubectl port-forward -n kube-system svc/kube-dns-metrics 9153:9153`** — The `kube-dns-metrics` service does not exist by default in standard Talos / kubeadm-style clusters. The default `kube-dns` service only exposes ports 53/UDP and 53/TCP; CoreDNS exposes metrics on port 9153 on the pods themselves. Changed to `kubectl port-forward -n kube-system deployment/coredns 9153:9153`, which is reliable on a default Talos install. Added a short inline comment explaining why.

## Review Notes
- The two-path DNS resolution chain description (host DNS proxy on 127.0.0.53 → upstream; pod → CoreDNS at 10.96.0.10 → upstream) is accurate for default Talos clusters.
- `talosctl` commands (`read`, `get resolvers`, `services`, `logs dns-resolve-cache`, `pcap`, `netstat`, `dmesg`) are all valid current commands. The `pcap` flag syntax (`--interface`, `--bpf-filter`, `--duration`, `-o`) matches the Talos CLI.
- The `dns-resolve-cache` service name reflects the current Talos service (renamed from `dns` in older releases). Correct for recent Talos versions.
- The `ndots:5` explanation, search-domain ordering, and FQDN trailing-dot guidance are accurate per the Kubernetes DNS spec.
- The `cache 300 { success 9984 denial 9984 }` Corefile snippet is valid syntax for the CoreDNS cache plugin (TTL + per-class capacities).
- The `single-request-reopen` glibc option for mitigating IPv4/IPv6 race conditions is correct; an alternative would be `single-request`. Either would resolve the classic ~5s delay.
- The CoreDNS metric names (`coredns_dns_requests_total`, `coredns_dns_responses_total`, `coredns_forward_healthcheck_failures_total`, `coredns_dns_request_duration_seconds`) match the current CoreDNS metrics plugin export.
- The CoreDNS Deployment in Talos is named `coredns`, while the Service is named `kube-dns` (historical compatibility) — the post handles this naming correctly throughout.
- Minor possible future improvement (not a correctness issue): the `kubectl get events --field-selector reason=BackOff` filter could miss events with reason `CrashLoopBackOff`; broadening with `reason in (BackOff,CrashLoopBackOff)` or removing the filter would be more robust. Left as-is since the original command is still valid.
