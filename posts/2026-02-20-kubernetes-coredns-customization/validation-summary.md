# Validation Summary: How to Customize CoreDNS in Kubernetes for Advanced DNS Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CoreDNS
- DNS service discovery
- CoreDNS Corefile configuration
- kubectl
- NodeLocal DNSCache
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: Customizing DNS Service - https://v1-34.docs.kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes documentation: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters - https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes documentation: Autoscale the DNS Service in a Cluster - https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- CoreDNS forward plugin documentation - https://coredns.io/plugins/forward/
- CoreDNS rewrite plugin documentation - https://coredns.io/plugins/rewrite/
- CoreDNS cache plugin documentation - https://coredns.io/plugins/cache/
- CoreDNS hosts plugin documentation - https://coredns.io/plugins/hosts/
- CoreDNS prometheus plugin documentation - https://coredns.io/plugins/metrics/

## Issues Found
- The rewrite examples rewrote only the DNS question name. CoreDNS documentation notes that answer rewrites may be needed because some resolvers treat question/answer name mismatches as suspicious. Updated the rewrite rules to use `exact` matching with `answer auto`.
- The DNS autoscaler command used `dns-autoscaler`, but the Kubernetes documentation and manifest use `kube-dns-autoscaler`. Updated the command.
- The NodeLocal DNSCache command applied the upstream sample manifest directly. Kubernetes documentation requires downloading a sample manifest and substituting placeholders such as the kube-dns Service IP, cluster domain, and local DNS IP before applying it. Updated the command block for the documented iptables-mode flow.

## Review Notes
The CoreDNS Corefile examples, forward plugin policies, cache configuration, hosts `fallthrough`, query logging, and Prometheus metric names were checked against official documentation and are technically valid. `kubectl` was not installed in the local workspace, so CLI validation was performed against official Kubernetes references rather than local `kubectl --help` output.
