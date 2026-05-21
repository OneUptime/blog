# Validation Summary: How to Configure Locality-Weighted Load Balancing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- DestinationRule
- Locality load balancing
- Envoy outlier detection
- istioctl
- Prometheus

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Locality weighted distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio Locality load balancing overview: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The introduction said weighted distribution controls the exact split "regardless of health." Istio locality distribution works with outlier detection; unhealthy or ejected endpoints are removed from the load balancing pool. Updated the sentence to say the configured split applies during normal healthy operation and unhealthy endpoints are still removed by outlier detection.
- The Prometheus verification text implied the sample `istio_requests_total` query directly shows locality distribution. Istio's standard request metrics do not include locality labels by default. Updated the text to explain that the query is useful only when workloads, revisions, or custom metric labels distinguish the destination zones.

## Review Notes
The DestinationRule examples use the current `networking.istio.io/v1` API and valid `trafficPolicy.loadBalancer.localityLbSetting.distribute` syntax. The `distribute` and `failover` mutual exclusivity claim matches the Istio API reference, and the `istioctl proxy-config endpoint --cluster ... -o json` command matches the official command reference. The post correctly includes outlier detection with locality distribution, which Istio documents as required for distribution to function properly.
