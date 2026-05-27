# Validation Summary: How to Reduce GKE Costs with Cluster Autoscaler and Node Auto-Provisioning

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Cluster Autoscaler
- GKE Node Auto-Provisioning
- Kubernetes PodDisruptionBudget
- Kubernetes resource requests and limits
- GKE Vertical Pod Autoscaling
- GKE Spot VMs
- Google Cloud CLI

## Sources Consulted
- GKE cluster autoscaler concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- GKE cluster autoscaler how-to: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- GKE node auto-provisioning how-to: https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-provisioning
- Google Cloud SDK `gcloud container clusters update` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK `gcloud container node-pools create` reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- GKE Spot VMs how-to: https://cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- GKE Vertical Pod Autoscaling concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The Node Auto-Provisioning resource limit command used nonexistent `--autoprovisioning-max-cpu`, `--autoprovisioning-max-memory`, `--autoprovisioning-min-cpu`, and `--autoprovisioning-min-memory` flags. Updated them to the current `--max-cpu`, `--max-memory`, `--min-cpu`, and `--min-memory` flags from the official `gcloud container clusters update` reference.
- The machine-type restriction example used a nonexistent `--autoprovisioning-machine-types` flag. Replaced it with a current ComputeClass example that uses `machineFamily`, `whenUnsatisfiable`, and `nodePoolAutoCreation`, plus a workload `nodeSelector` for `cloud.google.com/compute-class`.
- The PodDisruptionBudget section incorrectly stated that pods without PDBs might block autoscaler eviction. Updated the wording to clarify that pods can still be evicted without PDBs, while PDBs define availability constraints for voluntary disruptions and overly restrictive PDBs can block scale-down.
- The Spot VM node pool command showed a toleration in the workload but did not taint the manually created node pool. Added `--node-taints=cloud.google.com/gke-spot="true":NoSchedule` so the scheduling example matches GKE's documented taints-and-tolerations pattern for Spot node pools.

## Review Notes
The post is technically relevant and contains implementation examples. The main autoscaling commands, `optimize-utilization` profile usage, VPA `updateMode: "Off"`, Kubernetes PDB API version, and Spot VM labels/tolerations are consistent with current official documentation. The local environment did not have `gcloud` installed, so CLI validation was performed against current official Google Cloud SDK reference pages rather than local `--help` output.
