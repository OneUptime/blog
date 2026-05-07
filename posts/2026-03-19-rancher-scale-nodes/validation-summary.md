# Validation Summary: How to Scale Cluster Nodes Up and Down in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- AWS CLI
- Google Cloud CLI (`gcloud`)
- Azure CLI (`az`)
- Kubernetes Cluster Autoscaler

## Sources Consulted
- Rancher: Nodes and Machine Pools: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher: EKS Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/cluster-configuration/rancher-server-configuration/eks-cluster-configuration
- Rancher: GKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/cluster-configuration/rancher-server-configuration/gke-cluster-configuration
- Rancher: Launching Kubernetes on Existing Custom Nodes: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher: Removing Kubernetes Components from Nodes: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/clean-cluster-nodes
- AWS CLI: `update-nodegroup-config`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-config.html
- Amazon EKS: Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Amazon EKS: Scale cluster compute with Karpenter and Cluster Autoscaler: https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html
- Google Cloud CLI: `gcloud container clusters resize`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/resize
- Google Kubernetes Engine: Resize a Standard cluster by adding or removing nodes: https://cloud.google.com/kubernetes-engine/docs/how-to/resizing-a-cluster
- Azure Kubernetes Service: Scale node pools: https://learn.microsoft.com/en-us/azure/aks/scale-node-pools
- Kubernetes: `kubectl cordon`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes: `kubectl drain`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The machine-pool scale-down section said Rancher always cordons, drains, and removes nodes automatically. I corrected this to reflect Rancher's documented behavior: node draining before deletion depends on the machine pool's **Drain Before Delete** setting.
- The GKE CLI example used `--region`, which is not correct for all cluster types. I changed it to `--location`, which is the current `gcloud` flag that works for zonal and regional clusters.
- The custom-cluster scale-up example hardcoded a generic registration command that could omit required generated flags such as the CA checksum. I replaced it with guidance to use the exact Rancher-generated registration command from the UI for the target node role.
- The custom-cluster scale-down section instructed readers to delete the Kubernetes node object directly and manually stop the Rancher system agent. I corrected this to match Rancher's documented removal flow: delete the node in Rancher so cleanup can run, restart the host if reusing it, and use the documented uninstall scripts only when automatic cleanup cannot run.
- The EKS autoscaler section used a hardcoded Cluster Autoscaler Deployment manifest with a fixed image version and omitted required installation context such as version matching and provider-specific setup. I replaced it with accurate guidance to deploy Cluster Autoscaler or Karpenter separately and to match Cluster Autoscaler to the cluster's Kubernetes minor version.
- The monitoring section used `kubectl top` examples without the Metrics Server prerequisite and used non-reference command forms. I updated the commands to the documented `kubectl top node` and `kubectl top pod` syntax and noted that Metrics Server must be installed.
- The EKS scaling section did not mention that `desiredSize` should not be set manually when Cluster Autoscaler is managing a node group. I added that caveat.

## Review Notes
The post is now technically sound for current Rancher and managed Kubernetes workflows, but Rancher UI labels and placement can vary slightly between versions. The corrected guidance intentionally favors behavior and workflow accuracy over brittle UI wording.
