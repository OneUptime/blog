# Validation Summary: How to Deploy AWS CloudWatch Agent with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Amazon CloudWatch Container Insights
- CloudWatch Agent
- Fluent Bit / AWS for Fluent Bit
- Flux Kustomization
- Kubernetes DaemonSet, ServiceAccount, RBAC, ConfigMap, Namespace
- AWS IAM and IRSA
- AWS CLI
- Kustomize

## Sources Consulted
- AWS CloudWatch: Quick Start setup for Container Insights on Amazon EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-EKS-quickstart.html
- AWS CloudWatch: Setting up the CloudWatch agent to collect cluster metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-metrics.html
- AWS CloudWatch: Send logs to CloudWatch Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-EKS-logs.html
- AWS sample manifests for CloudWatch Container Insights: https://github.com/aws-samples/amazon-cloudwatch-container-insights
- Amazon EKS: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Fluent Bit official CloudWatch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/cloudwatch
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- AWS CLI IAM command references: https://docs.aws.amazon.com/cli/latest/reference/iam/

## Issues Found
- The post said Container Insights collects traces. The reviewed deployment only configures Container Insights metrics and Fluent Bit logs, and the AWS Container Insights EKS docs describe this path as metrics and logs collection. Removed the trace claim.
- The IAM trust policy allowed only `system:serviceaccount:amazon-cloudwatch:cloudwatch-agent`, but the Fluent Bit service account was also annotated with the same role. Updated the trust policy to allow both `cloudwatch-agent` and `fluent-bit`.
- The IAM policy included X-Ray permissions even though the post does not configure trace collection. Removed the unused X-Ray actions to keep the policy aligned with the deployment.
- The service account manifest omitted required Kubernetes RBAC for the CloudWatch Agent and Fluent Bit. Added ClusterRole and ClusterRoleBinding resources based on AWS's current Container Insights manifests and Kubernetes RBAC requirements.
- The CloudWatch Agent ConfigMap used an outdated/nonstandard shape with a duplicate Kubernetes collector under `metrics.metrics_collected`. Updated it to the current Container Insights config shape under `logs.metrics_collected.kubernetes` and enabled `enhanced_container_insights`.
- The CloudWatch Agent ConfigMap name did not match the name used by AWS's current DaemonSet examples. Renamed it to `cwagentconfig` and updated the volume reference.
- The CloudWatch Agent and AWS for Fluent Bit image tags were older than AWS's current sample manifests. Updated them to `public.ecr.aws/cloudwatch-agent/cloudwatch-agent:1.300064.0b1337` and `public.ecr.aws/aws-observability/aws-for-fluent-bit:3.0.1`.
- The DaemonSets did not restrict scheduling to Linux nodes. Added `nodeSelector: kubernetes.io/os: linux`, matching AWS's current manifests for these Linux container images.
- The post tags included Helm even though no Helm workflow or Helm resources are used. Removed the inaccurate tag.

## Review Notes
AWS currently recommends the Amazon CloudWatch Observability EKS add-on for new EKS Container Insights installations. The Flux-managed DaemonSet approach remains technically valid, but future revisions could mention the add-on as AWS's preferred path.
