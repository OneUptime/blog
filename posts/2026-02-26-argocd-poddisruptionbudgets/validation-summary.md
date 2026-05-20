# Validation Summary: How to Configure PodDisruptionBudgets for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PodDisruptionBudgets
- Kubernetes node draining and eviction behavior
- Argo CD high availability components
- Argo CD Helm chart values
- Redis HA and HAProxy in Argo CD

## Sources Consulted
- Kubernetes documentation, Disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation, Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Argo CD documentation, High Availability: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo Helm chart README for argo-cd: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Argo Helm chart values for argo-cd: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml
- Argo Helm chart PDB templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd/templates
- Redis HA Helm chart values and PDB templates: https://github.com/DandyDeveloper/charts/tree/master/charts/redis-ha
- Argo CD HA manifests: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/ha/install.yaml

## Issues Found
- The post described the application controller as using leader election for the two-replica example. Argo CD documentation and the Helm chart values describe additional application-controller replicas as sharding managed clusters across replicas. Updated the sentence to describe sharding instead.
- The API server PDB explanation said a node can be drained one at a time with three replicas and `minAvailable: 2` without qualifying pod placement. Added that this works when replicas are spread across nodes.
- The Helm values example enabled `redis-ha` but said the Redis HA chart manages its own PDBs without showing the required Redis HA subchart PDB values. Added `redis-ha.podDisruptionBudget.minAvailable` and `redis-ha.haproxy.podDisruptionBudget.minAvailable`, matching the Redis HA subchart structure used by the Argo CD chart.
- The anti-affinity explanation said draining a node with all three API server pods would be blocked because evicting any pod violates `minAvailable: 2`. In reality, the first eviction can be allowed and subsequent evictions are blocked. Updated the explanation.
- The single-replica notifications example implied `enabled: false` could be combined with `maxUnavailable: 1`. Clarified that `maxUnavailable: 1` requires enabling the PDB and intentionally allowing voluntary eviction.

## Review Notes
The Kubernetes `policy/v1` PodDisruptionBudget API, `minAvailable` / `maxUnavailable` usage, percentage rounding examples, `kubectl drain --delete-emptydir-data`, and Argo CD component selectors are otherwise technically sound for current Kubernetes and Argo CD documentation. The Argo CD Helm chart exposes PDB settings per component, while Redis HA PDBs are configured through the embedded Redis HA subchart values rather than the same `pdb.enabled` structure used by Argo CD components.
