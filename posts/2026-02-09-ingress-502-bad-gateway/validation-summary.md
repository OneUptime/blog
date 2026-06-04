# Validation Summary: Debug Kubernetes Ingress 502 Bad Gateway Errors from Backend Pod Unavailability

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Services, Endpoints, and EndpointSlices
- Kubernetes readiness and liveness probes
- Kubernetes pod lifecycle hooks and graceful termination
- ingress-nginx controller annotations, ConfigMap settings, logs, and Prometheus metrics
- Prometheus alert rules
- Node.js and Express health check handlers

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress concepts: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes probe configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes pod and endpoint termination flow: https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- ingress-nginx annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap options: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx monitoring and metrics: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/

## Issues Found
- Removed `nginx.ingress.kubernetes.io/upstream-keepalive-connections` and `nginx.ingress.kubernetes.io/upstream-keepalive-timeout` from the Ingress annotation example because ingress-nginx documents upstream keepalive settings as ConfigMap options, not per-Ingress annotations.
- Replaced the undocumented `nginx_ingress_controller_upstream_servers` metric with the documented `nginx_ingress_controller_orphan_ingress{type="no-endpoint"}` metric for detecting backend Services with no endpoints.
- Updated the Prometheus alert that used the undocumented upstream metric to use the documented orphan Ingress metric.
- Corrected the 502 percentage alert expression so the value in the alert description is actually a percentage.
- Removed manual `kill -TERM 1` from the `preStop` hook because Kubernetes runs `preStop` before sending the container stop signal; the hook should leave time for endpoint propagation and allow Kubernetes to send SIGTERM.

## Review Notes
The deprecated core `Endpoints` resource is still usable for troubleshooting, but EndpointSlices are the scalable API Kubernetes recommends. The post already includes EndpointSlice commands, so no further change was needed.
