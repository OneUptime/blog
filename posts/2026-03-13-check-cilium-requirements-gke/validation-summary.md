# Validation Summary: Checking Cilium Requirements for GKE (Google Kubernetes Engine)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Google Kubernetes Engine (GKE)
- GKE Dataplane V2
- Google Cloud CLI
- eBPF
- Workload Identity Federation for GKE

## Sources Consulted
- Google Cloud: GKE Dataplane V2 concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud: Using GKE Dataplane V2: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud SDK: `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud: GKE node images: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/node-images
- Google Cloud: Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Cilium: Cilium quick installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium: System requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium: Kubernetes compatibility: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium: Routing and encapsulation requirements: https://docs.cilium.io/en/stable/network/concepts/routing/

## Issues Found
- The introduction said GKE COS nodes support the full Cilium feature set. This was too broad because Cilium has feature-specific kernel requirements beyond the baseline. Changed it to say COS nodes meet Cilium's baseline requirements.
- The node image section stated fixed kernel versions for GKE COS and Ubuntu nodes. GKE node image kernels vary by node image and GKE version. Changed this to recommend checking the actual node kernel and noted Cilium's current Linux kernel 5.10+ requirement.
- The Dataplane V2 cluster creation example omitted `--enable-ip-alias`, which Google documents in the Dataplane V2 `gcloud` creation command. Added the flag.
- The Dataplane V2 verification command used `kubectl get pods -n kube-system | grep cilium`, but GKE documents checking pods with label `k8s-app=cilium`; the pods are named `anetd-*`. Replaced the command with the documented label selector and clarified the pod naming.
- The Workload Identity section referenced ENI/cloud-specific IPAM. ENI IPAM is AWS-specific, while Cilium's documented GKE default uses Kubernetes PodCIDR IPAM. Reworded the section to describe Workload Identity Federation as relevant to workloads needing Google Cloud API access.
- The requirements table listed Dataplane V2 as `1.20+`; Google documents GKE 1.20.6-gke.700 or later. Updated the version.
- The requirements table listed self-managed Cilium on GKE as `1.24+`. Cilium's Kubernetes compatibility is release-specific, so the table now directs readers to match their Cilium release's compatibility matrix.

## Review Notes
The firewall guidance for Cilium VXLAN UDP 8472 and health checks on TCP 4240 matches Cilium's documented firewall requirements. The GKE Dataplane V2 NetworkPolicy explanation is consistent with Google Cloud documentation: NetworkPolicy enforcement is built in for Dataplane V2 clusters.
