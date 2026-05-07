# Validation Summary: How to Configure AWS WAF with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI and HCL
- AWS WAF v2
- AWS Managed Rules
- AWS provider for OpenTofu/Terraform
- Amazon CloudWatch metrics
- Amazon Kinesis Data Firehose

## Sources Consulted
- OpenTofu `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS WAF logging destinations: https://docs.aws.amazon.com/waf/latest/developerguide/logging-destinations.html
- AWS WAF `LoggingConfiguration` API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_LoggingConfiguration.html
- AWS WAF `LoggingFilter` API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_LoggingFilter.html
- AWS WAF metrics and dimensions: https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- AWS WAF resource association guidance: https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html
- AWS Managed Rules rule groups list: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
- AWS Managed Rules baseline rule groups: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html
- AWS Managed Rules use-case rule groups: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html
- AWS WAF rate-based rule settings: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS CLI `cloudwatch get-metric-statistics`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS provider `aws_wafv2_web_acl` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown
- AWS provider `aws_wafv2_web_acl_association` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_association.html.markdown
- AWS provider `aws_wafv2_web_acl_logging_configuration` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_logging_configuration.html.markdown

## Issues Found
- Step 2 incorrectly created a second `aws_wafv2_web_acl` resource with the same name instead of adding a rate-limit rule to the existing Web ACL. I changed it to a nested `rule` block and explicitly noted that it belongs inside `aws_wafv2_web_acl.main`.
- The logging example claimed to log all requests while its `logging_filter` actually dropped all `ALLOW` actions, and the “health check” comment was inaccurate because AWS WAF logging filters match actions and labels, not generic health checks by themselves. I removed the incorrect filter and documented the default logging behavior.
- The description and introduction claimed bot-traffic protection, but the post did not configure `AWSManagedRulesBotControlRuleSet`, which is the AWS managed rule group used for Bot Control. I removed the unsupported bot-traffic claim.
- The Web ACL example implied that changing `scope` to `CLOUDFRONT` was sufficient. I added the required `us-east-1` provider caveat for CloudFront-scoped Web ACLs.
- The logging example omitted the AWS WAF log-destination naming requirement. I added the note that the Firehose stream name must start with `aws-waf-logs-`.
- The CloudWatch metrics example did not specify the AWS CLI region and used timestamps without an explicit UTC suffix. I added `--region us-east-1`, clarified that the example is for a regional Web ACL, and changed the timestamps to explicit UTC `Z` format.
- The conclusion described count mode as if every rule used `override_action`, which is not true for custom rules. I clarified that managed rule groups use `override_action { count {} }`, while custom rules such as the rate limit rule use `action { count {} }`.

## Review Notes
- Step 3 is technically correct for an Application Load Balancer. For CloudFront, the AWS provider documentation says to associate the web ACL through the CloudFront distribution’s `web_acl_id` instead of `aws_wafv2_web_acl_association`.
- The `date -u -d ...` syntax in the CLI example is valid on GNU/Linux systems but is not portable to macOS/BSD shells without adjustment.
- I could not run local `tofu` or `aws` CLI validation in this workspace because neither binary is installed.
