# Validation Summary: How to Configure Horizontal Pod Autoscaling with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Metrics Server
- Kubernetes custom and external metrics APIs
- Flux CD Kustomization
- Flux CD notification-controller alerts
- Kustomize overlays and patches
- kubectl and Flux CLI

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Kubernetes declarative management with Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes SIGs Prometheus Adapter: https://github.com/kubernetes-sigs/prometheus-adapter

## Issues Found
- The prerequisites only mentioned Metrics Server, but the custom and external metrics examples require the relevant `custom.metrics.k8s.io` or `external.metrics.k8s.io` APIs to be available through a metrics adapter. Added a prerequisite for a custom or external metrics adapter.
- The Flux notification example used `notification.toolkit.fluxcd.io/v1` for an `Alert`. Current Flux documentation lists `Alert` under `notification.toolkit.fluxcd.io/v1beta3`, while the v1 API reference covers `Receiver`. Updated the `Alert` manifest to `notification.toolkit.fluxcd.io/v1beta3`.
- The notification section described the alert as covering autoscaling events, but Flux alerts forward events from Flux objects such as Kustomizations, not HPA controller scaling decisions. Updated the heading and lead-in to clarify that the alert monitors Flux reconciliation events for the autoscaling manifests.

## Review Notes
- The HPA manifests use the stable `autoscaling/v2` API and current fields for resource, pods, external, multi-metric, and behavior-based scaling.
- CPU and memory utilization targets correctly require container resource requests.
- The Kustomize overlay patch examples use the supported `patches` field with inline JSON6902 operations.
- Local `kubectl`, `flux`, `kustomize`, and Ruby YAML tooling were not installed in this environment, so validation was performed against official documentation and by manual review of the snippets.
