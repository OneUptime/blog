# Validation Summary: How to Configure EKS Cluster Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes
- AWS CLI
- eksctl
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- Fluent Bit
- AWS for Fluent Bit
- IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Amazon EKS control plane logging documentation: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- Amazon EKS LogSetup API reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_LogSetup.html
- eksctl CloudWatch cluster logging documentation: https://docs.aws.amazon.com/eks/latest/eksctl/cloudwatch-cluster-logging.html
- eksctl IAM Roles for Service Accounts documentation: https://eksctl.io/usage/iamserviceaccounts/
- Amazon CloudWatch Fluent Bit DaemonSet setup documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-logs-FluentBit.html
- AWS CloudWatch Container Insights Fluent Bit manifest: https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/fluent-bit/fluent-bit.yaml
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit CloudWatch Logs output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch
- CloudWatch Logs Insights query syntax documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- CloudWatch Logs discovered fields documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- AWS for Fluent Bit image documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/firelens-using-fluentbit.html

## Issues Found
- The IRSA setup assumed the EKS IAM OIDC provider already existed. Added the documented `eksctl utils associate-iam-oidc-provider` prerequisite command and included `--region` for consistency with the rest of the AWS examples.
- The namespace was created after the `eksctl create iamserviceaccount` command. Reordered the instructions so the namespace is created before the service account setup.
- The Fluent Bit tail input used `Parser docker`, which is insufficient for modern EKS nodes that commonly use containerd and CRI-formatted logs. Replaced it with `multiline.parser docker, cri`, matching AWS's current Fluent Bit manifest pattern.
- The Fluent Bit DaemonSet used the Kubernetes metadata filter but did not include RBAC permissions for the service account to read Kubernetes resources. Added a `ClusterRole` and `ClusterRoleBinding` with the permissions used by AWS's published Fluent Bit manifest.
- The Fluent Bit image tag was an older AWS for Fluent Bit 2.x release. Updated the example to `public.ecr.aws/aws-observability/aws-for-fluent-bit:3.0.1`, matching the current AWS-published manifest checked during validation.

## Review Notes
- The EKS control plane log types, AWS CLI logging configuration, eksctl `cloudWatch.clusterLogging.enableTypes` configuration, CloudWatch log group name for control plane logs, Logs Insights query syntax, and CloudWatch retention/export commands are technically correct.
- The manual Fluent Bit example is intentionally narrower than AWS's full Container Insights manifest. For production use, the AWS-managed CloudWatch Observability EKS add-on or the full AWS Fluent Bit manifest provides more complete host, dataplane, and operational logging configuration.
