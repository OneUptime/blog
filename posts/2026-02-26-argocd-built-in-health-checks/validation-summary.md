# Validation Summary: How to Understand Built-in Health Checks in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource health checks
- Kubernetes Deployments, StatefulSets, DaemonSets, ReplicaSets, Services, Ingresses, Jobs, CronJobs, Pods, PVCs, and HPAs
- kubectl
- argocd CLI
- jq
- Mermaid diagrams

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD application health aggregation source: https://github.com/argoproj/argo-cd/blob/master/controller/health.go
- Argo CD / GitOps Engine built-in health source: https://github.com/argoproj/gitops-engine/tree/master/pkg/health
- Argo CD CronJob health customization source: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/batch/CronJob/health.lua
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Corrected the claim that ArgoCD has built-in health checks for all standard Kubernetes resources. Official docs list several supported resource types, not all standard resources.
- Corrected the health status count from five to six and added Unknown to the diagram.
- Corrected Application health aggregation to use immediate child resources and the documented health priority order. Added the current controller caveat for missing live resources.
- Corrected Deployment health details: paused Deployments are Suspended, scaled-to-zero Deployments can be Healthy, Degraded depends on ProgressDeadlineExceeded, and availability is compared with updated replicas in ArgoCD's check.
- Corrected StatefulSet, DaemonSet, and ReplicaSet health details to match the built-in Go checks, removing timeout-based Degraded states that ArgoCD does not normally emit.
- Corrected Service and Ingress health: LoadBalancer Services and Ingresses depend on load balancer ingress status; non-LoadBalancer Services are generally Healthy.
- Corrected Job and CronJob health behavior, including Job terminal conditions, suspended Jobs, and current CronJob handling of failed, active, and suspended runs.
- Corrected Pod, PVC, and HPA health descriptions to match the built-in checks and condition handling.
- Corrected Namespace, ConfigMap, Secret, and unsupported-resource descriptions. These do not have built-in health checks, and unsupported resources do not automatically receive a calculated "Healthy if exists" status.
- Verified the OneUptime internal reference links returned HTTP 200.

## Review Notes
The command snippets use valid `kubectl`, `argocd app get -o json`, and `jq` patterns. The post intentionally remains a high-level guide; ArgoCD health behavior can vary when users configure Lua overrides or when bundled resource customizations change between Argo CD versions.
