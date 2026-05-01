# Validation Summary: How to Set Up EKS Cluster Autoscaler with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- Amazon EKS
- EKS managed node groups
- EC2 Auto Scaling
- Kubernetes Cluster Autoscaler
- Helm

## Sources Consulted
- Amazon EKS Best Practices Guide, Cluster Autoscaler: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Amazon EKS User Guide, Create a managed node group for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html
- Kubernetes autoscaler AWS provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes autoscaler Helm chart values for chart `9.37.0`: https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-chart-9.37.0/charts/cluster-autoscaler/values.yaml
- Kubernetes autoscaler Helm chart service account template for chart `9.37.0`: https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-chart-9.37.0/charts/cluster-autoscaler/templates/serviceaccount.yaml
- Kubernetes autoscaler Helm chart deployment template for chart `9.37.0`: https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-chart-9.37.0/charts/cluster-autoscaler/templates/deployment.yaml
- HashiCorp AWS provider docs, `aws_eks_node_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_node_group.html.markdown
- HashiCorp AWS provider docs, `aws_autoscaling_group_tag`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/autoscaling_group_tag.html.markdown

## Issues Found
- The post tagged the `aws_eks_node_group` resource for Cluster Autoscaler discovery, but AWS documents that managed node group tags do not propagate to the underlying Auto Scaling Groups. I replaced that approach with `aws_autoscaling_group_tag` resources applied to the ASGs exposed by `aws_eks_node_group.app.resources[*].autoscaling_groups[*].name`.
- The IAM policy scoped write access with `kubernetes.io/cluster/<cluster-name>` instead of the Cluster Autoscaler discovery tags AWS recommends for least-privilege access. I changed the condition to `aws:ResourceTag/k8s.io/cluster-autoscaler/enabled = true` and `aws:ResourceTag/k8s.io/cluster-autoscaler/<cluster-name> = owned`.
- The IRSA trust policy expected the Kubernetes service account name `cluster-autoscaler`, but the Helm chart would create a different default service account name unless it was set explicitly. I added `rbac.serviceAccount.name = "cluster-autoscaler"` to keep the Helm release aligned with the trust policy.
- The node group `desired_size` would drift once Cluster Autoscaler started scaling the node group, causing future OpenTofu plans to fight the autoscaler. I added `lifecycle.ignore_changes = [scaling_config[0].desired_size]`, which the AWS provider docs recommend for externally changed desired counts.
- The verification commands selected `app.kubernetes.io/name=cluster-autoscaler`, but the chart’s default name label for AWS deployments is different. I changed the commands to use `app.kubernetes.io/instance=cluster-autoscaler`, which matches the release name set in the post.
- The prerequisites omitted the cluster OIDC requirement for IRSA. I added that prerequisite and noted the chart/version compatibility requirement.

## Review Notes
- Chart `9.37.0` deploys Cluster Autoscaler `v1.30.0`. AWS best practices state that the Cluster Autoscaler version should match the cluster’s Kubernetes minor version, so readers should adjust the pinned chart version if their EKS control plane is not `1.30`.
