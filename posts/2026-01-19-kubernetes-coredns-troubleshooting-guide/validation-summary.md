# Validation Summary: How to Troubleshoot Kubernetes DNS Issues (CoreDNS)

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes DNS for Services and Pods
- CoreDNS
- CoreDNS Corefile plugins: kubernetes, forward, cache, prometheus, loop, reload, loadbalance, hosts
- kubectl commands
- Kubernetes NetworkPolicy
- Prometheus metrics and alert rules
- Linux resolver configuration

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service / CoreDNS configuration: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- CoreDNS prometheus plugin: https://coredns.io/plugins/metrics/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- Linux resolv.conf manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The intermittent DNS failures section said to "Enable TCP fallback" but used the CoreDNS `prefer_udp` option. CoreDNS documents `prefer_udp` as trying UDP first even for TCP-originated requests; `force_tcp` is the option that uses TCP for upstream DNS requests. Changed the snippet to use `force_tcp` and updated the comment.
- The cache hit rate PromQL used `coredns_cache_misses_total`. CoreDNS documents that metric as deprecated and recommends deriving misses from cache hits and requests. Changed the formula to divide `coredns_cache_hits_total` by `coredns_cache_requests_total`.

## Review Notes
- The CoreDNS service IP `10.96.0.10`, cluster domain `cluster.local`, and `ndots:5` examples match common kubeadm-style defaults, but are cluster-dependent values.
- Local `kubectl` validation could not be run because `kubectl` is not installed in this workspace; command syntax was checked against official Kubernetes generated reference documentation instead.
