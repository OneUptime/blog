# Validation Summary: How to Create Custom AWS Config Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Config custom Lambda rules
- AWS Lambda
- AWS CLI
- Python and Boto3
- Terraform AWS provider
- IAM permissions

## Sources Consulted
- AWS Config Developer Guide: Creating AWS Config Custom Lambda Rules - https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_develop-rules_lambda-functions.html
- AWS Config Developer Guide: Example Oversized Configuration Item Change Notification - https://docs.aws.amazon.com/config/latest/developerguide/oversized-notification-example.html
- AWS Config API Reference: ConfigurationItem - https://docs.aws.amazon.com/config/latest/APIReference/API_ConfigurationItem.html
- AWS Config API Reference: PutEvaluations - https://docs.aws.amazon.com/config/latest/APIReference/API_PutEvaluations.html
- AWS CLI Command Reference: configservice put-config-rule - https://docs.aws.amazon.com/cli/latest/reference/configservice/put-config-rule.html
- AWS CLI Command Reference: configservice start-config-rules-evaluation - https://docs.aws.amazon.com/cli/latest/reference/configservice/start-config-rules-evaluation.html
- AWS CLI Command Reference: configservice get-compliance-details-by-config-rule - https://docs.aws.amazon.com/cli/latest/reference/configservice/get-compliance-details-by-config-rule.html
- AWS CLI Command Reference: lambda create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS Lambda Developer Guide: Building Lambda functions with Python - https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Terraform Registry: aws_config_config_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule

## Issues Found
- The change-triggered custom rule examples only registered `ConfigurationItemChangeNotification`. AWS documentation recommends handling `OversizedConfigurationItemChangeNotification` for configuration-change custom Lambda rules, so the CLI and Terraform source details now include the oversized notification type.
- The Lambda examples returned without handling oversized configuration items. Added a helper that retrieves the full configuration item with `get_resource_config_history` and deserializes the JSON-encoded `configuration` field.
- The Lambda examples would mark deleted or out-of-scope resources incorrectly or skip them. Added `NOT_APPLICABLE` evaluations for deleted resources and resources that left the rule scope.
- The local test event used a fake result token, which would fail without PutEvaluations test mode. Added optional `TestMode=event.get('testMode', False)` to the examples and set `"testMode": true` in the sample event.
- The periodic tag-check example used `datetime.utcnow().isoformat() + 'Z'` for an AWS timestamp field. Updated it to use a timezone-aware `datetime.now(timezone.utc)`.
- The Terraform section described the snippet as a complete module even though supporting IAM role, packaging, and caller identity resources are not included. Changed the wording to "core Terraform" to avoid overstating completeness.

## Review Notes
- Python and JSON snippets were parsed locally for syntax/format correctness.
- The AWS CLI and Terraform binaries are not installed in this workspace, so CLI and Terraform validation was performed against official command/provider documentation rather than local execution.
