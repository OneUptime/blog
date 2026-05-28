# Validation Summary: Configure Pod Disruption Budgets in GKE to Maintain Availability During Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes PodDisruptionBudget (`policy/v1`)
- Kubernetes Deployments and StatefulSets
- Kubernetes readiness probes
- Kubernetes topology spread constraints
- `kubectl`
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Google Cloud documentation: GKE node upgrade strategies - https://cloud.google.com/kubernetes-engine/docs/concepts/node-pool-upgrade-strategies
- Google Cloud documentation: Manually upgrading a cluster or node pool - https://cloud.google.com/kubernetes-engine/docs/how-to/upgrading-a-cluster
- Google Cloud SDK reference: `gcloud container node-pools update` - https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Google Cloud documentation: Spot VMs in GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms

## Issues Found
- Spot/preemptible VM reclamation was listed as a voluntary disruption that PDBs protect against. GKE documentation states that Spot VM reclamation is involuntary and not covered by PDB guarantees, so I moved it to the involuntary-disruption list and updated the diagram.
- The opening explanation implied that all listed events involve draining and evicting pods through PDB-aware mechanisms. I narrowed this to eviction-based maintenance and clarified that PDBs apply to voluntary disruptions that use the Kubernetes Eviction API.
- The GKE node upgrade section said GKE drains nodes one at a time by default. GKE Standard surge upgrades use `maxSurge=1` and `maxUnavailable=0` per zone by default, and upgrades happen in a rolling window, so I corrected that description.
- The surge upgrade section claimed `--max-unavailable-upgrade 0` always creates new nodes before draining and ensures zero-downtime upgrades. I revised this to account for quota/capacity constraints and GKE's documented forceful eviction behavior after upgrade drain timeouts.
- The `kubectl get pdb` sample showed `ALLOWED DISRUPTIONS` as `3` for a PDB with `maxUnavailable: 1`. For a healthy four-replica workload, this should be `1`, so I corrected the sample output.
- The wrap-up claimed PDBs make GKE upgrades "truly zero-downtime." I softened this to "reduce disruption" because PDBs do not guarantee availability during all failures or all GKE upgrade edge cases.

## Review Notes
The YAML manifests use current `policy/v1` PDB syntax and valid Deployment fields. The `gcloud container node-pools update` flags are current, though the Google Cloud SDK now recommends `--location` over `--region` or `--zone`; the existing regional example remains valid.
