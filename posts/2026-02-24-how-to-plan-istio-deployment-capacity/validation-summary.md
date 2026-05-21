# Validation Summary: How to Plan Istio Deployment Capacity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- IstioOperator
- Horizontal Pod Autoscaler
- GKE node pools
- Prometheus, Jaeger, and Loki observability stacks

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Sidecar or Ambient dataplane modes: https://istio.io/latest/docs/overview/dataplane-modes/
- Istio Customizing the installation configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Google Cloud SDK gcloud container node-pools create reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create

## Issues Found
- The post implied every mesh pod always gets an Envoy sidecar. Istio now supports both sidecar and ambient dataplane modes, so I changed the wording to refer specifically to sidecar-mode workloads.
- The sidecar resource estimates were framed as idle values without support from current Istio documentation. I replaced the wording with Istio's published benchmark reference and clarified that CPU scales with throughput and memory scales with configuration state.
- The post described proxy resources as being set in the "sidecar injection template." The snippet uses Istio installation values for default proxy resources, so I changed the description to "default proxy resource requests."
- The ingress gateway throughput claim was too absolute. I changed it to emphasize benchmarking because gateway capacity depends on CPU, payload size, protocol, TLS, filters, and telemetry.
- The metrics storage estimate was too specific for a general guide because Prometheus cardinality depends on enabled metrics and labels. I changed it to recommend measuring series cardinality in staging.
- The headroom section said Kubernetes scheduling gets "flaky" above 80% utilization. I changed this to a more accurate statement about reduced room for bursts, evictions, and rescheduling near full utilization.
- The rolling update section said deployments temporarily have double the pods. Kubernetes Deployment surge behavior depends on `maxSurge`, so I updated the wording to reflect that.

## Review Notes
The IstioOperator examples use current IstioOperator fields for component Kubernetes resources, HPA settings, affinity, and tolerations. The HPA metric shape is accepted by the IstioOperator API even though standalone Kubernetes `autoscaling/v2` HPA manifests use a different nested `target.averageUtilization` shape.
