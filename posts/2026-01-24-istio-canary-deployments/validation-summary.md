# Validation Summary: How to Handle Istio Canary Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Deployments and Services
- Istio VirtualService and DestinationRule
- Prometheus / PromQL
- kubectl
- Flagger

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio request routing task: https://istio.io/latest/docs/tasks/traffic-management/request-routing/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Flagger Istio progressive delivery tutorial: https://docs.flagger.app/tutorials/istio-progressive-delivery
- Flagger FAQ metrics reference: https://docs.flagger.app/faq

## Issues Found
- Updated Istio `VirtualService` and `DestinationRule` examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used in current Istio documentation.
- Fixed the rollback manifest to use `metadata.name: reviews-canary`, so `kubectl apply -f reviews-rollback.yaml` updates the existing canary `VirtualService` instead of creating a second `VirtualService` for the same host.
- Clarified rollback timing because Istio configuration propagation is eventually consistent, so traffic shifts after the updated configuration propagates rather than literally immediately.
- Clarified the Flagger example by noting that Flagger manages a single target Deployment and creates primary/canary services, so the example assumes a Deployment named `reviews`.
- Corrected the DestinationRule verification command from `kubectl get destinationrule reviews -o yaml` to `kubectl get destinationrule reviews-destination -o yaml`, matching the manifest name used earlier.
- Corrected the weight guidance. Istio route weights are relative proportions, so they do not technically have to sum to 100; the post now frames 100 as a percentage convention rather than an API requirement.
- Replaced the claim that missing subsets fail silently with a more accurate warning that routes referencing missing subsets can return errors.

## Review Notes
The post is technically sound after the corrections. Short service names such as `reviews` work in these examples because the resources are in the same namespace, but Istio recommends fully qualified service names in production to avoid namespace-related misconfiguration.
