# Validation Summary: How to Debug DNS Resolution Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes DNS
- CoreDNS
- Kubernetes Services and EndpointSlices
- Pod DNS policy and dnsConfig
- NodeLocal DNSCache
- Prometheus metrics
- kubectl

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes NodeLocal DNSCache: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS prometheus plugin: https://coredns.io/plugins/metrics/

## Issues Found
- The post used `kubectl get endpoints myservice`. The Kubernetes Endpoints API is deprecated as of Kubernetes v1.33, so this was changed to `kubectl get endpointslice -l kubernetes.io/service-name=myservice`.
- The post suggested executing diagnostic commands inside a CoreDNS pod. CoreDNS images are commonly minimal and should not be relied on to include shell utilities such as `cat` or `nslookup`, so those checks were replaced with ConfigMap inspection and direct DNS queries against the CoreDNS service from the `dnsutils` pod.
- The post recommended using a trailing dot in application code without caveats. This can be client- and upstream-dependent, especially for HTTP host handling, so the text now limits the recommendation to clients and upstream services that support it.
- The NodeLocal DNSCache section showed an incomplete DaemonSet manifest as if it were directly usable. It was replaced with the official sample manifest workflow and variable substitution for kube-proxy iptables mode.
- The monitoring section listed deprecated CoreDNS forward metrics. `coredns_forward_requests_total` was replaced with the current `coredns_proxy_request_duration_seconds_count{proxy_name="forward"}`-based expression.

## Review Notes
The local environment did not have `kubectl` installed, so command validation was performed against official Kubernetes and CoreDNS documentation rather than local CLI help output. The NodeLocal DNSCache snippet now follows the Kubernetes documentation's iptables-mode substitution path; clusters using IPVS mode need the documented alternate substitution and kubelet `--cluster-dns` adjustment.
