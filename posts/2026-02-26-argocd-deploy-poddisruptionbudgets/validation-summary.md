# Validation Summary: How to Deploy PodDisruptionBudgets with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PodDisruptionBudgets
- Kubernetes Deployments and Services
- Kubernetes topology spread constraints
- Argo CD Applications
- Argo CD sync waves
- Kustomize overlays and patches

## Sources Consulted
- Kubernetes documentation: Disruptions and PodDisruptionBudgets, https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: Specifying a Disruption Budget for your Application, https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: `unhealthyPodEvictionPolicy` feature history via feature gates, https://v1-32.docs.kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Argo CD documentation: Sync Phases and Waves, https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD documentation: Resource Health, https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD documentation: Automated Sync Policy, https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/

## Issues Found
- The post said PDBs protect against manual pod deletions. Kubernetes documents direct pod deletion as a voluntary disruption that can bypass PDBs, so I replaced that bullet with Eviction API based pod removals and added a clarification.
- The post said Deployment rolling updates respect PDBs and can pause when the PDB is at its limit. Kubernetes documents that rolling update pods count against the budget, but Deployment and StatefulSet rolling updates are not limited by PDBs. I corrected that section to describe the Deployment controller's own rolling update settings.
- The post described sync retry configuration as increasing a sync timeout. That snippet configures automatic sync retries with backoff, not a timeout. I changed the explanation to discuss transient failures during concurrent node operations.
- The post said Argo CD considers PDBs healthy as long as they are created. Argo CD does not list PDBs among built-in health checks, so I changed this to recommend a custom health check if PDB status should affect Application health.
- The post said Kubernetes 1.27 introduced `unhealthyPodEvictionPolicy`. The field was introduced as alpha in Kubernetes 1.26, enabled by default as beta in 1.27, and stable in 1.31. I corrected the version history.
- The summary said PDBs ensure maintenance and autoscaler operations do not take down services. PDBs reduce the risk for voluntary evictions but do not guarantee availability for all disruption types, so I softened that claim.

## Review Notes
The YAML examples use current `policy/v1` PodDisruptionBudget APIs and valid Argo CD sync-wave annotations. `kubectl` was not installed in the workspace, so CLI syntax was checked against official Kubernetes documentation rather than local `kubectl --help` output.
