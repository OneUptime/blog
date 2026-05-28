# Validation Summary: Configure GKE Cluster Autoscaler with Scale-Down Delays to Prevent Flapping

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Cluster Autoscaler
- Google Cloud CLI (`gcloud`)
- Kubernetes Deployments
- Kubernetes PodDisruptionBudget
- Kubernetes topology spread constraints
- Cloud Logging

## Sources Consulted
- GKE cluster autoscaler concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- GKE cluster autoscaler scale-down troubleshooting: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/cluster-autoscaler-scale-down
- GKE cluster autoscaler visibility events: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler-visibility
- GKE cluster autoscaling how-to: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- Google Cloud CLI `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud CLI `gcloud container node-pools update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Kubernetes PodDisruptionBudget API: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- Corrected the `optimize-utilization` profile explanation. The original post claimed the profile sets a higher utilization threshold close to 100% and that nodes must be nearly empty before removal. GKE documentation says the profile prioritizes utilization, scales down more aggressively, and uses the `gke.io/optimize-utilization-scheduler` for affected pods.
- Replaced the incorrect fine-grained tuning section. The original text implied GKE tuning could be done through a Cluster Autoscaler ConfigMap. The `cluster-autoscaler-status` ConfigMap is status output, not a configuration interface. The post now uses the current `gcloud container node-pools update --consolidation-delay` flag.
- Clarified node pool minimum sizing. `--min-nodes` and `--max-nodes` are per-zone values; GKE 1.24 and later supports `--total-min-nodes` and `--total-max-nodes` for whole-node-pool limits.
- Corrected the topology spread example. GKE Cluster Autoscaler does not support strict topology spread constraints with `whenUnsatisfiable: DoNotSchedule`, so the example now uses `ScheduleAnyway` and explains the caveat.
- Tightened `safe-to-evict` wording. `safe-to-evict: "true"` permits autoscaler eviction only when other scheduling and disruption constraints allow it.
- Corrected the autoscaler log query and wording to use Cloud Logging and the documented cluster autoscaler visibility log ID.
- Updated the wrap-up to focus on right-sized requests, consolidation delay, minimum node counts, and PDBs instead of overstating topology spread constraints as an anti-flapping control.

## Review Notes
The post is technically valid after edits. `gcloud` was not installed in the local environment, so CLI verification was performed against the official Google Cloud SDK reference documentation rather than local `--help` output.
