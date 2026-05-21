# Validation Summary: How to Set Up CoreDNS Integration with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- CoreDNS
- Kubernetes DNS
- Kubernetes ConfigMaps and Deployments
- Istio ServiceEntry
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: Customizing DNS Service - https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Istio documentation: Understanding DNS - https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio documentation: DNS Proxying - https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio documentation: ServiceEntry reference - https://istio.io/latest/docs/reference/config/networking/service-entry/
- CoreDNS documentation: health plugin - https://coredns.io/plugins/health/
- CoreDNS documentation: forward plugin - https://coredns.io/plugins/forward/
- CoreDNS documentation: cache plugin - https://coredns.io/plugins/cache/
- CoreDNS documentation: prometheus plugin - https://coredns.io/plugins/metrics/
- CoreDNS documentation: kubernetes plugin - https://coredns.io/plugins/kubernetes/
- CoreDNS documentation: autopath plugin - https://coredns.io/plugins/autopath/
- CoreDNS documentation: etcd plugin - https://coredns.io/plugins/etcd/

## Issues Found
- The default CoreDNS examples used `health { lazystart }`, which is not the current documented health plugin option. Changed it to `health { lameduck 5s }`, matching the Kubernetes default Corefile and CoreDNS health plugin documentation.
- The custom `global` zone text implied CoreDNS forwarding alone would create `my-service.my-namespace.global` records. Clarified that the upstream DNS servers must actually serve that zone and record format.
- The ServiceEntry example used `networking.istio.io/v1alpha3`. Updated it to the current `networking.istio.io/v1` API version used by Istio documentation.
- The "CoreDNS with External Plugin" example used an `external` directive that is not a standard CoreDNS plugin. Replaced it with a documented `etcd` plugin example for serving DNS records from an external data store.
- The `ndots: 5` explanation overstated the exact number of extra queries for all external hostnames. Reworded it to describe search-domain expansion without giving a fixed count.
- The Autopath explanation said it tries the most likely search domain first. Reworded it to match the documented server-side search path completion behavior and its successful-case limitation.
- The monitoring command used `kubectl port-forward svc/kube-dns 9153:9153`, but the Kubernetes `kube-dns` Service commonly exposes DNS ports, not CoreDNS metrics. Changed it to port-forward the `coredns` Deployment.
- The listed `coredns_forward_requests_total` metric is deprecated in current CoreDNS forward plugin documentation. Replaced it with `coredns_proxy_request_duration_seconds_count{proxy_name="forward"}`.
- The post said to restart CoreDNS after changes even though the default Corefile includes the `reload` plugin. Clarified that CoreDNS reloads automatically and restart is only needed to force a restart.

## Review Notes
The examples are still intentionally generic and depend on cluster-specific DNS IPs, cluster domains, and whether optional CoreDNS plugins are compiled into the deployed CoreDNS image. The post now reflects current documented APIs and plugin behavior.
