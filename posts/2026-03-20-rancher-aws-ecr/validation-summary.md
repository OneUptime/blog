# Validation Summary: How to Configure AWS ECR with Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Amazon ECR
- Amazon EKS
- AWS IAM
- AWS CLI
- `kubectl`
- `eksctl`
- Kubernetes CronJob

## Sources Consulted
- Amazon ECR registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI `ecr create-repository`: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS CLI `ecr get-login-password`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Using Amazon ECR images with Amazon EKS: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html
- Amazon EKS node IAM role: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- IAM roles for service accounts (IRSA): https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- `eksctl` IAM service accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS managed policies for Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/security-iam-awsmanpol.html
- AWS managed policy `AmazonEC2ContainerRegistryPullOnly`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEC2ContainerRegistryPullOnly.html
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes install `kubectl` on Linux: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Rancher EKS cluster configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/eks-cluster-configuration
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS CLI `ecr put-lifecycle-policy`: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-lifecycle-policy.html
- Amazon Linux 2023 container image packages: https://docs.aws.amazon.com/linux/al2023/ug/al2023-container-image-types.html
- Amazon Linux 2023 AWS CLI v2: https://docs.aws.amazon.com/linux/al2023/ug/awscli2.html

## Issues Found
- The CronJob example used the official AWS CLI image but then called `kubectl`, which is not provided by that image. I replaced it with an Amazon Linux 2023-based example that installs AWS CLI v2 and a pinned `kubectl` binary before refreshing the secret.
- The CronJob RBAC granted unnecessary `serviceaccounts` permissions and `delete` on secrets. I reduced it to the permissions needed to create or update the pull secret.
- The post implied the CronJob pattern was universally required. I corrected the wording so it applies to the secret-based `imagePullSecrets` approach, not to EKS node-role-based pulls.
- The IRSA section incorrectly presented IRSA as the main mechanism for EKS image pulls. I corrected it to use IRSA for the token-refresh CronJob, which is the workload in this post that actually calls AWS APIs.
- The IRSA example omitted the required OIDC-provider setup and targeted a service account that the deployment never used. I added the `eksctl utils associate-iam-oidc-provider` step and changed the example to update the `ecr-token-refresher` service account from the CronJob manifest.
- The IRSA policy granted ECR image-pull actions that are not required for `aws ecr get-login-password`. I reduced it to `ecr:GetAuthorizationToken`, which is the API used by that command.
- The Rancher/EKS section claimed ECR could be configured at the cluster level with an `EKSClusterConfig` field named `nodeRole`. That field is not part of the documented Rancher `EKSClusterConfig` example. I replaced the section with the correct AWS requirement: ensure the EKS node IAM role has `AmazonEC2ContainerRegistryPullOnly`.
- The deployment example always included `imagePullSecrets`, which is misleading for EKS clusters that rely on the node IAM role. I added an inline note clarifying that `imagePullSecrets` should be omitted when the EKS node role is used for ECR pulls.
- The lifecycle policy example said it kept the “last 10 images,” but the rule only matches tags with the `v` prefix. I corrected the comment and description to say “version-tagged images.”
- The troubleshooting note said `aws sts get-caller-identity` checked whether a node had ECR permissions. I corrected it to describe what the command actually tells you: which AWS identity the current shell or pod is using.
- The conclusion recommended IRSA for EKS in general. I corrected it to distinguish node-role-based image pulls on EKS from IRSA-based API access for helper workloads.

## Review Notes
- The CronJob example now pins `KUBECTL_VERSION` to `v1.33.0` as an example. Kubernetes recommends using a `kubectl` version within one minor version of the cluster, so operators should adjust that value to match their environment.
- For EKS node groups created with `eksctl` or the standard AWS EKS workflows, the ECR pull permissions are often already present on the node IAM role by default. The verification command in Step 5 is still useful for confirming the role state.
