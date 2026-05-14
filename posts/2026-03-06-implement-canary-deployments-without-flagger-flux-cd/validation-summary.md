# Validation Summary: How to Implement Canary Deployments Without Flagger in Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD Kustomization and Notification Controller resources
- Kubernetes Deployments, Services, Ingress, CronJobs, ServiceAccounts, Roles, and RoleBindings
- ingress-nginx canary routing annotations
- Istio VirtualService traffic weighting and retry policy
- Prometheus Operator PrometheusRule resources
- kubectl JSONPath, scale, patch, and annotate usage

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- ingress-nginx canary annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx canary example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Flux Kustomization example set `wait: true` while also listing explicit `healthChecks`. Flux ignores `spec.healthChecks` when `spec.wait` is true, so `wait: true` was removed to make the explicit health checks effective.
- The promotion example updated the stable image but left canary traffic enabled and did not update the version annotation or environment values. The example now updates stable metadata/env values and explicitly disables canary ingress traffic before scaling the canary deployment down.
- The pod-based canary section described traffic distribution as exactly proportional to pod count. This is only approximate over many requests and depends on ready endpoints and connection behavior, so the wording was corrected.
- The rollback CronJob used an in-cluster `kubectl scale` rollback that Flux would later revert to the Git desired state. The example now suspends the Flux Kustomization before emergency rollback and notes that the rollback must be committed to Git before resuming Flux.
- The rollback CronJob compared a potentially space-separated list of pod restart counts as a single integer. The command now emits restart counts line-by-line and sums them with `awk`.
- The rollback RBAC did not include permissions for ingress updates or Flux Kustomization suspension. The example now includes the necessary namespaced Role/RoleBinding permissions in `myapp` and `flux-system`.
- The Flux notification example used `notification.toolkit.fluxcd.io/v1` for an `Alert`, but current Flux documentation exposes `Alert` examples as `notification.toolkit.fluxcd.io/v1beta3`; Flux notification v1 is for `Receiver`. The snippet was updated to `v1beta3`.
- The Flux notification example used the deprecated `spec.summary` field. It now uses `spec.eventMetadata.summary`.

## Review Notes
YAML code fences were parsed locally after edits. The examples still assume the referenced CRDs and controllers are installed: Flux controllers, ingress-nginx, Istio for the VirtualService example, and Prometheus Operator for PrometheusRule.
