# Validation Summary: How to Configure IPv6 Failover in Service Meshes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes dual-stack networking and EndpointSlices
- Istio DestinationRule, VirtualService, ServiceEntry, dual-stack, locality load balancing, and multicluster traffic management
- Envoy outlier detection and cluster statistics
- Linkerd HTTPRoute and retry annotations
- Kubernetes Gateway API HTTPRoute
- Prometheus / PromQL
- IPv6 addressing

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service documentation, EndpointSlices and deprecated Endpoints API: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice transition note: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Istio dual-stack setup documentation: https://istio.io/latest/docs/setup/additional-setup/dual-stack/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio multicluster installation and traffic management documentation: https://istio.io/latest/docs/setup/install/multicluster/ and https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio 1.8 upgrade notes for `.global` multicluster stub domain deprecation: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/upgrade-notes/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy outlier detection overview and cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier and https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Linkerd HTTPRoute and retries documentation: https://linkerd.io/2-edge/reference/httproute/ and https://linkerd.io/2-edge/reference/retries/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post used `kubectl get endpoints` and described dual-stack endpoints as two addresses in one Endpoints object. Kubernetes Endpoints is deprecated and does not support dual-stack correctly, so I changed the examples to use EndpointSlices and explained the separate IPv4 and IPv6 slices.
- The post claimed the mesh load balancer treats a pod's IPv4 and IPv6 addresses as the same endpoint. Istio/Envoy exposes IPv4 and IPv6 addresses as separate upstream endpoints, while Kubernetes readiness affects the pod's EndpointSlice entries, so I corrected the explanation.
- Istio manifests used `networking.istio.io/v1beta1`. Current Istio examples and references use `networking.istio.io/v1`, so I updated the DestinationRule, ServiceEntry, and VirtualService examples.
- The locality load balancing example combined `failover` and `distribute`, which Istio does not allow in the same `localityLbSetting`. It also used zone values in `failover`, but Istio failover entries are region-based. I changed the snippet to a region-level failover example only.
- The ServiceEntry example used deprecated `.global` naming and invalid IPv6 literals containing `remote`. I changed the host to a non-`.global` service-style name, used an IPv6 documentation-prefix VIP, and replaced the endpoint addresses with syntactically valid IPv6 documentation-prefix addresses.
- The VirtualService retry example referenced an undefined `primary` subset and said retries fail over to another version. I removed the subset and changed the wording to endpoint/locality retry behavior.
- The Linkerd HTTPRoute example used the older Linkerd-specific API group and claimed a backend with weight `0` would be used only when the primary was unhealthy. Current Linkerd recommends canonical Gateway API HTTPRoute resources, and Gateway API specifies that weight `0` receives no traffic. I updated the example to `gateway.networking.k8s.io/v1`, added Linkerd retry annotations, and changed the backup backend to a small non-zero weight.
- The testing section used Endpoints watches and implied deleting a pod verifies Envoy outlier ejection. Pod deletion is normally handled by Kubernetes endpoint updates, not necessarily outlier detection, so I changed the watch command to EndpointSlices and clarified that Envoy ejection stats apply when failures are simulated while the endpoint remains registered.
- The PromQL example used `rate()` on `envoy_cluster_outlier_detection_ejections_active`, which is a gauge. I changed it to `envoy_cluster_outlier_detection_ejections_enforced_total`, which is a counter suitable for `rate()`.
- The closing paragraph only mentioned `consecutive5xxErrors` for connectivity failures even though the example splits local-origin failures. I updated it to include `consecutiveLocalOriginFailures`.

## Review Notes
- The corrected Istio examples assume a current Istio release with dual-stack enabled and an environment where IPv6 is supported by the cluster networking plugin.
- Envoy metric label names can vary depending on Istio/Envoy stats tag configuration, so the PromQL grouping label may need adjustment in a real deployment.
