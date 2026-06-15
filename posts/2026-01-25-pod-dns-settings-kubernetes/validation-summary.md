# Validation Summary: How to Configure Pod DNS Settings in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes DNS policies
- Pod `dnsConfig`
- CoreDNS
- kubectl
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes API reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Customizing DNS Service - https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes documentation: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- CoreDNS documentation: hosts plugin - https://coredns.io/plugins/hosts/
- CoreDNS documentation: forward plugin - https://coredns.io/plugins/forward/
- CoreDNS documentation: prometheus plugin - https://coredns.io/plugins/metrics/

## Issues Found
- The post stated that DNS queries go to CoreDNS at `10.96.0.10` as though that IP is universal. Changed the wording to clarify that this is the cluster DNS service IP in the example, because the actual service IP varies by cluster.
- The static CoreDNS hosts example used a separate `coredns-custom` ConfigMap with a `custom.server` key. That is not the generic upstream Kubernetes/CoreDNS configuration path. Replaced it with an edit to the standard `kube-system/coredns` ConfigMap's `Corefile`, adding the `hosts` plugin inside the server block with `fallthrough`.
- The external DNS troubleshooting command executed `nslookup` inside a CoreDNS pod. CoreDNS containers commonly do not include diagnostic shell tools such as `nslookup`. Replaced it with a temporary debug pod using the Kubernetes test image pattern from the official DNS debugging documentation, and clarified that it checks upstream DNS reachability from the cluster.

## Review Notes
The examples are otherwise consistent with the current Kubernetes documentation: `dnsPolicy` values are valid, `dnsConfig` fields merge with the selected policy, `ClusterFirstWithHostNet` is the correct policy for Linux host-networked pods that need cluster DNS, and the CoreDNS/Prometheus metric names used in the post are current.
