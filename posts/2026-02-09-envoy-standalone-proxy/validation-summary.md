# Validation Summary: How to deploy Envoy as a standalone proxy in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy
- Kubernetes Deployments, Services, ConfigMaps, Secrets, probes, and HorizontalPodAutoscaler
- Prometheus Operator ServiceMonitor
- Prometheus metrics and alerting
- TLS termination

## Sources Consulted
- Envoy documentation: Configuration reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/configuration
- Envoy documentation: Administration interface, including `/ready` and `/stats/prometheus`: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy documentation: HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy documentation: Cluster manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy documentation: Service discovery and STRICT_DNS behavior: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy documentation: Access logs: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/access_log.html
- Envoy documentation: TLS configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto.html
- Envoy container validation with `envoyproxy/envoy:v1.38.0` and `envoy --mode validate`
- Kubernetes documentation: Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes API reference: HorizontalPodAutoscaler autoscaling/v2: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kubectl reference: `kubectl scale`: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus Operator documentation: ServiceMonitor usage and selector behavior: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: ServiceMonitor endpoint `port`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Deployment used the old `envoyproxy/envoy:v1.28-latest` image tag. Updated it to the current validated stable image `envoyproxy/envoy:v1.38.0`.
- The LoadBalancer Service exposed Envoy's admin port publicly, which contradicted the later security guidance. Split the Service configuration into a public HTTP LoadBalancer Service and an internal ClusterIP Service for the admin interface.
- The ServiceMonitor selected `app: envoy-proxy`, but ServiceMonitor selectors match Service labels and the intended admin scrape target should be the internal admin Service. Updated the ServiceMonitor selector to `app: envoy-proxy-admin`.
- The admin port-forward command referenced the public `envoy-proxy` Service. Updated it to port-forward `svc/envoy-proxy-admin`.
- The Prometheus alert annotation used `$labels.cluster_name`, but Envoy's Prometheus output labels the cluster as `envoy_cluster_name`. Updated the annotation accordingly.
- The high error rate alert was not scoped to the ingress HTTP connection manager and could include admin interface metrics. Added `envoy_http_conn_manager_prefix="ingress_http"` to the PromQL selector.

## Review Notes
- The Envoy v3 bootstrap examples and the embedded ConfigMap Envoy configuration were validated successfully with `envoyproxy/envoy:v1.38.0` using `envoy --mode validate`.
- All YAML code blocks parse successfully as YAML. Full Kubernetes API dry-run validation could not be run because `kubectl` is not installed in this environment.
