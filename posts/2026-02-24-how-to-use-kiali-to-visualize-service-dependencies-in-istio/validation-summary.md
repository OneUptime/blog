# Validation Summary: How to Use Kiali to Visualize Service Dependencies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kiali
- Kubernetes
- Prometheus metrics
- Envoy sidecar telemetry
- Istio ServiceEntry resources

## Sources Consulted
- Kiali Topology documentation: https://kiali.io/docs/features/topology/
- Kiali Graph FAQ: https://kiali.io/docs/faq/graph/
- Kiali Console Customization documentation, graph traffic rates: https://kiali.io/docs/configuration/console-customization/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio traffic management concepts, ServiceEntry example: https://istio.io/latest/docs/concepts/traffic-management/
- Istio `istioctl dashboard kiali` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Getting Started Kiali dashboard instructions: https://istio.io/latest/docs/setup/getting-started/
- Kiali source for graph API route and query parameters: https://github.com/kiali/kiali/blob/master/routing/routes.go and https://github.com/kiali/kiali/blob/master/handlers/graph.go

## Issues Found
- The Workload Graph section said it shows exactly which pods are communicating. Kiali workload graphs show workload-level nodes, not individual pod nodes, so this was corrected to workload controllers.
- The edge detail section implied response-time data is only p50, p95, and p99. Current Kiali supports average, median/p50, p95, and p99 response-time labels, so the text now reflects those options.
- The external dependency section implied enabling "Unknown" nodes is the way to see external dependencies. Kiali may show unknown, passthrough, blackhole, or ServiceEntry nodes depending on telemetry and configuration, so the wording was corrected.
- The edge label section described Response Time as average only and Throughput as requests per second. Kiali response-time labels can be average/median/p95/p99, while Throughput labels are HTTP byte throughput; requests per second is the Traffic Rate label. The descriptions were corrected.
- The traffic filtering section described the Traffic dropdown as simple HTTP/gRPC/TCP-only filtering. Kiali's Traffic dropdown selects protocol traffic and rate metrics: HTTP requests, gRPC request/message rates, and TCP sent/received/total byte rates. The section was updated accordingly.
- The ServiceEntry result wording was made more precise: a ServiceEntry lets Kiali represent external traffic as a configured ServiceEntry/host when telemetry supports it, instead of only unknown or passthrough traffic.

## Review Notes
The Kiali graph API endpoint and `graphType=versionedApp` parameter are still valid according to Kiali's current route and handler definitions. The Istio `ServiceEntry` YAML uses the current `networking.istio.io/v1` API and valid fields. The post remains version-neutral, but Kiali UI labels and graph defaults can vary across versions.
