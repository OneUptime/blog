# Validation Summary: How to Set Maximum Ejection Percentage in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule
- Istio outlier detection
- Envoy outlier detection
- Kubernetes

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy OutlierDetection v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy outlier detection implementation: https://github.com/envoyproxy/envoy/blob/main/source/common/upstream/outlier_detection_impl.cc

## Issues Found
- The post said that omitting `maxEjectionPercent` could allow every pod to be ejected. Istio documents a default of 10%, so I changed the wording and diagram to describe the risky case as `maxEjectionPercent: 100`.
- The examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for `DestinationRule`, so I updated the YAML snippets.
- The small-deployment example used `maxEjectionPercent: 33` while saying one of three pods could be ejected. Envoy only ejects the next host when the resulting ejected percentage is within the configured cap, so 1/3 is slightly above 33%. I changed the example to 34%.
- The metrics explanation compared generic `ejections_detected` and `ejections_enforced` counters. Envoy exposes typed counters such as `ejections_detected_*` and `ejections_enforced_*`, so I clarified that corresponding counters should be compared.

## Review Notes
The remaining examples and field descriptions match the current Istio and Envoy documentation. The exact number of ejected hosts is sensitive to replica count because Envoy evaluates the resulting ejected percentage against `maxEjectionPercent`.
