# Validation Summary: How to Estimate Control Plane Resource Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Istiod
- Envoy xDS
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes PodDisruptionBudget
- Prometheus metrics

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio security concepts and certificate rotation flow: https://istio.io/latest/docs/concepts/security/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio command and metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debug endpoint documentation: https://preliminary.istio.io/latest/docs/ops/integrations/integration-guide/debug-endpoints/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The endpoint-counting command used the legacy `endpoints` resource. Kubernetes 1.33 deprecated the Endpoints API in favor of EndpointSlices, so the command now uses `endpointslices` and counts endpoint addresses from the EndpointSlice API.
- The Prometheus metric listed for connected proxies was `pilot_xds_pushes{type="cds"}`, which tracks XDS push activity rather than connected endpoints. Replaced it with `pilot_xds`, the Istio metric documented as the number of endpoints connected to Pilot using XDS.
- The warning sign for a high push queue referenced `pilot_push_triggers`, which is a counter of push trigger events rather than queue depth. Replaced it with `pilot_worker_queue_depth` and `pilot_proxy_queue_time`, which better reflect queue backlog and waiting time.
- The HA guidance for three replicas said each instance handles about 50% of maximum capacity during normal operation. Corrected this to say each remaining instance handles about 50% of the proxies after a single-instance failure.

## Review Notes
The sizing formulas are presented as heuristic estimates rather than official Istio capacity formulas. Istio's official guidance confirms the same scaling factors but does not publish these exact constants, so they should be treated as starting points and validated against live metrics in the target mesh.
