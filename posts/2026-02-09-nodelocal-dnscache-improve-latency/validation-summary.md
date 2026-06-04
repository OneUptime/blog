# Validation Summary: How to Configure NodeLocal DNSCache to Reduce CoreDNS Load and Improve Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- kube-proxy iptables and IPVS modes
- kubectl
- Prometheus and ServiceMonitor
- Bash

## Sources Consulted
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes NodeLocal DNSCache sample manifest: https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The reliability wording overstated NodeLocal DNSCache as eliminating DNS single points of failure and surviving CoreDNS outages. Updated it to state that cached records can continue resolving during brief upstream DNS disruption and that NodeLocal reduces dependence on the centralized DNS path.
- The performance bullet incorrectly implied clients use TCP connections to the local cache. Updated it to match Kubernetes documentation: NodeLocal listens for normal pod DNS queries and can upgrade upstream queries to CoreDNS from UDP to TCP.
- The direct manifest forwarded cluster DNS queries to the kube-dns Service IP while also binding that same IP, which can create a self-forwarding loop in iptables mode. Updated the manifest to include the `kube-dns-upstream` Service, use the NodeLocal placeholder upstreams populated by the node-local-dns pod, and align the container args and mounted Corefile path with the official sample manifest.
- The embedded image version was older than the current Kubernetes sample manifest. Updated `registry.k8s.io/dns/k8s-dns-node-cache` from `1.22.20` to `1.26.8`.
- The pod configuration section said all existing pods automatically use NodeLocal DNSCache after deployment. Added the required caveat that this is true in kube-proxy iptables mode, while IPVS mode requires updating kubelet `--cluster-dns`.
- The cache hit ratio PromQL divided cache hits by all DNS requests. Updated the denominator to `coredns_cache_requests_total`, which is the CoreDNS cache plugin request counter.
- The forward request metric used deprecated `coredns_forward_requests_total`. Replaced it with `coredns_proxy_request_duration_seconds_count{proxy_name="forward"}` based on current CoreDNS forward plugin documentation.
- The benchmark Job invoked a Bash script using `sh`, but the script uses Bash arrays. Changed the command to invoke `bash`.

## Review Notes
The post is technically valid after the corrections. The manifest still assumes a common `kube-dns` Service IP of `10.96.0.10` and cluster domain of `cluster.local`; readers should replace those values for clusters that use different DNS settings.
