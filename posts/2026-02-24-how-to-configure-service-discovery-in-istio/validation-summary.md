# Validation Summary: How to Configure Service Discovery in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Services
- Istio ServiceEntry
- Istio WorkloadEntry
- Istio MeshConfig discoverySelectors
- Istio multicluster service discovery
- istioctl
- Envoy xDS

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio multicluster installation documentation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multicluster verification documentation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The ServiceEntry and WorkloadEntry examples used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for these resources, so the snippets were updated to `networking.istio.io/v1`.
- The WorkloadEntry section said to pair a VM WorkloadEntry with a Kubernetes Service selector. Istio documentation requires a `ServiceEntry` with a `workloadSelector` for WorkloadEntry-backed services, and that ServiceEntry can select both VM WorkloadEntries and Kubernetes pods. The example and explanatory text were changed accordingly.
- The performance section said wildcard ServiceEntry resources "add entries for every matching hostname." That is not how wildcard hosts are described in current Istio documentation. The note was changed to explain that wildcard hosts broaden proxy host matching and are not supported by ztunnel or waypoint proxies.

## Review Notes
The post is written for sidecar-based Istio service discovery. Some statements, especially around wildcard ServiceEntry behavior, have different caveats in ambient mode because ztunnel and waypoint proxies do not support wildcard hosts in the same way as sidecars.
