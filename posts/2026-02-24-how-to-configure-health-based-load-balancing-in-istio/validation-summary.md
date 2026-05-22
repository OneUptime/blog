# Validation Summary: How to Configure Health-Based Load Balancing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Envoy outlier detection
- Kubernetes readiness and liveness probes
- istioctl proxy-config
- Prometheus / PromQL

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Envoy statistics configuration: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Envoy admin cluster status reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- Updated all Istio `DestinationRule` examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used in the latest Istio documentation.
- Narrowed the opening outlier-detection description so it does not imply the shown Istio configuration directly configures latency-based ejection.
- Clarified `interval` as the outlier detection analysis and recovery-check interval, matching Istio and Envoy documentation.
- Corrected gateway-error wording: HTTP gateway errors are 502, 503, and 504; opaque TCP traffic treats connect timeouts and connection failures as gateway errors.
- Clarified the `minHealthPercent: 50` explanation to refer to fewer than half of endpoints being healthy, which matches the field semantics.
- Corrected the canary-subset explanation so it does not imply DestinationRule subset outlier detection automatically reroutes all traffic to stable without routing configuration.
- Corrected the monitoring description: ejected endpoints appear via the `OUTLIER CHECK` column or Envoy `failed_outlier_check`, not simply as `UNHEALTHY`.
- Replaced the Prometheus counter `envoy_cluster_outlier_detection_ejections_total` with the currently documented Envoy counter `envoy_cluster_outlier_detection_ejections_enforced_total`.

## Review Notes
Istio may not collect all Envoy outlier-detection statistics with its default minimal stats matcher. Operators should ensure `.*outlier_detection.*` is included in proxy stats collection before relying on the Prometheus queries.
