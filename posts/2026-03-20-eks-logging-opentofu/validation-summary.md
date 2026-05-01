# Validation Summary: How to Configure EKS Logging with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EKS
- Amazon CloudWatch Logs
- AWS IAM Roles for Service Accounts (IRSA)
- Helm
- AWS for Fluent Bit
- Kubernetes

## Sources Consulted
- Amazon EKS control plane logging docs: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- Amazon EKS IRSA role association docs: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS managed policy reference for `CloudWatchAgentServerPolicy`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS EKS Helm chart index: https://aws.github.io/eks-charts/index.yaml
- AWS for Fluent Bit chart package for the pinned version `0.1.32`: https://aws.github.io/eks-charts/aws-for-fluent-bit-0.1.32.tgz
- Fluent Bit `cloudwatch_logs` output plugin docs: https://docs.fluentbit.io/manual/2.0/pipeline/outputs/cloudwatch
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used an IRSA trust policy that did not include the recommended `aud` condition and targeted the wrong Kubernetes service account subject. The AWS EKS IRSA documentation shows `:aud = sts.amazonaws.com`, and the pinned `aws-for-fluent-bit` chart uses the `aws-for-fluent-bit` service account name for this release. I updated the trust policy to match the chart and AWS guidance.
- The post referenced `local.oidc_provider` without defining it. I replaced that with `replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")` so the example is self-consistent with the resource it already references.
- The Helm values block configured templated CloudWatch log group and stream settings under `cloudWatch`, but the pinned chart version exposes `logGroupTemplate` and `logStreamTemplate` under `cloudWatchLogs`. I moved the configuration to `cloudWatchLogs`, which matches the published chart templates and Fluent Bit documentation.
- The Helm release did not explicitly set the service account name even though the IRSA trust policy depended on a specific subject. I added `serviceAccount.name: aws-for-fluent-bit` so the chart configuration and IAM policy align.
- The post pre-created CloudWatch log groups but did not enforce resource ordering. I added dependencies so the EKS control plane log group exists before enabling control plane logs, and so the pod log groups exist before deploying Fluent Bit. This avoids race conditions where AWS or Fluent Bit could create the log groups first with default settings.
- The prerequisites implied any existing EKS cluster would work unchanged. Because the post updates an `aws_eks_cluster` resource directly, the cluster must already be managed by OpenTofu or imported into state. I corrected the prerequisite and also noted the IRSA OIDC provider requirement.

## Review Notes
- The pinned `aws-for-fluent-bit` chart version `0.1.32` is still published and valid, but it is not the latest chart version in the AWS EKS chart index as of April 30, 2026. The post is accurate for the pinned version after the fixes above.
- `CloudWatchAgentServerPolicy` is technically valid for this setup, but it is broader than a least-privilege policy that only grants the CloudWatch Logs actions Fluent Bit needs.
