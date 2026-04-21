# Validation Summary: How to Troubleshoot DNS Resolution in Kubernetes Pods

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes DNS for Services and Pods
- CoreDNS
- kubectl
- Linux resolver configuration
- Java DNS caching
- Go networking
- strace

## Sources Consulted
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- Linux resolv.conf manual page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Oracle Java networking properties documentation: https://docs.oracle.com/javase/8/docs/api/java/net/doc-files/net-properties.html
- Go net package documentation: https://pkg.go.dev/net
- Go net/http Transport documentation: https://pkg.go.dev/net/http#Transport

## Issues Found
- The introduction implied that all Kubernetes DNS is managed by CoreDNS. Updated it to say most current clusters use the CoreDNS add-on, matching Kubernetes documentation that also acknowledges kube-dns.
- The `/etc/resolv.conf` example used fixed `10.96.0.10` and `default.svc.cluster.local` values. Changed these to placeholders with an example IP because the DNS service ClusterIP and namespace-specific search path vary by cluster and pod namespace.
- The CoreDNS service check said the Service `CLUSTER-IP` should always match pod `resolv.conf`. Added a caveat for NodeLocal DNSCache and custom cluster DNS.
- The NXDOMAIN failure cause was too narrow. Updated it to include wrong namespace/service names, missing search domains, or custom resolver settings.
- The UDP reachability check used `nc -zuv`, which is not a reliable DNS test and is not consistently available in BusyBox netcat. Replaced it with a direct `nslookup` DNS query and kept TCP checks separate.
- The 5-second delay fix incorrectly recommended CoreDNS `forward` plugin `prefer_udp`. Updated it to reference glibc A/AAAA lookup behavior, resolver timeout stalls, NodeLocal DNSCache, and `single-request-reopen` where appropriate.
- The CoreDNS rollout restart command used a less common resource/name form. Changed it to `deployment/coredns`, matching kubectl rollout restart examples.
- The `ndots` explanation said `ndots:5` tries five search domains and causes five extra queries. Corrected it to explain that names with fewer than five dots try search-list expansions first, so the number of extra queries depends on the configured search list and lookup type.
- The `dnsConfig.searches` example implied `ClusterFirst` replaces the search list. Removed the custom `searches` list and noted that Kubernetes merges custom searches under `ClusterFirst`; replacing the list requires `dnsPolicy: None` and explicit nameservers.
- The application DNS cache section said Kubernetes service IPs do not change and that Kubernetes DNS uses 30-second TTLs. Changed this to say ClusterIP values are stable for the lifetime of a Service object, headless/external answers can change, CoreDNS's Kubernetes plugin defaults service record TTLs to 5 seconds, and `cache 30` is a cache cap.
- The Java example used `-Dnetworkaddress.cache.ttl`, but Oracle documents `networkaddress.cache.ttl` as a security property rather than a normal `-D` system property. Updated it to use the Java security property and mention the implementation-specific `-Dsun.net.inetaddr.ttl` fallback.
- The `strace` example filtered only `connect` and `getsockname`, which can miss DNS socket traffic. Updated it to include `sendto` and `recvfrom`.

## Review Notes
- `kubectl` is not installed in the local environment, so kubectl behavior was validated against the official generated Kubernetes command reference.
- The post uses the third-party `infoblox/dnstools:latest` image for a DNS toolbox. The command pattern is valid, but a pinned image tag would be more reproducible in the future.
