# Validation Summary: How to Deploy Argo Rollouts for Progressive Delivery with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Argo Rollouts
- Argo Rollouts kubectl plugin
- Argo Rollouts AnalysisTemplate and AnalysisRun
- NGINX Ingress Controller traffic routing
- Istio traffic routing
- Prometheus metrics

## Sources Consulted
- Argo Rollouts installation documentation: https://argo-rollouts.readthedocs.io/en/stable/installation/
- Argo Rollouts Helm documentation: https://argo-rollouts.readthedocs.io/en/stable/features/helm/
- Official argo-rollouts Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-rollouts/values.yaml
- Official argo-rollouts Helm chart notification templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-rollouts/templates/controller
- Argo Rollouts specification: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts NGINX traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts Istio traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts kubectl plugin documentation: https://argo-rollouts.readthedocs.io/en/stable/features/kubectl-plugin/
- Generated Argo Rollouts kubectl command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- Argo Rollouts notifications documentation: https://argo-rollouts.readthedocs.io/en/stable/features/notifications/

## Issues Found
- The Helm values snippet used `notifications.enabled` and `notifications.resources`, which are not valid values in the current official `argo/argo-rollouts` chart. Replaced them with the chart-supported `notifications.configmap.create`, `notifications.secret.create`, and `notifications.secret.items` settings so the referenced `$slack-token` and `$webhook-token` secrets can be rendered.
- The NGINX canary example referenced `stableIngress: myapp-ingress` but did not define the primary Ingress. Added a minimal `networking.k8s.io/v1` Ingress that routes to `myapp-stable`, matching the Argo Rollouts NGINX traffic-routing requirement that the stable Ingress route traffic to the stable service.
- The Istio example mixed host-level services with subset-level `DestinationRule` routing. Updated it to the documented subset-level pattern by using `trafficRouting.istio.virtualService`, adding a single `myapp-istio` service, and making the `VirtualService` destinations and `DestinationRule.host` consistently reference that service.

## Review Notes
- The YAML snippets were parsed successfully after edits.
- The local environment did not have `helm` or `kubectl` installed, so CLI behavior was checked against official Argo Rollouts documentation rather than local `--help` output.
