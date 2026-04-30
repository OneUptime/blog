# Validation Summary: How to Deploy Fluent Bit Log Collection with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- Fluent Bit
- Helm
- Kubernetes
- Amazon EKS
- AWS IAM Roles for Service Accounts (IRSA)
- Amazon CloudWatch Logs
- Amazon S3

## Sources Consulted
- Fluent Bit Helm chart README: https://github.com/fluent/helm-charts/blob/main/charts/fluent-bit/README.md
- Fluent Bit Helm chart values: https://github.com/fluent/helm-charts/blob/main/charts/fluent-bit/values.yaml
- Fluent Bit project README: https://github.com/fluent/fluent-bit
- Fluent Bit Tail input docs: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit Kubernetes filter docs: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit CloudWatch output docs: https://docs.fluentbit.io/manual/data-pipeline/outputs/cloudwatch
- Fluent Bit S3 output docs: https://docs.fluentbit.io/manual/data-pipeline/outputs/s3
- Fluent Bit Rewrite Tag filter docs: https://docs.fluentbit.io/manual/data-pipeline/filters/rewrite-tag
- Fluent Bit Record Modifier filter docs: https://docs.fluentbit.io/manual/data-pipeline/filters/record-modifier
- Amazon EKS IRSA docs: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- CloudWatchAgentServerPolicy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html

## Issues Found
- The introduction claimed Fluent Bit uses "under 1MB" of memory. The current official project documentation describes Fluent Bit as lightweight with a minimal memory footprint, but does not support that exact number, so the claim was softened.
- The Helm chart version was pinned to `0.43.0`, which is outdated relative to the current official chart release. It was updated to `0.57.3`.
- The toleration comment said the DaemonSet would run on "ALL nodes including control plane". That is misleading for EKS, where the control plane is AWS-managed and not schedulable. The comment was corrected to describe tainted schedulable nodes instead.
- The IAM role example referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. The missing data source was added so the HCL is valid.
- The multi-output example used a standalone `kubernetes_config_map` that was not wired into the Fluent Bit Helm chart, so it would not affect the deployment as written. It was replaced with a complete `helm_release` example that uses the chart's supported `values` configuration.
- The multi-output example referenced `aws_s3_bucket.logs.id` without defining that resource. It was changed to `var.logs_bucket_name` to make the snippet self-consistent.
- The S3 output example set `use_put_object On` but omitted `$UUID` from `s3_key_format`. Fluent Bit's S3 output documentation requires a unique random component for `PutObject` mode, so `$UUID` was added.
- The post introduced S3 output configuration without corresponding IRSA permissions. An inline IAM policy granting `s3:PutObject` to the configured log bucket was added.
- The namespace-routing example also used a standalone `kubernetes_config_map` that was not connected to the Helm chart, and it only retagged records without showing matching outputs. It was replaced with a complete `helm_release` example that includes both routing filters and matching CloudWatch outputs.
- The `rewrite_tag` rules used unanchored namespace regex values. They were tightened to `^production$` and `^staging$` so the example matches the named namespaces exactly.
- The conclusion said namespace routing sends logs to different destinations, but the example only showed retagging. The wording was corrected to match the revised routing example.

## Review Notes
- The chart repository URL in the post remains valid, although the official chart README now recommends OCI-based installation for Helm CLI usage. The `helm_release` examples here remain compatible with the published chart repository.
- The version pin `0.57.3` was current in the official Fluent Bit chart documentation on April 30, 2026 and should be revalidated if the post is updated later.
