# Validation Summary: How to Configure CloudWatch Cross-Account Observability with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudWatch
- AWS Observability Access Manager (OAM)
- AWS IAM
- Amazon Data Firehose
- CloudWatch Metric Streams

## Sources Consulted
- AWS CloudWatch cross-account observability: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html
- AWS setup guide for linking monitoring and source accounts: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account-Setup.html
- AWS comparison of cross-account monitoring methods: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Cross-Account-Methods.html
- AWS CLI `put-sink-policy` reference: https://docs.aws.amazon.com/cli/latest/reference/oam/put-sink-policy.html
- AWS CloudWatch metric streams overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Streams.html
- AWS custom metric stream setup with Firehose: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-setup-datalake.html
- AWS trust policy guidance for CloudWatch metric streams and Firehose: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-trustpolicy.html
- Terraform Registry `aws_oam_link`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/oam_link
- Terraform Registry `aws_oam_sink_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/oam_sink_policy
- Terraform Registry `aws_cloudwatch_metric_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_stream
- OpenTofu `init` command docs: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The introduction said cross-account observability lets the monitoring account view alarms from source accounts. I changed this to say the monitoring account can create alarms based on shared source-account metrics, which matches AWS documentation more closely.
- The post did not mention that CloudWatch cross-account observability is scoped to a single Region. I updated the introduction, prerequisites, Step 2 note, and conclusion to make the same-Region requirement explicit.
- The `aws_oam_sink_policy` example used `ForAllValues:StringEquals` as an unquoted HCL key inside `jsonencode`, which is invalid HCL syntax. I quoted the key.
- The sink policy example used `aws_oam_sink.monitoring.id` for `sink_identifier`. I changed it to `aws_oam_sink.monitoring.arn` to match the AWS provider documentation for `aws_oam_sink_policy`.
- The prerequisites implied AWS Organizations permissions were always required. I corrected this to note that Organizations permissions are only needed when onboarding accounts by organization rather than by explicit account ID.
- Step 3 was labeled as a cross-account alarm and a legacy method, but the code actually defined a CloudWatch metric stream. I retitled and reframed the section as an optional metric-stream export step.
- Step 3 also implied that a metric stream in a source account could write to a Firehose delivery stream in the monitoring account. AWS requires the Firehose delivery stream to be in the same account and Region as the metric stream, so I moved the example to the monitoring account and added `include_linked_accounts_metrics = true`.

## Review Notes
- The local review environment did not have the `tofu` binary installed, so the `tofu init` and `tofu apply` commands were validated against the official OpenTofu CLI documentation instead of local `--help` output.
- The post intentionally scopes the OAM examples to metrics, logs, and traces. AWS currently supports additional shareable resource types in some contexts, but the reduced example set is still technically valid.
