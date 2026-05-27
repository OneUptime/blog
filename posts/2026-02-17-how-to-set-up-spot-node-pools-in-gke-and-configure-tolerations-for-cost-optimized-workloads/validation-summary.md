# Validation Summary: How to Set Up Spot Node Pools in GKE and Configure Tolerations for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Spot VMs
- Kubernetes taints and tolerations
- Kubernetes node selectors and node affinity
- Kubernetes PriorityClass and pod preemption
- gcloud CLI
- kubectl
- Node.js graceful shutdown
- Python signal handling and checkpointing

## Sources Consulted
- Google Cloud GKE Spot VMs concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Google Cloud GKE Spot VMs how-to guide: https://cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- Google Cloud SDK `gcloud container node-pools create` reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud Compute Engine Spot VMs documentation: https://cloud.google.com/compute/docs/instances/spot
- Kubernetes scheduling, preemption, and eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes assign pods to nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes PriorityClass documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post stated that Spot node pools automatically receive the `cloud.google.com/gke-spot=true:NoSchedule` taint. Official GKE guidance requires adding a taint with `--node-taints` when creating a tainted Spot node pool, so the node pool command and explanation were updated.
- The post implied pods receive roughly 30 seconds for graceful shutdown and recommended `terminationGracePeriodSeconds: 25`. GKE Spot VMs terminate after 30 seconds, but the default graceful termination period for non-system pods is up to 15 seconds on a best-effort basis, so the text, YAML, Node.js timeout, and best-practice recommendation were corrected.
- The "prefer Spot" example did not mention that preferred node affinity does not affect cluster autoscaler scale-up decisions. A caveat was added so readers do not expect a scale-to-zero Spot pool to scale from preferred affinity alone.
- Several `apps/v1` Deployment examples omitted required selectors, matching pod labels, or containers. The YAML examples were completed so they are valid Kubernetes Deployment manifests.
- The pricing command claimed to check Spot versus on-demand pricing, but `gcloud compute machine-types describe` only describes machine type specs. The command comments were corrected to direct readers to current pricing sources and mark the numeric comparison as illustrative.
- The preemption monitoring command filtered for `reason=Preempted`, which can miss GKE Spot node shutdown signals. It was changed to a broader event query that looks for preemption, node shutdown, and termination text.
- The Python checkpointing example used `current_item` in the SIGTERM handler before it was initialized. `current_item` was initialized before registering the signal handler.

## Review Notes
The post is technically valid after the fixes. Pricing numbers remain illustrative because Google Cloud Spot prices can change; readers should check the pricing page, Pricing Calculator, or Cloud Billing Catalog API for current values.
