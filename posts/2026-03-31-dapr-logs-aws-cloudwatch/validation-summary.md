# Validation Summary: How to Send Dapr Logs to AWS CloudWatch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar logging, JSON log format, annotations)
- AWS CloudWatch Logs (log groups, log streams, Logs Insights queries)
- AWS CloudWatch Alarms (metric filters, SNS notifications)
- Amazon EKS (add-ons, Container Insights)
- Fluent Bit (tail input, kubernetes filter, cloudwatch_logs output plugin)
- AWS IAM (policy for CloudWatch Logs permissions)

## Sources Consulted
- AWS EKS add-on documentation for `amazon-cloudwatch-observability`
- Fluent Bit `cloudwatch_logs` output plugin documentation (plugin name, `log_stream_template`, `log_stream_prefix`, `auto_create_group`)
- Fluent Bit `tail` input plugin documentation (Parser options for container runtimes)
- Kubernetes containerd/CRI log format (CRI replaced Docker as default runtime in Kubernetes 1.24+)
- AWS IAM policy resource ARN format for CloudWatch Logs (log groups and log streams)
- AWS CloudWatch Logs Insights query syntax (`fields`, `filter`, `stats`, `like /regex/`)
- AWS CloudWatch `put-metric-filter` JSON filter pattern syntax (`{ $.field = "value" }`)
- AWS SNS ARN format (12-digit account ID requirement)
- Dapr JSON log schema (`app_id`, `level`, `msg`, `time`, `ver`, `instance`, `scope`)

## Issues Found

1. **Fluent Bit parser set to `docker` instead of `cri`**: The `[INPUT]` section used `Parser docker`, but Amazon EKS has defaulted to containerd since Kubernetes 1.24 (2022). Containerd produces logs in CRI format, not Docker JSON format. Changed `Parser docker` to `Parser cri`.

2. **IAM policy resource ARN missing log stream scope**: The resource was `arn:aws:logs:us-east-1:*:log-group:/eks/dapr/*` which only covers log group resources. Operations like `CreateLogStream`, `PutLogEvents`, and `DescribeLogStreams` act on log stream sub-resources, which require the ARN to include `:*` suffix. Changed to `arn:aws:logs:us-east-1:*:log-group:/eks/dapr/*:*`.

3. **SNS ARN used 9-digit placeholder account ID**: The alarm action ARN `arn:aws:sns:us-east-1:123456789:dapr-alerts` used a 9-digit account ID. AWS account IDs are always exactly 12 digits. Changed to `arn:aws:sns:us-east-1:123456789012:dapr-alerts`.

## Review Notes
- The Fluent Bit configuration uses both `log_stream_prefix` and `log_stream_template`. This is valid -- `log_stream_prefix` serves as a fallback when the template variables cannot be resolved.
- The IAM policy uses `*` for the account ID field, which is functional but less restrictive than specifying the actual account ID. Acceptable for a tutorial context.
- The CloudWatch Logs Insights queries correctly reference Dapr's JSON log field names (`app_id`, `level`, `msg`), which are the standard field names in Dapr's structured log output.
