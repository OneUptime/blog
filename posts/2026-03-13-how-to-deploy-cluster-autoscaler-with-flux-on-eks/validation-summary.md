# Validation Summary: How to Deploy Cluster Autoscaler with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Kubernetes Cluster Autoscaler
- Flux HelmRelease and HelmRepository
- Helm
- AWS IAM and IRSA
- AWS Auto Scaling Groups
- kubectl
- eksctl

## Sources Consulted
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl Auto Scaling guide: https://docs.aws.amazon.com/eks/latest/eksctl/autoscaling.html
- AWS CLI `autoscaling create-or-update-tags` reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-or-update-tags.html
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository and HelmRelease guide: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/
- Kubernetes Autoscaler AWS cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Cluster Autoscaler Helm chart source: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/charts/cluster-autoscaler
- Kubernetes Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md

## Issues Found
- The IAM policy placed all Auto Scaling permissions in one broad statement. Updated it to follow AWS EKS guidance by tag-scoping `autoscaling:SetDesiredCapacity` and `autoscaling:TerminateInstanceInAutoScalingGroup` while keeping read-only describe permissions unconditioned.
- The prerequisites said EKS 1.25 or later while the HelmRelease pinned chart `9.37.*`, whose chart appVersion is Cluster Autoscaler 1.30. Updated the prerequisite and chart version to use the current chart `9.57.*` for EKS 1.35, with a note to match the chart appVersion to the cluster Kubernetes minor version.
- The ASG tagging command used a node-group-like placeholder for `ResourceId`. AWS CLI documentation requires the Auto Scaling group name, so the text and placeholder were corrected.
- The priority expander text implied it directly matches instance types. Upstream documentation says it matches node group/scaling group names with regular expressions, so the wording now says the ASG names must identify the capacity type.

## Review Notes
- The Flux `HelmRepository` and `HelmRelease` API versions are current.
- The Cluster Autoscaler Helm chart values used in the post, including `autoDiscovery.clusterName`, `awsRegion`, `rbac.serviceAccount`, `extraArgs`, resources, priority class, and tolerations, match the upstream chart structure.
- The `kubectl`, `flux`, `git`, `aws autoscaling`, and `eksctl create iamserviceaccount` commands are structurally valid, but the review environment did not have those CLIs installed for local `--help` validation.
