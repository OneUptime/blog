# Validation Summary: How to Implement DNS Debugging with dig and nslookup in Kubernetes Pods

## Status
validated

## Post Type
Technical tutorial / debugging guide

## Technologies Covered
- Kubernetes DNS
- CoreDNS / kube-dns
- `dig`
- `nslookup`
- `kubectl`
- Pod `dnsPolicy` and `dnsConfig`
- DNS records including A, AAAA, SRV, and DNSSEC-related queries

## Sources Consulted
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- BIND 9 documentation: `dig` DNS lookup utility - https://bind9.readthedocs.io/en/v9.20.0/manpages.html#dig-dns-lookup-utility
- BIND 9 documentation: `nslookup` - https://bind9.readthedocs.io/en/v9.20.0/manpages.html#nslookup-query-internet-name-servers-interactively
- Local BIND tool help output from `dig -h` and `nslookup -help`

## Issues Found
- Corrected pod DNS wording to avoid implying that all Pods universally receive the legacy `pod-ip.namespace.pod.cluster.local` DNS record. Kubernetes DNS behavior depends on the DNS implementation and Pod/service configuration.
- Updated short-name `dig` examples to use `+search` where Kubernetes search domains are required. BIND `dig` does not apply the resolver search list by default.
- Changed the SRV example wording from generic port information to named ports, matching Kubernetes SRV record behavior.
- Replaced `dig +trace` for a `cluster.local` name with a public DNS example because `+trace` follows public DNS delegation from the root and is not useful for Kubernetes-only cluster-local names.
- Replaced invalid cache-bypass examples. `dig +nocache` is not a valid BIND `dig` option, and `+noall +answer` only controls output; the post now uses answer records and TTL comparison to inspect caching behavior.
- Reworked the CoreDNS direct test to query the `kube-dns` service IP from the debug pod instead of assuming the CoreDNS container has a shell and DNS tools available.
- Corrected the `dnsPolicy: Default` comment. Kubernetes `Default` inherits node DNS settings; it is not the cluster DNS policy.
- Updated the automated test script to discover the CoreDNS service IP instead of hardcoding `10.96.0.10`, and to treat empty `dig +short` output as failure instead of relying only on `dig`'s exit status.
- Changed packet capture examples to use the `netdebug` pod because the earlier `dnstools` image is not guaranteed to include `tcpdump`.

## Review Notes
The post remains a valid Kubernetes DNS debugging guide after correction. Some examples still depend on cluster-specific defaults such as the cluster domain being `cluster.local`, the DNS service being named `kube-dns`, and the debug images being pullable in the target environment.
