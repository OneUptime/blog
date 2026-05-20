# Validation Summary: How to Implement Dark Launches with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and automated sync
- GitOps workflows
- Kubernetes Deployments, ConfigMaps, Secrets, and readiness probes
- Istio VirtualService, DestinationRule, traffic mirroring, and header-based routing
- Prometheus Operator PrometheusRule resources
- PromQL recording and alerting rules
- Feature flag patterns

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Istio `VirtualService` and `DestinationRule` examples used `apiVersion: networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1` to match current Istio documentation examples.
- The Argo CD Application example implied that `prune: true` alone cleans up the dark launch when the Application is deleted. Added `resources-finalizer.argocd.argoproj.io` so deleting the Application cascades to managed resources, and clarified the `prune: true` comment to refer to resources removed from the Application source.

## Review Notes
- The Prometheus rules use standard Istio metric names and labels documented by Istio, including `istio_requests_total`, `istio_request_duration_milliseconds_bucket`, `destination_service_name`, `destination_version`, and `response_code`.
- The external `curl` example assumes `app.example.com` is already routed through an Istio ingress or equivalent gateway configuration; the post does not show that gateway setup.
