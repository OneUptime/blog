# Validation Summary: How to Configure EKS Cluster Autoscaler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes Cluster Autoscaler
- EC2 Auto Scaling Groups
- AWS IAM and IRSA
- eksctl
- kubectl
- Prometheus metrics

## Sources Consulted
- Amazon EKS Best Practices: Cluster Autoscaler: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Amazon EKS User Guide: Scale cluster compute with Karpenter and Cluster Autoscaler: https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html
- Amazon EKS Best Practices: Karpenter: https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html
- Kubernetes Autoscaler AWS cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI Command Reference: autoscaling create-or-update-tags: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-or-update-tags.html

## Issues Found
- The post said Cluster Autoscaler adjusts nodes based on resource utilization and described scale-down as below 50% resource usage. Cluster Autoscaler scale-down uses pod CPU and memory requests compared to node allocatable/capacity, then checks whether pods can be moved. Updated the explanation to avoid implying live CPU or memory usage drives scale-down.
- The IAM policy allowed `autoscaling:SetDesiredCapacity` and `autoscaling:TerminateInstanceInAutoScalingGroup` on all resources. AWS recommends restricting these actions by Cluster Autoscaler ASG tags when auto-discovery is used. Split the policy into mutating and read-only statements and added tag-based conditions for the mutating actions.
- The IRSA step omitted the IAM OIDC provider requirement. eksctl and EKS documentation require an associated IAM OIDC provider before creating IAM roles for service accounts. Added the `eksctl utils associate-iam-oidc-provider` command before the service account creation command.

## Review Notes
- The example uses Cluster Autoscaler image `v1.29.0`, which is appropriate only for Kubernetes 1.29 clusters. The post already tells readers to match the autoscaler version to the Kubernetes cluster version; this remains important because AWS notes cross-version compatibility is not tested or supported.
- The `curl` command downloads the example manifest from the `master` branch, which may point at a newer example than the image version shown in the post. The post instructs readers to edit the manifest and match the version before applying it.
