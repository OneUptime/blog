# Validation Summary: How to Use WAF Web ACL Logging for Security Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS WAF / WAFv2 Web ACL logging
- Amazon CloudWatch Logs and CloudWatch Logs Insights
- Amazon S3
- Amazon Data Firehose
- AWS CLI
- Terraform AWS provider
- AWS CloudFormation / CloudWatch dashboards
- CloudWatch metric filters and alarms

## Sources Consulted
- AWS WAF Developer Guide: Logging destinations: https://docs.aws.amazon.com/waf/latest/developerguide/logging-destinations.html
- AWS WAF Developer Guide: Sending web ACL traffic logs to CloudWatch Logs: https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
- AWS WAF Developer Guide: Log fields for web ACL traffic: https://docs.aws.amazon.com/waf/latest/developerguide/logging-fields.html
- AWS CLI Command Reference: `wafv2 put-logging-configuration`: https://docs.aws.amazon.com/cli/latest/reference/wafv2/put-logging-configuration.html
- AWS CLI Command Reference: `logs describe-log-groups`: https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-groups.html
- AWS CloudWatch API Reference: Dashboard body structure and log widgets: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudWatch Logs User Guide: Logs Insights query syntax and `SOURCE`: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- AWS CloudWatch Logs User Guide: Filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Terraform AWS provider documentation: `aws_wafv2_web_acl_logging_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_logging_configuration

## Issues Found
- The AWS CLI example used `logGroups[0].arn` from `describe-log-groups`. Current AWS CLI documentation distinguishes this value from `logGroupArn`; `arn` includes a trailing `:*`, while WAF expects the log group ARN format without the wildcard. Changed the query to `logGroups[0].logGroupArn`.
- The destination section said teams could "add S3 as a secondary destination later." AWS WAF logging configurations allow one logging destination per web ACL, so this was changed to say teams can switch to S3 later.
- The post used the older "Kinesis Data Firehose" naming and referenced Elasticsearch. Updated this to "Amazon Data Firehose" and "Amazon OpenSearch Service" to match current AWS service naming.
- The introduction described WAF logs as "full" request visibility/details. AWS WAF logs provide detailed request metadata and selected request components, not necessarily the full request body, so the wording was tightened.
- The filtered logging best-practice note mentioned only BLOCK and COUNT actions. Current WAF logging filters also support CAPTCHA, CHALLENGE, and EXCLUDED_AS_COUNT action conditions, so the note now includes CAPTCHA and CHALLENGE where teams use them.

## Review Notes
The examples otherwise align with current AWS WAF logging concepts: CloudWatch log group names must start with `aws-waf-logs-`, WAF supports CloudWatch Logs, S3, and Firehose destinations, redacted fields support headers and query components, and the CloudWatch Logs Insights queries use documented WAF log fields such as `action`, `terminatingRuleId`, `httpRequest.clientIp`, `httpRequest.uri`, `httpRequest.args`, and `httpRequest.country`. The local AWS CLI was not installed in the workspace, so command validation was performed against official AWS command reference documentation rather than local `--help` output.
