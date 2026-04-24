# Validation Summary: How to Set Up Pod Disruption Budgets via Portainer - K8s Pdb

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- PodDisruptionBudget (PDB)
- HorizontalPodAutoscaler (HPA)
- StatefulSets
- `kubectl`
- Portainer API

## Sources Consulted
- Kubernetes: Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes: Disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes: `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes: PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Kubernetes: Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Portainer: Applications: https://docs.portainer.io/user/kubernetes/applications
- Portainer: Add a new application using code: https://docs.portainer.io/user/kubernetes/applications/manifest
- Portainer: Create an application from a Manifest: https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer: API documentation: https://docs.portainer.io/api/docs

## Issues Found
- The Portainer navigation path was outdated. I changed it from a namespace-level `Applications > YAML` flow to the current documented `Applications > Create from code > Manifest` flow.
- The HPA/PDB example said "Deployment: 3 replicas minimum" while showing `replicas: 5`, and the follow-up comment overstated the guarantee as draining a node. I corrected the comment to match the manifest and to describe the actual PDB behavior: one pod eviction remains allowed when the HPA is at `minReplicas`.
- The `kubectl describe pdb` explanation described `Allowed disruptions` as a simple `current available - minAvailable` calculation. I replaced that with neutral status-field wording because the value is derived from PDB status and controller scale, including `maxUnavailable` cases.
- The node-drain section incorrectly said `kubectl drain --force` violates or bypasses a PDB. I corrected this to `--disable-eviction`, which is the documented flag that bypasses PodDisruptionBudget checks by deleting pods directly; `--force` is for unmanaged or orphaned pods.
- The best-practices comments overstated what `maxUnavailable: 1` guarantees by saying it can "always drain 1 node" and "always" leave 2 pods serving. I tightened that wording to pod-eviction semantics, which is what a PDB actually controls.

## Review Notes
- Validated against current Kubernetes documentation and current Portainer 2.39 LTS documentation as of 2026-04-24.
- The Portainer API example is consistent with Portainer's documented Kubernetes API gateway behavior and Kubernetes' grouped API path for PodDisruptionBudgets (`/apis/policy/v1/...`).
- `kubectl` is not installed in this workspace, so CLI validation was done against the official `kubectl drain` reference page rather than local `--help` output.
