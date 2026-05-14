# Validation Summary: How to Implement Rolling Updates with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Flux CD Image Automation
- Flux CD Notifications
- Kubernetes Deployments and rolling updates
- Kubernetes Services
- Kubernetes Pod Disruption Budgets
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes probes and lifecycle hooks
- Kustomize overlays
- Prometheus Operator PrometheusRule
- Git rollback workflow

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Image Update Automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image Update Automation API reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The prerequisites specified Kubernetes v1.26+, but the PDB example uses `unhealthyPodEvictionPolicy`, which is stable and enabled by default in Kubernetes v1.31+. Updated the prerequisite to v1.31+ so the examples are valid as written.
- The Flux Kustomization example used `wait: true` together with explicit `healthChecks`. Flux ignores `.spec.healthChecks` when `.spec.wait` is true, so the ignored `healthChecks` block was removed and the comment now explains `wait`.
- The Flux Kustomization comment implied `force: false` handles rolling-update conflicts. Updated the comment to state that force should stay disabled unless resource recreation is intentional.
- The PDB section said PDBs ensure availability during rolling updates. Kubernetes documents that Deployment rolling updates are controlled by the workload strategy and are not limited by PDBs, so the text now scopes PDBs to voluntary disruptions such as node maintenance.
- The `unhealthyPodEvictionPolicy: AlwaysAllow` comment incorrectly mentioned unblocking stuck updates after 60 seconds. Updated it to describe the actual behavior: unhealthy running pods can be evicted during voluntary disruptions.
- The Service example said session affinity helps keep users on the same pod version while setting `sessionAffinity: None`. Updated the comment to match the configuration.
- The Flux ImagePolicy comment said "latest patch version" but the semver range `>=1.5.0 <2.0.0` allowed minor version updates. Changed the range to `>=1.5.0 <1.6.0`.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, while the current Flux notification examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated the Provider and Alert API versions and removed the Slack channel field from the incoming-webhook example.

## Review Notes
The examples are illustrative and assume supporting controllers or CRDs are installed where needed, such as Flux image automation controllers and the Prometheus Operator for `PrometheusRule`. The "zero downtime" outcome still depends on application shutdown behavior, readiness probe quality, available cluster capacity, and external load balancer behavior.
