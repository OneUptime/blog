# Validation Summary: How to Troubleshoot GKE Cluster Autoscaler Not Scaling Up Nodes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Cluster Autoscaler
- Google Cloud CLI (`gcloud`)
- Kubernetes CLI (`kubectl`)
- Cloud Logging
- Kubernetes scheduling constraints, taints, tolerations, and PodDisruptionBudgets

## Sources Consulted
- Google Cloud: Autoscaling a cluster - https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- Google Cloud: About GKE cluster autoscaling - https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- Google Cloud: Troubleshoot cluster autoscaler not scaling up - https://cloud.google.com/kubernetes-engine/docs/troubleshooting/cluster-autoscaler-scale-up
- Google Cloud: View cluster autoscaler events - https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler-visibility
- Google Cloud: About GKE node sizing - https://cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes
- Google Cloud SDK reference: `gcloud container clusters update` - https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference: `gcloud container node-pools update` - https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Kubernetes Cluster Autoscaler FAQ - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The `kubectl get events` example filtered for `reason=ScaleUp`, but Kubernetes Cluster Autoscaler pod events use `TriggeredScaleUp` for scale-up-triggering pods. Updated the command to filter for `reason=TriggeredScaleUp`.
- The e2-standard-2 memory example used a 6GB request, which is too close to GKE's documented allocatable-memory calculation and may fit depending on units. Updated the example to 7GiB so the claim that the pod cannot fit on one e2-standard-2 node is correct.
- The autoscaling profile section said to switch to the balanced profile, but the command used `--autoscaling-profile optimize-utilization`. Updated the command to `--autoscaling-profile balanced`.

## Review Notes
The post is technically relevant and the main troubleshooting flow matches GKE guidance. `--min-nodes` and `--max-nodes` are per-zone bounds; for regional clusters on newer GKE versions, `--total-min-nodes` and `--total-max-nodes` may be preferable when users want limits across the whole node pool.
