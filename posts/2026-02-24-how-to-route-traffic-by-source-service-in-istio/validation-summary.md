# Validation Summary: How to Route Traffic by Source Service in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Deployments
- Kubernetes pod labels
- kubectl
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://preliminary.istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post described `sourceLabels` as if the sidecar directly evaluates the caller pod labels as a runtime request match. Istio documents `sourceLabels` as a selector that filters which workloads a VirtualService rule applies to. Updated the introduction and "How sourceLabels Works" section to explain that Istio builds route configuration for source workloads with matching pod labels.
- The sidecar warning said "like all VirtualService matching" and "no routing rules apply" without qualifying the in-mesh sidecar path. Updated it to say that for in-mesh service-to-service traffic, `sourceLabels` requires the caller to have the Istio sidecar and send traffic through it; otherwise these routing rules are bypassed.
- The `istioctl proxy-config routes` examples used the Kubernetes shorthand `deploy/<name>`. Istio's official command reference documents `deployment/<name>` for retrieving proxy config from a pod under a Deployment, so the examples were updated to that form.

## Review Notes
The YAML examples use current `networking.istio.io/v1` Istio APIs and valid fields for VirtualService HTTP matches, route destinations, retries, timeouts, weighted routing, and DestinationRule subsets. The `kubectl exec`, `kubectl apply`, `kubectl get pods --show-labels`, `istioctl analyze`, and `istioctl proxy-config routes deployment/<name>` command forms are supported by current official documentation. If the examples are later adapted to a VirtualService with explicit gateways, the Istio `sourceLabels` documentation caveat should be considered: the reserved `mesh` gateway must be included for `sourceLabels` to apply.
