# Validation Summary: How to Implement Canary Deployments Using Istio Traffic Splitting on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes Deployments and Services
- Istio VirtualService and DestinationRule
- Envoy sidecar proxy traffic routing
- Prometheus and Istio standard metrics
- Flagger automated canary deployments
- kubectl and Kustomize

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Flagger Istio progressive delivery tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics

## Issues Found
- Istio examples used `networking.istio.io/v1beta1` for VirtualService and DestinationRule. Updated them to the current stable `networking.istio.io/v1` API shown in current Istio documentation.
- The latency monitoring example listed the histogram bucket metric directly as a p99 comparison. Replaced it with Prometheus `histogram_quantile(0.99, sum(rate(...)) by (le))` expressions so the example actually computes p99 latency.
- The Flagger `threshold` comment described successful checks before promotion. Corrected it to failed metric checks before rollback, matching Flagger's analysis semantics.
- The Flagger `request-duration` comment described p99 latency. Corrected it to average request duration, matching Flagger's built-in metric documentation.
- The Flagger section reused the manual two-Deployment model while its `targetRef` and command referenced a single `deployment/my-service`. Added a clarification that Flagger should target a single Deployment for this workflow.
- The Flagger install command used `github.com/fluxcd/flagger/kustomize/istio`. Updated it to the documented remote Kustomize path `github.com/fluxcd/flagger//kustomize/istio`.
- The Flagger explanation said it creates a v2 deployment. Corrected it to describe Flagger creating the primary deployment plus Kubernetes services and Istio routing resources.

## Review Notes
The manual canary flow is technically valid for in-mesh HTTP traffic when the workloads have Istio sidecar injection enabled and clients route through Envoy. For production use, fully qualified service hostnames can reduce namespace ambiguity in Istio resources, although the short `my-service` host is valid when the resources and Service are in the same namespace.
