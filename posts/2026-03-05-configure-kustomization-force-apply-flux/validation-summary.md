# Validation Summary: How to Configure Kustomization Force Apply in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomize Controller
- Flux Kustomization custom resources
- Kubernetes Jobs
- Kubernetes Services
- Kubernetes StatefulSets
- Kubernetes server-side apply behavior
- kubectl and Flux CLI reconciliation commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post grouped "Jobs and CronJobs" as a force-apply use case. Kubernetes CronJobs contain a template for future Jobs, and modifying a CronJob applies to Jobs created after the modification rather than updating already-created Jobs. I changed the heading to "Jobs" so the section aligns with the immutable `Job.spec.template` use case documented by Kubernetes and Flux.

## Review Notes
- Flux's `spec.force`, `timeout`, `wait`, and `retryInterval` fields are current for `kustomize.toolkit.fluxcd.io/v1`.
- The per-resource `kustomize.toolkit.fluxcd.io/force: enabled` policy is documented by Flux and is appropriate as a safer alternative to enabling `spec.force` on a broad Kustomization.
- The examples use valid Kubernetes and Flux YAML syntax. The `sourceRef` examples assume the referenced `GitRepository` is in the same namespace as the `Kustomization`, which is valid Flux behavior.
