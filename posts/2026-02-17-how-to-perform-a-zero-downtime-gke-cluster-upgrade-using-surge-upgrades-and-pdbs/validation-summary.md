# Validation Summary: How to Perform a Zero-Downtime GKE Cluster Upgrade Using Surge Upgrades and PDBs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Deployments
- Kubernetes readiness and liveness probes
- PodDisruptionBudgets
- Pod topology spread constraints
- gcloud CLI
- kubectl
- Node.js and Express graceful shutdown handling

## Sources Consulted
- Google Cloud documentation: About GKE cluster upgrades - https://cloud.google.com/kubernetes-engine/upgrades
- Google Cloud documentation: Manually upgrade a cluster's control plane or node pools - https://cloud.google.com/kubernetes-engine/docs/how-to/upgrading-a-cluster
- Google Cloud documentation: GKE node upgrade strategies - https://cloud.google.com/kubernetes-engine/docs/concepts/node-pool-upgrade-strategies
- Google Cloud SDK reference: gcloud container clusters upgrade - https://cloud.google.com/sdk/gcloud/reference/container/clusters/upgrade
- Google Cloud SDK reference: gcloud container clusters update - https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference: gcloud container node-pools update - https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The control plane upgrade description said it causes no workload disruption without caveats. Updated it to clarify that worker nodes and running workloads remain available, but cluster configuration changes can be unavailable for several minutes, especially on zonal clusters.
- The Mermaid sequence implied pods are scheduled on surge nodes before old pods are evicted. Updated the sequence to show surge nodes becoming ready, old nodes being cordoned and drained, and replacement pods then scheduling on new nodes.
- The surge upgrade explanation said every old node is replaced before being drained. Updated it to match GKE's documented behavior: with `maxUnavailable=0`, GKE waits for surge nodes to be ready before draining old nodes, while still requiring enough quota and capacity for surge nodes.
- The manual upgrade commands used the stale example version `1.28.5-gke.1200`. Replaced it with `TARGET_VERSION` so readers use an available supported GKE version from `gcloud container get-server-config`.
- The rollback section said GKE does not support automatic version rollback. Updated it to distinguish rollback of incomplete or canceled node pool upgrades from downgrading a completed upgrade, and added the documented `gcloud container node-pools rollback` command.

## Review Notes
Local `gcloud` and `kubectl` binaries were not installed in the review environment, so CLI verification used official Google Cloud SDK documentation. JavaScript syntax was checked with `node --check`, and YAML snippets were parsed successfully with PyYAML.
