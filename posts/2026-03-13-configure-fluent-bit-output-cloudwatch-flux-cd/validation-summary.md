# Validation Summary: How to Configure Fluent Bit Output to CloudWatch with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudWatch Logs
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- eksctl
- AWS CLI
- Fluent Bit
- Fluent Bit CloudWatch Logs output plugin
- Fluent Bit Kubernetes and rewrite_tag filters
- Fluent Bit Helm chart
- Flux CD HelmRelease, HelmRepository, and Kustomization resources
- Kubernetes DaemonSets and service accounts

## Sources Consulted
- Fluent Bit CloudWatch Logs output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/4.2/data-pipeline/filters/kubernetes
- Fluent Bit rewrite_tag filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/rewrite-tag
- Fluent Bit Helm chart repository and chart values: https://github.com/fluent/helm-charts
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomization/
- eksctl IAM service account documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- CloudWatch Logs permissions reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/permissions-reference-cwl.html
- AWS CLI describe-log-groups command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-groups.html

## Issues Found
- The `cloudwatch-policy.json` example included a JavaScript-style comment inside a `json` code block. JSON policy documents passed to `aws iam create-policy --policy-document file://...` must be valid JSON, so the filename note was moved outside the code block.
- The prerequisites listed only part of the IAM permissions used by the final policy and Fluent Bit configuration. Added `DescribeLogGroups`, `DescribeLogStreams`, and `PutRetentionPolicy` to match the documented CloudWatch plugin behavior and the policy example.
- The CloudWatch output comments described a log group per namespace, but the configured `log_group_name` is a single `/eks/${CLUSTER_NAME}/containers` group with namespace only in the log stream template. Updated the comments to match the configuration.
- The `log_format json/emf` comment described generic structured logging. Fluent Bit documents this option as enabling CloudWatch Embedded Metric Format extraction from JSON payloads, so the comment was corrected.
- The `rewrite_tag` example emitted production records as `kube.production`, which still matches `kube.*` and could be reprocessed by the same filter and matched by the catch-all output. Changed the emitted tag to `production.$TAG` and the production output match to `production.*`.

## Review Notes
- Chart version `0.46.7` maps to Fluent Bit app version `3.0.4`; the referenced values such as `serviceAccount`, `env`, `config.inputs`, `config.filters`, and `config.outputs` are present in that chart.
- The Flux API versions used in the examples are current stable APIs in the official Flux documentation.
- `log_retention_days` applies when Fluent Bit creates a new log group. Existing log groups may need retention managed separately.
