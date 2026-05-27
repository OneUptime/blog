# Validation Summary: How to Deploy MetalLB with HAProxy Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- HAProxy Ingress Controller
- Helm
- Kubernetes Ingress
- Prometheus ServiceMonitor

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- HAProxy Ingress configuration keys: https://haproxy-ingress.github.io/docs/configuration/keys/
- HAProxy Ingress command-line options: https://haproxy-ingress.github.io/docs/configuration/command-line/
- HAProxy Ingress getting started guide: https://haproxy-ingress.github.io/docs/getting-started/
- HAProxy Ingress Helm chart values: https://github.com/haproxy-ingress/charts/blob/release-0.16/haproxy-ingress/values.yaml
- HAProxy Ingress Helm chart templates: https://github.com/haproxy-ingress/charts/tree/release-0.16/haproxy-ingress/templates
- HAProxy Ingress metrics example: https://haproxy-ingress.github.io/docs/examples/metrics/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus Operator ServiceMonitor API: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm install command used `ingressClassName: haproxy` later in the post but did not enable creation of the matching IngressClass. Added `--set controller.ingressClassResource.enabled=true`.
- The expected LoadBalancer service name and port-forward command referenced `haproxy-ingress-controller`, but the HAProxy Ingress chart creates `haproxy-ingress` for this release name. Updated the service example and metrics/stat port-forward commands to chart-generated service names.
- The post claimed dynamic updates without reloads using HAProxy's data plane API. The referenced HAProxy Ingress controller uses runtime socket updates where possible and graceful reloads when required, so the claim was corrected.
- Connection draining was configured as Ingress annotations even though `drain-support` and `drain-support-redispatch` are global HAProxy Ingress keys. Replaced the Ingress example with Helm values under `controller.config`.
- The TCP load balancing example created a standalone ConfigMap that would not be consumed by the controller as shown, and the deprecated `--tcp-services-configmap` path is no longer the preferred approach. Replaced it with a TCP Ingress using `haproxy-ingress.github.io/tcp-service-port` and added the required service port exposure command.
- The canary example used `backend-server-slots-increment`, which controls dynamic backend server slots and does not split traffic. Replaced it with the HAProxy Ingress `blue-green-balance` annotation and adjusted the example to route through a shared Service selected by stable and canary pod labels.
- The ServiceMonitor selector was incomplete for the chart's generated metrics service and only scraped the HAProxy metrics port. Updated it to include the chart release label and both `metrics` and `ctrl-metrics` endpoints.

## Review Notes
- The MetalLB `IPAddressPool` and `L2Advertisement` examples use current `metallb.io/v1beta1` resources and match MetalLB's Layer 2 configuration model.
- The article does not pin a HAProxy Ingress chart version. Future chart defaults may change service names, labels, or metric port behavior, so pinning a chart version would make the tutorial more reproducible.
