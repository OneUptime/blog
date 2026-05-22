# Validation Summary: How to Configure Health Checks on Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateway
- Istio DestinationRule, VirtualService, and EnvoyFilter APIs
- Envoy active and passive health checking
- Kubernetes Services, Deployments, probes, and endpoints
- AWS Network Load Balancer service annotations
- GKE BackendConfig health checks
- istioctl and kubectl

## Sources Consulted
- Istio Application Requirements, port 15021 health checks: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Gateway API deployment behavior: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio gateway Helm chart templates and values: https://github.com/istio/istio/tree/master/manifests/charts/gateway
- Istio DestinationRule reference, outlierDetection fields: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference, directResponse fields: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference, CLUSTER patches and ClusterMatch fields: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference and proxy-config endpoint examples: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod, endpoint output example: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy health checking overview and HealthCheck API reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking and https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- GKE Ingress BackendConfig health check documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration

## Issues Found
- The opening section implied that the gateway inherently checks backend service health. Updated it to distinguish Kubernetes endpoint readiness, passive outlier detection, and Envoy active health checks.
- The gateway probe example claimed the default ingress gateway deployment includes both readiness and liveness probes on `/healthz/ready`. Current Istio gateway chart values document default readiness probe injection and do not define a default liveness probe there, so the text and snippet now show only the readiness probe.
- The AWS NLB example used health check port `"15021"`. Changed it to the Service port name `"status-port"` so AWS Load Balancer Controller can resolve the correct NodePort for instance targets or targetPort for IP targets.
- The GCP example referenced a BackendConfig by annotation without scoping it to GKE Ingress/Application Load Balancer behavior and without including the BackendConfig resource. Added the matching `BackendConfig` with `healthCheck.type`, `requestPath`, and `port`, and clarified that the Service port must be referenced by the Ingress.
- The DestinationRule section described outlier detection as active checking every 10 seconds. Changed this to passive outlier detection and clarified that `interval` is the outlier detection analysis interval, not a periodic request probe.
- The monitoring section listed `DRAINING` as an endpoint output status flag. Current Istio examples show `STATUS` and `OUTLIER CHECK` columns such as `HEALTHY` and `OK`; the wording now reflects those columns.

## Review Notes
The EnvoyFilter active health check example uses a low-level patch against generated Envoy clusters. It is syntactically consistent with Istio's EnvoyFilter and Envoy HealthCheck APIs, but this remains a brittle advanced customization because generated cluster names and matching behavior can vary by service, port, subset, protocol, and Istio version. Test this in a staging cluster before relying on it in production.
