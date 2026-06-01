# Validation Summary: How to Use Amazon Detective for Security Investigation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Detective
- AWS CLI
- Boto3 for Python
- Amazon GuardDuty
- AWS Security Hub
- Amazon EKS audit logs
- Amazon VPC Flow Logs
- Amazon EventBridge
- AWS Lambda
- Amazon SNS

## Sources Consulted
- Amazon Detective User Guide: Source data used in a Detective behavior graph: https://docs.aws.amazon.com/detective/latest/userguide/detective-source-data-about.html
- Amazon Detective User Guide: Training period for new Detective behavior graphs: https://docs.aws.amazon.com/detective/latest/userguide/detective-data-training-period.html
- Amazon Detective User Guide: Detective Investigation: https://docs.aws.amazon.com/detective/latest/userguide/investigations-about.html
- AWS CLI Command Reference: detective create-graph: https://docs.aws.amazon.com/cli/latest/reference/detective/create-graph.html
- AWS CLI Command Reference: detective create-members: https://docs.aws.amazon.com/cli/latest/reference/detective/create-members.html
- AWS CLI Command Reference: detective accept-invitation: https://docs.aws.amazon.com/cli/latest/reference/detective/accept-invitation.html
- AWS CLI Command Reference: detective start-investigation: https://docs.aws.amazon.com/cli/latest/reference/detective/start-investigation.html
- AWS CLI Command Reference: detective get-investigation: https://docs.aws.amazon.com/cli/latest/reference/detective/get-investigation.html
- AWS CLI Command Reference: detective list-indicators: https://docs.aws.amazon.com/cli/latest/reference/detective/list-indicators.html
- AWS CLI Command Reference: detective list-investigations: https://docs.aws.amazon.com/cli/latest/reference/detective/list-investigations.html
- AWS CLI Command Reference: detective update-datasource-packages: https://docs.aws.amazon.com/cli/latest/reference/detective/update-datasource-packages.html
- AWS CLI Command Reference: events put-rule: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI Command Reference: events put-targets: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI Command Reference: lambda add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- Amazon EventBridge User Guide: Comparison operators for event patterns: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Amazon GuardDuty User Guide: IAM finding types: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html
- Amazon GuardDuty User Guide: EC2 finding types: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-ec2.html
- Amazon Detective Pricing: https://aws.amazon.com/detective/pricing/

## Issues Found
- Corrected the Detective data source description. EKS audit logs and AWS Security Hub findings are optional source packages, and GuardDuty findings are ingested for accounts enrolled in GuardDuty.
- Corrected Detective prerequisites. GuardDuty, manually stored CloudTrail logs, and manually configured VPC Flow Logs are not hard prerequisites for enabling Detective's core behavior graph.
- Replaced the VPC Flow Logs setup command in the prerequisites with the relevant `aws detective update-datasource-packages` command for optional Detective source packages.
- Fixed invalid example ARNs by using 12-digit account IDs and 32-character hexadecimal Detective graph IDs.
- Fixed invalid sample Detective investigation IDs by using the documented 21-digit ID format.
- Corrected Python and CLI examples for Detective Investigation. `StartInvestigation` supports IAM users and IAM roles, not EC2 instance IDs or arbitrary GuardDuty finding IDs.
- Updated the programmatic investigation examples to start an investigation before calling `list_indicators`.
- Reworked the finding groups example to use `list_indicators` with `RELATED_FINDING_GROUP` instead of listing investigations as if they were finding groups.
- Reworked the VPC/network indicator code sample so it does not imply that `list_indicators` analyzes an EC2 instance directly.
- Fixed the Lambda triage example to derive an IAM user ARN from GuardDuty access key details before starting a Detective investigation.
- Fixed the SNS ARN account ID in the Lambda example.
- Added the required Lambda resource-based permission so the EventBridge rule can invoke the Lambda target.
- Replaced a broad monthly cost estimate with a pricing guidance note, since Detective costs depend on ingested data volume and Region.

## Review Notes
- The AWS CLI is not installed in this workspace, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
- Python code blocks were syntax-checked with `python3` AST parsing.
