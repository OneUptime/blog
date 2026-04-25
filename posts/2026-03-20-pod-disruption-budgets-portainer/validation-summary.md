# Validation Summary: How to Set Up Pod Disruption Budgets via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- PodDisruptionBudget (PDB)
- `kubectl`

## Sources Consulted
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: `kubectl drain` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Portainer documentation: Add a new application using code - https://docs.portainer.io/user/kubernetes/applications/manifest
- Portainer documentation: `kubectl shell` - https://docs.portainer.io/user/kubernetes/kubectl

## Issues Found
- The introduction implied that PDBs govern rolling upgrades. I corrected this to node drains, cluster upgrades, and maintenance operations, because PDBs constrain evictions but do not limit workload-controller rolling updates.
- The Portainer navigation path was outdated. I changed `Kubernetes > Advanced Deployment` to the current manifest workflow documented by Portainer: `Applications > Create from code` with the web editor.
- The StatefulSet example used a selector that matched only `role: replica` pods while claiming the budget applied to a three-pod PostgreSQL workload. I removed the extra selector label and adjusted the comment so the example matches the described availability budget.
- The drain behavior description said a drain would hang until the PDB was removed. I updated this to reflect current Kubernetes behavior: `kubectl drain` keeps retrying evictions until enough healthy replicas exist, the budget is relaxed, or the command times out.
- The verification example showed status fields that do not match current Kubernetes PDB status output. I replaced them with the documented `currentHealthy`, `desiredHealthy`, `disruptionsAllowed`, and `expectedPods` fields and updated the detailed check command to use `-o yaml`.
- The summary said Portainer's manifest interface ensures version control. I corrected that wording because Portainer can deploy manifests, but version control depends on where those manifests are stored.

## Review Notes
- The post correctly uses the stable `policy/v1` PodDisruptionBudget API.
- Kubernetes now recommends considering `unhealthyPodEvictionPolicy: AlwaysAllow` for easier draining of misbehaving pods; the post remains correct without it, but that could be a future improvement.
- Portainer UI naming can vary across releases. The updated navigation matches the current official documentation reviewed on April 25, 2026.
