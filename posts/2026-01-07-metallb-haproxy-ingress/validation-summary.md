# Validation Summary: How to Configure MetalLB with HAProxy Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services and Ingress
- MetalLB
- HAProxy Kubernetes Ingress Controller
- Helm
- Prometheus and ServiceMonitor
- Grafana dashboard ConfigMap

## Sources Consulted
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB advanced IPAddressPool documentation: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- HAProxy Kubernetes Ingress Controller Helm values documentation: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/values/
- HAProxy Kubernetes Ingress Controller default Helm values: https://github.com/haproxytech/helm-charts/blob/main/kubernetes-ingress/values.yaml
- HAProxy Kubernetes Ingress Controller Ingress annotations reference: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/ingress/
- HAProxy Kubernetes Ingress Controller ConfigMap options reference: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/configmap/
- HAProxy Kubernetes Ingress Controller startup arguments reference: https://github.com/haproxytech/kubernetes-ingress/blob/master/documentation/controller.md
- HAProxy Kubernetes Ingress Controller TCP load balancing tutorial: https://www.haproxy.com/documentation/kubernetes-ingress/ingress-tutorials/load-balance-tcp/
- HAProxy Kubernetes Ingress Controller metrics documentation: https://www.haproxy.com/documentation/kubernetes-ingress/administration/metrics/

## Issues Found
- Replaced deprecated MetalLB service annotations `metallb.universe.tf/address-pool` and `metallb.universe.tf/loadBalancerIPs` with current `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- Removed HAProxy UDP load-balancing examples because the HAProxy Kubernetes Ingress Controller documentation supports TCP service mapping through `--configmap-tcp-services`, but does not document equivalent UDP service ConfigMap support.
- Fixed the TCP Helm values to use `controller.extraArgs` with `--configmap-tcp-services=haproxy-ingress/haproxy-ingress-tcp` and `controller.service.tcpPorts`, matching the official Helm values and startup arguments.
- Added the missing PostgreSQL Secret to the TCP services example and corrected its `apiVersion` to `v1` so the manifest can apply successfully.
- Removed unsupported HAProxy Helm values including `controller.defaultBackendService`, `controller.ingressClassResource.enabled`, `controller.ingressClassResource.controllerValue`, `controller.tcpServices`, `controller.udpServices`, `controller.stats`, and `controller.metrics`.
- Corrected HAProxy logging values so `controller.logging.traffic` uses the documented object format rather than a boolean.
- Changed backend health check paths from `/health` to `/` for the nginx sample app, since the example app does not define a `/health` endpoint.
- Removed or replaced unsupported HAProxy annotations including `haproxy.org/access-log`, `haproxy.org/cookie-indirect`, `haproxy.org/cookie-nocache`, `haproxy.org/response-compress`, `haproxy.org/request-buffer-size`, and `haproxy.org/headers`.
- Replaced deprecated `haproxy.org/whitelist` with `haproxy.org/allow-list`.
- Replaced `haproxy.org/headers` with the documented `haproxy.org/response-set-header` annotation format.
- Corrected the performance tuning ConfigMap keys by removing unsupported keys such as `ssl-options`, `hsts`, compression keys, and `backend-check-*`, and by using documented keys such as `tls-alpn` and `check-interval`.
- Changed timeout examples to explicit duration values like `5s` and `50s`, matching HAProxy Ingress documentation examples.
- Updated the monitoring Helm values to use `controller.prometheus`, `controller.service.metrics`, and `controller.serviceMonitor` according to the current chart values.

## Review Notes
- The Kubernetes manifests are syntactically valid YAML after the corrections.
- `helm` and `kubectl` were not installed in the review environment, so commands were verified against official documentation and chart values rather than executed against a cluster.
