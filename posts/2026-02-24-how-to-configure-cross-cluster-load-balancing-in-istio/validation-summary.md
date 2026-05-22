# Validation Summary: How to Configure Cross-Cluster Load Balancing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Istio DestinationRule
- Locality load balancing
- Outlier detection
- Prometheus / Istio standard metrics
- Kiali

## Sources Consulted
- Istio Locality Load Balancing documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Multi-cluster Traffic Management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The post described Istio's default cross-cluster behavior as round-robin and labeled `ROUND_ROBIN` as the default. Current Istio documentation says unspecified load balancing lets Istio select an appropriate default, and current guidance recommends `LEAST_REQUEST` over `ROUND_ROBIN`. I changed the default-behavior description to say endpoints from all clusters are in the same pool, added `UNSPECIFIED`, and removed the default label from `ROUND_ROBIN`.
- The post stated weighted locality distribution sends traffic according to the configured percentages "regardless of health status." Locality distribution still operates over available/healthy endpoints and works with outlier detection. I changed this to say the split applies while endpoints are available and healthy.
- The YAML examples used `networking.istio.io/v1beta1`. Current Istio reference examples use the stable `networking.istio.io/v1` API for `DestinationRule`, so I updated the snippets to `networking.istio.io/v1`.
- The summary said the default is equal distribution and that outlier detection is the key requirement for all cross-cluster load balancing decisions. I narrowed this to state that the default pool includes healthy endpoints from every discovered cluster, and that outlier detection is required for locality failover.

## Review Notes
The `kubectl`, `istioctl proxy-config endpoints`, Envoy stats, and Prometheus metric examples are structurally correct, but they require an installed/configured Istio and Kubernetes environment. The local review environment did not have `kubectl` or `istioctl` installed, so CLI syntax was verified against official documentation rather than by executing the commands.
