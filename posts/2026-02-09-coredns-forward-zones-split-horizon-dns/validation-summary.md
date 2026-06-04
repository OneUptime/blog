# Validation Summary: How to Configure CoreDNS Forward Zones for Split-Horizon DNS

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Kubernetes
- CoreDNS
- DNS forwarding and split-horizon DNS
- CoreDNS forward, kubernetes, file, hosts, health, ready, reload, log, prometheus, and loop plugins
- ExternalDNS with the RFC2136 provider
- Prometheus alerting

## Sources Consulted
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS Corefile/manual documentation: https://coredns.io/manual/toc/
- CoreDNS health plugin documentation: https://coredns.io/plugins/health/
- CoreDNS ready plugin documentation: https://coredns.io/plugins/ready/
- CoreDNS reload plugin documentation: https://coredns.io/plugins/reload/
- CoreDNS file plugin documentation: https://coredns.io/plugins/file/
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS log plugin documentation: https://coredns.io/plugins/log/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- ExternalDNS RFC2136 provider documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/rfc2136/
- ExternalDNS project release documentation: https://kubernetes-sigs.github.io/external-dns/

## Issues Found
- The initial Corefile enabled the process-wide `health` plugin in multiple server blocks. Removed `health` from the Kubernetes-only block and kept it in the root block.
- The Kubernetes server block only listed `cluster.local`, so reverse zones would not route to the Kubernetes plugin. Added `in-addr.arpa` and `ip6.arpa` to the server block zone list.
- The reload explanation said CoreDNS reloads within a few seconds. Updated it to reflect the `reload` plugin default interval of about 30 seconds with jitter after the mounted ConfigMap changes.
- The “conditional forwarding by query type” section claimed CoreDNS forward can route by record type, but the forward plugin routes by name/zone, not query type. Reworked the section into host overrides plus forwarding using the `hosts` plugin with `fallthrough`.
- The hybrid cloud example nested server blocks inside the root server block, which is invalid Corefile syntax. Split those into separate top-level server blocks.
- The hybrid cloud example described a rewrite rule that was removed when the invalid nested Corefile was corrected. Updated the explanation to match the corrected server-block forwarding pattern.
- The testing commands assumed the CoreDNS service IP was `10.96.0.10`. Changed the example to discover the `kube-dns` Service cluster IP with `kubectl`.
- The test pod command passed `bash` as an argument rather than an explicit command. Added `--command -- bash`.
- The logging explanation implied the `log` plugin shows the upstream server. Updated it to state that logs show matching queries and forward metrics should be used for upstream visibility.
- The ExternalDNS image was outdated. Updated it from `v0.14.0` to `v0.19.0`.
- The monitoring section listed deprecated forward metrics. Replaced them with current `coredns_proxy_*` forward metrics and updated the alert expression.
- The health-check explanation implied continuous probing and omitted the all-upstreams-unhealthy behavior. Updated it to match the forward plugin's error-triggered health-check behavior.
- The best-practices section said to order zones from most specific to least specific. Updated it to reflect CoreDNS longest-suffix matching.

## Review Notes
Validated CoreDNS parser-level syntax for the non-Kubernetes Corefile examples using the official `coredns/coredns:1.12.1` container. The Kubernetes plugin itself could not be fully runtime-tested locally because it requires an in-cluster Kubernetes API configuration.
