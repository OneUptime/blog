# Validation Summary: How to Set Up Flux on EKS with Spot Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- EC2 Spot Instances
- eksctl
- Flux
- Kubernetes
- Kustomize
- AWS Node Termination Handler
- Cluster Autoscaler
- Helm
- Prometheus

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS managed node groups and Spot capacity type labels: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- Flux GitHub bootstrap command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux HelmRepository documentation, including OCI repositories: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- AWS Node Termination Handler documentation and Helm chart: https://github.com/aws/aws-node-termination-handler
- Cluster Autoscaler on AWS documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler Helm chart values and chart metadata: https://github.com/kubernetes/autoscaler/tree/master/charts/cluster-autoscaler
- Kubernetes Pod disruption budgets: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The EKS cluster version was set to `1.29`, which is no longer available in standard or extended EKS support as of May 13, 2026. Updated the cluster version to `1.33`, which is still in standard support.
- The Flux controller node selector only used a custom `role` label. Added the EKS-managed `eks.amazonaws.com/capacityType: ON_DEMAND` label so the example also uses the official EKS capacity type label.
- The AWS Node Termination Handler Helm source used the older AWS EKS charts HTTP repository and chart version `0.21.*`. Updated it to the current official OCI chart source, `oci://public.ecr.aws/aws-ec2/helm`, and version range `0.27.*`.
- The AWS Node Termination Handler was pinned to On-Demand system nodes. In IMDS mode, it must run on the nodes it monitors, so the example now schedules it on Spot nodes with `eks.amazonaws.com/capacityType: SPOT`.
- The workload affinity only used the custom `capacity-type` label. Added the official EKS `eks.amazonaws.com/capacityType: SPOT` label to match Amazon EKS managed node group behavior.
- The Cluster Autoscaler HelmRelease referenced a missing `autoscaler` HelmRepository. Added the required `HelmRepository` manifest for `https://kubernetes.github.io/autoscaler`.
- The Cluster Autoscaler chart version was left at `9.37.*`, which corresponds to an older Cluster Autoscaler release. Updated it to `9.48.*`, whose app version matches Kubernetes `1.33`.
- The Prometheus alert used a custom node-label expression that detected any unschedulable Spot node, not AWS Node Termination Handler interruption handling. Enabled the NTH Prometheus server and PodMonitor and updated the alert to use the official `actions_total` metric emitted by AWS Node Termination Handler.
- Verification and troubleshooting commands checked the custom `capacity-type` label only. Updated them to include the EKS-managed `eks.amazonaws.com/capacityType` label.

## Review Notes
- Amazon EKS managed Spot node groups already include managed draining and capacity rebalancing behavior. AWS Node Termination Handler can still be useful, but teams should decide whether IMDS mode or Queue Processor mode best fits their interruption and event-handling requirements.
- Cluster Autoscaler requires appropriate IAM permissions, ideally through IAM Roles for Service Accounts. The post assumes those permissions exist but does not show the IAM setup.
