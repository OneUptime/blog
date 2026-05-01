# Validation Summary: How to Set Up EKS with Karpenter Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- Amazon EKS
- Karpenter
- Helm
- Kubernetes

## Sources Consulted
- Karpenter Getting Started: https://karpenter.sh/v1.12/getting-started/getting-started-with-karpenter/
- Karpenter NodePools reference: https://karpenter.sh/v1.9/concepts/nodepools/
- Karpenter NodeClasses reference: https://karpenter.sh/v1.10/concepts/nodeclasses/
- Karpenter settings reference: https://karpenter.sh/docs/reference/settings/
- Karpenter CloudFormation/IAM reference: https://karpenter.sh/docs/reference/cloudformation/
- Karpenter v1 migration notes: https://karpenter.sh/v1.0/upgrading/v1-migration/
- Amazon EKS node IAM role guidance: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- Amazon EKS access entries: https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- Amazon EKS IRSA and OIDC setup: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS optimized AMI guidance: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon EKS AL2 deprecation guidance: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- OpenTofu CLI docs: https://opentofu.org/docs/cli/init/
- OpenTofu plan/apply docs: https://opentofu.org/docs/v1.11/cli/commands/plan/ and https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post pinned Karpenter `0.37.0` and used `v1beta1` CRDs. I updated it to Karpenter `1.12.0` and the current `karpenter.sh/v1` and `karpenter.k8s.aws/v1` APIs because `v1beta1` is no longer the current installation target.
- The `NodePool` manifest used an outdated `nodeClassRef` shape and the old `WhenUnderutilized` consolidation policy. I added the required `group` and `kind` fields and changed the policy to `WhenEmptyOrUnderutilized`, which matches the current API.
- The `EC2NodeClass` used `amiFamily = "AL2"` without `amiSelectorTerms`. I changed it to use `amiSelectorTerms` with `al2023@latest` because current Karpenter requires `amiSelectorTerms`, and Amazon EKS no longer publishes new AL2 AMIs beyond Kubernetes `1.32`.
- The controller IAM policy was incomplete for current Karpenter behavior and omitted required EC2 discovery, pricing, and instance-profile read permissions. I expanded the policy to cover the currently required actions for the article’s pre-created instance profile approach.
- The post created an instance profile but did not use it. I changed the `EC2NodeClass` to use `instanceProfile`, which is the current recommended approach when you pre-provision the instance profile yourself.
- The node role example still used `AmazonEC2ContainerRegistryReadOnly`. I updated it to `AmazonEC2ContainerRegistryPullOnly`, which is the current Amazon EKS node-role recommendation.
- The article omitted required setup details for bootstrap capacity, IRSA/OIDC, discovery tags, node authorization, and Spot service-linked role creation. I added those prerequisites and included an EKS access entry example, with a note for clusters that still rely on the legacy `aws-auth` ConfigMap.
- The snippets referenced an existing EKS cluster and OIDC provider indirectly but did not show how those objects were looked up. I added the missing `aws_eks_cluster` and `aws_iam_openid_connect_provider` data sources so the examples are internally consistent.

## Review Notes
- The inline controller policy is functionally correct for the example, but the official Karpenter `cloudformation.yaml` remains the better production reference because it applies tighter resource scoping than this blog-friendly version.
- The article still uses IRSA. EKS Pod Identity is also supported by Amazon EKS, but it requires a different trust policy and different installation steps, so it should not be mixed into the same snippet.
- The Helm example keeps `settings.clusterEndpoint` explicit for clarity, even though current Karpenter can discover the endpoint through `eks:DescribeCluster`.
