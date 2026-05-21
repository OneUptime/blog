# Validation Summary: How to Handle Services with Multiple Ports in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- Kubernetes Services and Deployments
- Istio VirtualService, DestinationRule, and Gateway resources
- Istio sidecar probe rewriting and traffic capture annotations
- Istio telemetry and Prometheus queries
- `istioctl` and `kubectl`

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Application Requirements / ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- Fixed the `DestinationRule` example by moving `portLevelSettings` under `trafficPolicy`, which is where Istio defines port-level traffic policies.
- Added `version: v1` to the sample Deployment pod labels and noted that the VirtualService subsets require matching `version: v1` and `version: v2` pod labels.
- Made the health check rewrite example an applyable Deployment fragment by adding the required selector, pod labels, and container image.
- Corrected the health check rewrite port from 15021 to 15020. Istio documents probe rewrite as changing the probe path to `/app-health/...` on port 15020, where the sidecar agent maps the probe back to the application.
- Made the excluded-port Deployment example applyable by adding the required selector, pod labels, and container image.
- Corrected the monitoring section to state that `destination_port` is not a default Istio standard metric label and must be added with the Telemetry API before using the shown PromQL grouping.
- Corrected the sidecar port conflict warning. Istio uses specific sidecar ports in the 15000-15090 range, not every port in that range.

## Review Notes
The examples use short service hostnames such as `backend-service`, which Istio supports but resolves relative to the namespace of the Istio configuration. Fully qualified service names are safer for cross-namespace configurations.
