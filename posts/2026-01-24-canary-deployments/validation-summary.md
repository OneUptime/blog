# Validation Summary: How to Configure Canary Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Services, and Ingress
- kubectl
- Argo Rollouts
- Argo Rollouts kubectl plugin
- Argo Rollouts AnalysisTemplate with Prometheus
- Flagger
- Helm
- Istio VirtualService and Gateway routing
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Argo Rollouts installation documentation: https://argo-rollouts.readthedocs.io/en/stable/installation/
- Argo Rollouts canary strategy documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/
- Argo Rollouts NGINX traffic routing documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts Prometheus analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Flagger Kubernetes install documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger Istio canary deployment documentation: https://docs.flagger.app/tutorials/istio-progressive-delivery
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Ingress example used the legacy `kubernetes.io/ingress.class` annotation. Updated it to `spec.ingressClassName: nginx`, which is the current Kubernetes Ingress field and is supported by Argo Rollouts' NGINX integration.
- The Flagger Helm install command omitted the Canary CRD installation step and the corresponding `crd.create=false` Helm value shown in the official Flagger Helm installation path. Added the CRD apply command and `--set crd.create=false`.
- The Flagger Istio `gateways` value used a service-style DNS name. Updated it to the `namespace/name` gateway reference format used by the official Flagger Istio examples.
- The Flagger `threshold` comment described successful checks before promotion. Corrected it to describe the maximum number of failed metric checks before rollback.
- The Argo Rollouts `setHeaderRoute` example omitted the traffic routing configuration and `managedRoutes` entry required for header-based routes. Added the required `canaryService`, `stableService`, `trafficRouting.managedRoutes`, and Istio VirtualService reference.

## Review Notes
The native Kubernetes canary approach is technically valid as a basic demonstration, but replica-count based traffic splitting is approximate because Kubernetes Services balance across selected endpoints rather than applying explicit request weights. The Prometheus metric names and labels are application-specific examples and must match the user's instrumentation in a real cluster.
