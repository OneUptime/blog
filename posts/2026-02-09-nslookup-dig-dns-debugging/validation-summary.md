# Validation Summary: How to Use nslookup and dig for DNS Debugging in Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DNS
- CoreDNS
- kube-dns
- kubectl
- nslookup
- dig
- Pod DNS policy and dnsConfig
- DNS record types: A, AAAA, SRV, PTR, ANY

## Sources Consulted
- Kubernetes documentation: DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes DNS-Based Service Discovery specification: https://github.com/kubernetes/dns/blob/master/docs/specification.md
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://datatracker.ietf.org/doc/html/rfc8482
- BIND dig help output available in the local environment.

## Issues Found
- The post stated that every pod gets `/etc/resolv.conf` pointing to cluster DNS. Updated this to specify pods using the default `ClusterFirst` DNS policy, because Kubernetes also supports `Default`, `None`, and `ClusterFirstWithHostNet`.
- The service DNS examples implied unrelated short, namespace-qualified, and fully qualified names should always resolve to the same IP. Clarified that the same service resolves to the same ClusterIP when addressed by the appropriate short name, namespace-qualified name, or FQDN.
- The external DNS troubleshooting text treated failures as definitely CoreDNS forwarding issues. Broadened this to include upstream DNS failures and network policies blocking DNS traffic.
- The DNS latency guidance used absolute thresholds. Reworded it as a practical signal rather than a guaranteed diagnosis.
- The `/etc/resolv.conf` example and cluster DNS service wording assumed a specific namespace and `kube-dns` service name too strongly. Clarified it is an example for a pod in the `default` namespace and that the nameserver should match the cluster DNS service IP.
- The `dig +search +noall +question` example did not show search-path attempts clearly. Added `+showsearch`.
- The timeout section used `nc -zv` as a DNS connectivity test without noting that it checks TCP. Clarified that it tests TCP connectivity and added a `dig` query for an actual DNS lookup.
- The `dig +trace` section did not mention that trace mode performs iterative resolution and needs access to external DNS servers. Added that caveat and clarified it is not a direct CoreDNS forwarding test.
- The ANY record comment described ANY as "all records". Updated it because RFC 8482 allows DNS responders to return minimal responses or refuse conventional ANY behavior.
- The reverse DNS section assumed the Kubernetes service ClusterIP would resolve to `kubernetes.default.svc.cluster.local`. Updated it to describe PTR results as implementation- and configuration-dependent.
- The CoreDNS forwarding section suggested running `nslookup` inside a CoreDNS pod. Replaced this with checking CoreDNS logs, because CoreDNS images commonly do not include debugging tools.
- The pod-specific DNS section stated that pods in the same namespace should have identical resolver configuration. Clarified that this applies when they also use the same `dnsPolicy` and `dnsConfig`.
- The custom DNS example used `8.8.8.8` while later testing Kubernetes service names. Changed the nameserver to the cluster DNS service IP placeholder so service resolution can work.

## Review Notes
The commands are examples and still use common placeholder values such as `10.96.0.10`, `my-pod`, and `my-service`; readers must replace them with values from their own cluster.
