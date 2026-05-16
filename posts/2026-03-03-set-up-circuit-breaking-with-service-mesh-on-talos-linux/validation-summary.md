# Validation Summary: How to Set Up Circuit Breaking with Service Mesh on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Istio (DestinationRule, connectionPool, outlierDetection, Envoy stats)
- Linkerd (ServiceProfile, failure accrual, EWMA load balancer)
- Envoy proxy (admin endpoint, Prometheus metrics)
- Fortio (load testing)
- httpbin (test workload)
- Prometheus

## Sources Consulted
- [Istio DestinationRule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio Circuit Breaking task](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [Linkerd Circuit Breakers](https://linkerd.io/2.15/tasks/circuit-breakers/)
- [Linkerd Circuit Breaking reference](https://linkerd.io/2-edge/reference/circuit-breaking/)
- Istio fortio sample at `samples/httpbin/sample-client/fortio-deploy.yaml` (release-1.20 branch, verified accessible)
- Envoy admin/Prometheus metric names (`upstream_cx_overflow`, `upstream_rq_pending_overflow`, `outlier_detection.ejections_active`)

## Issues Found
- **Incorrect Linkerd failure accrual example.** The original snippet used `kubectl annotate deployment api-service config.linkerd.io/proxy-log-level=linkerd=info,warn`. That annotation sets the proxy log level and has nothing to do with failure accrual. According to Linkerd's circuit breaking reference, failure accrual is enabled by setting `balancer.linkerd.io/failure-accrual=consecutive` (plus tuning annotations such as `balancer.linkerd.io/failure-accrual-consecutive-max-failures`, `-min-penalty`, and `-max-penalty`) on the target **Service**, not on a Deployment. I replaced the example with the correct annotations applied to the Service.

## Review Notes
- The Istio DestinationRule examples use `networking.istio.io/v1beta1`, which remains supported. Istio 1.22+ also exposes the same schema under `networking.istio.io/v1`; either works today, so no change was required.
- The Linkerd `ServiceProfile` still uses `linkerd.io/v1alpha2`, which is current.
- The fortio install URL pins `release-1.20`. The file exists on that branch (verified), but Istio 1.20 is older; future revisions could bump to a more recent release branch.
- The Envoy admin port (15000), the Prometheus metric names (`envoy_cluster_upstream_cx_overflow`, `envoy_cluster_upstream_rq_pending_overflow`), and the cluster name format (`outbound|<port>||<fqdn>`) all match Envoy/Istio conventions.
- Linkerd's load balancer behavior is correctly described as EWMA-based, and the description of consecutive failure accrual as an "explicit" circuit breaker is accurate.
