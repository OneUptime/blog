# Validation Summary: How to Configure Pod Disruption Budgets with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PodDisruptionBudget
- Kubernetes Deployments and rolling updates
- Flux CD Kustomization
- Flux CD notification-controller Alerts and Providers
- Kustomize overlays and patches
- kubectl
- Flux CLI

## Sources Consulted
- Kubernetes: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl get reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation - https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation - https://fluxcd.io/flux/components/notification/providers/
- Flux notification API v1 reference - https://fluxcd.io/flux/components/notification/api/v1/
- Flux notification API v1beta3 reference - https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux get kustomizations` reference - https://fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The introduction listed rolling updates as disruptions that PDBs protect against. Kubernetes documentation states that pods unavailable during a rolling upgrade count against the budget, but workload controllers such as Deployments and StatefulSets are not limited by PDBs during rolling upgrades. Removed rolling updates from the introductory examples of voluntary disruptions.
- The Flux `Alert` and `Provider` manifests used `notification.toolkit.fluxcd.io/v1`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for `Alert` and `Provider`; `notification.toolkit.fluxcd.io/v1` currently documents `Receiver`. Updated both API versions to `v1beta3`.
- The Flux CLI validation command used `flux get kustomizations pod-disruption-budgets`, but the current Flux CLI reference documents `flux get kustomizations [flags]` without a positional name argument. Updated the command to `flux get kustomizations --namespace flux-system`.
- The best-practice example said `maxUnavailable: 1` "Always allows one disruption." This was too broad because PDB decisions also depend on the current health and availability of the selected pods. Reworded the comment to say it allows up to one healthy pod to be disrupted.
- The deployment strategy section implied PDBs directly work with Deployment rolling updates. Updated it to clarify that PDBs do not limit Deployment rolling updates, while unavailable rollout pods still count against the budget for other voluntary evictions.

## Review Notes
The remaining Kubernetes and Flux examples use current, non-deprecated API groups for the versions discussed. The `policy/v1` PDB examples correctly use either `minAvailable` or `maxUnavailable`, not both, and include selectors. The Flux `Kustomization` examples use current `kustomize.toolkit.fluxcd.io/v1` fields such as `interval`, `sourceRef`, `path`, `prune`, `wait`, `targetNamespace`, and `dependsOn`.
