# Validation Summary: Scrape External Targets with ServiceMonitor or ScrapeConfig

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- `ScrapeConfig` CRD
- `ServiceMonitor` CRD
- `Probe` CRD
- Kubernetes Services and EndpointSlices
- Kubernetes DNS, RBAC, Secrets, NetworkPolicy, and `kubectl`
- Prometheus Blackbox Exporter

## Sources Consulted

- [Prometheus Operator ScrapeConfig guide](https://prometheus-operator.dev/docs/developer/scrapeconfig/)
- [Prometheus Operator API reference: `ScrapeConfig`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1alpha1.ScrapeConfig)
- [Prometheus Operator API reference: `Prometheus`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Prometheus)
- [Prometheus Operator API reference: `ServiceMonitor`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Prometheus Operator API reference: `Probe`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Probe)
- [Prometheus Operator design: `Probe`](https://prometheus-operator.dev/docs/getting-started/design/#probe)
- [Prometheus Operator RBAC guide](https://prometheus-operator.dev/docs/platform/rbac/)
- [Prometheus Operator changelog](https://github.com/prometheus-operator/prometheus-operator/blob/main/CHANGELOG.md)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus Kubernetes EndpointSlice discovery implementation](https://github.com/prometheus/prometheus/blob/main/discovery/kubernetes/endpointslice.go)
- [Kubernetes Services without selectors and ExternalName Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Prometheus Blackbox Exporter configuration reference](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)

## Issues Found

- The EndpointSlice discovery RBAC statement omitted Pods. Prometheus' EndpointSlice discoverer starts and waits for EndpointSlice, Service, and Pod informer caches, even when a manual external endpoint has no Pod target reference. The post now lists Services, EndpointSlices, and Pods.
- The Probe explanation said that a Probe controls a prober and a set of URLs. A Probe instead references an existing prober, and its static or Ingress-discovered targets are not necessarily URLs for TCP, DNS, or ICMP probing. The wording now reflects the Probe CRD's actual responsibility and target model.

## Review Notes

- `ScrapeConfig` was introduced in Prometheus Operator v0.65.0 and remains a `monitoring.coreos.com/v1alpha1` resource. The current ScrapeConfig guide recommends an Operator version newer than v0.65.1.
- The per-ServiceMonitor `spec.serviceDiscoveryRole` field shown in the post was added in Prometheus Operator v0.86.0. The Prometheus-level `spec.serviceDiscoveryRole` fallback was added in v0.76.0; older CRD schemas may reject the per-ServiceMonitor field.
- EndpointSlice discovery requires Prometheus v2.21.0 or newer. The manifest uses the stable `discovery.k8s.io/v1` API, available in Kubernetes v1.21 and newer.
- The ScrapeConfig selector and namespace-selector semantics, selectorless Service and manual EndpointSlice manifest, ExternalName explanation, authentication/TLS guidance, and `kubectl run` command otherwise match current official documentation.
