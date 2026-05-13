# Validation Summary: How to Configure Spot Instance Workloads with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD Kustomization
- Kustomize patches
- AWS EKS Spot managed node groups
- Google Kubernetes Engine Spot and preemptible nodes
- Pod affinity and anti-affinity
- Taints and tolerations
- PodDisruptionBudget
- Cluster Autoscaler

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Flux documentation: Kustomization API and patches - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Amazon EKS documentation: Managed node group capacity types - https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- AWS Node Termination Handler documentation - https://github.com/aws/aws-node-termination-handler
- Google Kubernetes Engine documentation: Preemptible VMs - https://cloud.google.com/kubernetes-engine/docs/how-to/preemptible-vms
- Google Kubernetes Engine documentation: Spot VMs - https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- AWS EC2 Spot best practices - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- Google Compute Engine Spot VMs - https://cloud.google.com/compute/docs/instances/spot
- Azure Spot Virtual Machines - https://azure.microsoft.com/en-us/products/virtual-machines/spot/

## Issues Found
- The workload examples scheduled pods using the custom `capacity-type=spot` label, but the node verification commands only checked provider-specific labels such as `eks.amazonaws.com/capacityType=SPOT` and `cloud.google.com/gke-preemptible=true`. I added commands that map EKS Spot, GKE preemptible, and GKE Spot VM nodes to the custom labels used later in the article.
- The GKE verification commands only covered preemptible nodes. I added the current GKE Spot VM label, `cloud.google.com/gke-spot=true`, because Google recommends Spot VMs for new GKE fault-tolerant workloads.
- The node taint command did not include `--overwrite`, so rerunning it against nodes with an existing `spot=true:NoSchedule` taint could fail. I added `--overwrite`.
- The reusable toleration patch included an `aws.amazon.com/spot` toleration described as an AWS-specific spot interruption taint. I removed it because it is not a standard EKS managed node group or AWS Node Termination Handler taint.
- The Flux Kustomization patch example only added the spot toleration even though the surrounding text described applying spot workload placement. I added the matching node affinity patch for `capacity-type=spot`.

## Review Notes
The Kubernetes API versions used in the examples are current: `apps/v1` for Deployments, `policy/v1` for PodDisruptionBudget, and `kustomize.toolkit.fluxcd.io/v1` for Flux Kustomization. The article's PDB guidance is accurate for voluntary eviction-based drains, but cloud-provider interruptions can still be best effort and may not always give pods the full configured termination grace period.
