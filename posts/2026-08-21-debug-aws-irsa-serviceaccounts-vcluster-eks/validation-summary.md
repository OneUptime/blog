# Validation Summary: How to Debug AWS IRSA for ServiceAccounts Synced from vCluster to EKS

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- vCluster 0.36 on Shared Nodes
- Kubernetes Namespaces, Pods, Deployments, and ServiceAccounts
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- AWS IAM OIDC providers, role trust policies, and permissions policies
- Amazon EKS Pod Identity Webhook and projected ServiceAccount tokens
- AWS STS, the AWS SDK credential chain, and EC2 Instance Metadata Service (IMDS)
- AWS CLI, `kubectl`, and `jq`

## Sources Consulted

- [vCluster 0.36 ServiceAccount synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/service-accounts)
- [vCluster synchronization and single-namespace translation](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster metadata synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/)
- [vCluster annotation reference](https://www.vcluster.com/docs/vcluster/reference/annotations)
- [vCluster Pod synchronization and `useSecretsForSATokens`](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/core/pods)
- [vCluster 0.36 `vcluster create` CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster v0.36.1 ServiceAccount syncer source](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/controllers/resources/serviceaccounts/syncer.go#L54-L100)
- [vCluster v0.36.1 Pod ServiceAccount translation source](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/controllers/resources/pods/translate/translator.go#L215-L233)
- [Amazon EKS workload identity comparison](https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html)
- [Amazon EKS IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [Amazon EKS IRSA role association and trust policy](https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html)
- [Amazon EKS Pod configuration and webhook verification](https://docs.aws.amazon.com/eks/latest/userguide/pod-configuration.html)
- [Amazon EKS regional STS endpoint configuration](https://docs.aws.amazon.com/eks/latest/userguide/configure-sts-endpoint.html)
- [Amazon EKS minimum SDK versions and default credential-chain behavior](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-minimum-sdk.html)
- [Amazon EKS Pod Identity Webhook source and mutation example](https://github.com/aws/amazon-eks-pod-identity-webhook)
- [Official AWS CLI container image documentation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html)
- [AWS IAM role-session revocation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html)
- [Kubernetes Namespace documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [Kubernetes ServiceAccount token administration and offline validation](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes container command and argument behavior](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/)

## Issues Found

- The workload manifest referenced the `apps` namespace without creating it or stating that it must already exist. Fresh Kubernetes clusters do not include that namespace, so applying the example would fail. Added a Namespace object to the same manifest.
- The image reference `public.ecr.aws/aws-cli/aws-cli:2` did not exist in Amazon ECR Public. Replaced it with the verified, immutable `public.ecr.aws/aws-cli/aws-cli:2.36.28` tag; the pinned image contains the `sh`, `sleep`, and `aws` executables used by the example.
- The comparison said IRSA and EKS Pod Identity use different agents, but IRSA does not use the EKS Pod Identity Agent. Reworded the comparison to distinguish their credential-delivery components, configuration, and trust models.
- The token-exposure advice implied that rotating or recreating a Pod was sufficient containment. An externally validated leaked JWT can remain usable until expiration, and previously issued STS credentials remain usable unless their permissions or role sessions are revoked. Updated the guidance to distinguish Pod replacement from blocking new role assumptions and revoking active sessions.

## Review Notes

- The vCluster 0.36 configuration fields, single-namespace name translation, origin annotations, bidirectional metadata synchronization, Pod ServiceAccount translation, and `vcluster create` flags were verified against the v0.36 documentation and tagged source.
- The IAM trust-policy JSON, EKS annotation keys, projected-token audience, webhook mutation checks, credential-chain guidance, IMDS behavior, AWS CLI commands, `kubectl` commands, and `jq` filter are correct.
- AWS documents the AWS CLI container's `aws` executable as its supported interface. The pinned 2.36.28 image was directly checked for the shell and `sleep` utilities used to keep this diagnostic Pod running.
- All external documentation links in the post resolved and pointed to the intended official resources on the validation date.
