# Validation Summary: How to Handle Provider Rate Limits in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- HCL provider configuration
- AWS provider and AWS service quotas
- GitHub provider and GitHub REST API rate limits
- Datadog provider and Datadog API rate limits
- Shell commands for scheduling and debugging

## Sources Consulted
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu environment variables docs: https://opentofu.org/docs/cli/config/environment-variables/
- AWS provider docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- AWS IAM and STS quotas: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- Amazon EC2 API throttling: https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-throttling.html
- Amazon CloudWatch service quotas: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_limits.html
- GitHub provider docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/index.html.markdown
- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Datadog provider docs: https://registry.terraform.io/providers/datadog/datadog/latest/docs
- Datadog API rate limits: https://docs.datadoghq.com/api/latest/rate-limits/

## Issues Found
- The AWS quota examples included incorrect or unsupported values. I replaced them with documented STS, EC2, and CloudWatch examples, including correcting `PutMetricAlarm` to `3` requests per second.
- The AWS credentials comment said environment variables avoid extra API calls. I changed this to the documented claim that credentials can also be supplied via environment variables.
- The GitHub section implied GitHub App tokens simply have higher limits. I corrected this to match GitHub's documented behavior: installation tokens start at `5,000` requests per hour and only scale higher in specific cases.
- The post recommended routine `tofu apply -target=...` usage for batching repository changes. OpenTofu documents `-target` as an exceptional-circumstances feature, so I changed the guidance to splitting work into separate configurations or runs.
- The Datadog section claimed a fixed `~3,000 API requests/hour` limit. Datadog documents endpoint-specific rate limits surfaced in `X-RateLimit-*` headers, so I replaced the fixed number with that behavior.
- The off-peak scheduling command passed `-auto-approve` together with a saved plan file. OpenTofu ignores `-auto-approve` in saved plan mode, so I removed it.
- The data-source section described `locals` as caching provider calls. I revised the wording to the accurate claim that a shared lookup result can be reused across resources, and made the summary consistent with that change.
- I adjusted a variable name in the inline IAM policy example (`statement` instead of `arn`) so the example matches the JSON structure being built.

## Review Notes
- The post is technically relevant and remains a valid guide after correction.
- Provider and service rate limits are operation-specific and can change over time, so the concrete AWS and Datadog examples should be rechecked periodically against official docs.
- The review environment did not have the `tofu` binary installed, so CLI verification was performed against official OpenTofu documentation rather than local `--help` output.
