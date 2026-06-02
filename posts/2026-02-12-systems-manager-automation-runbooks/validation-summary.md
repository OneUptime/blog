# Validation Summary: How to Use Systems Manager Automation for Runbooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Systems Manager Automation
- SSM Automation runbooks and Automation document schema
- AWS CLI for Systems Manager
- IAM roles and trust policies
- Amazon EC2
- Amazon SNS approvals
- Amazon EventBridge and CloudWatch alarm events
- Shell scripting through Systems Manager Run Command

## Sources Consulted
- AWS Systems Manager Automation overview: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-automation.html
- AWS Systems Manager runbook authoring guide: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-documents.html
- AWS Systems Manager document schema reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html
- `aws:changeInstanceState` action reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-changestate.html
- `aws:waitForAwsResourceProperty` action reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-waitForAwsResourceProperty.html
- `aws:approve` action reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-approve.html
- `aws:branch` action reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-branch.html
- `aws:runCommand` action reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-runcommand.html
- AWS CLI `create-document` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/create-document.html
- AWS CLI `start-automation-execution` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/start-automation-execution.html
- AWS CLI `list-documents` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/list-documents.html
- AWS Systems Manager Automation service role setup: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-setup-iam.html
- SSM Agent preinstalled AMI reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/ami-preinstalled-agent.html
- AWS Systems Manager Automation runbook reference: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-runbook-reference.html
- EventBridge Systems Manager Automation target guide: https://docs.aws.amazon.com/systems-manager/latest/userguide/running-automations-event-bridge.html

## Issues Found
- The post said SSM Agent is installed on "most modern AMIs." AWS documents this more narrowly as preinstalled on some AWS-provided and trusted third-party AMIs. Changed the wording to "many AWS-provided AMIs."
- The `aws:approve` example used an SNS topic named `ops-approvals`. AWS requires SNS topic names for Automation approvals to start with `Automation`. Changed the example ARN to `AutomationOpsApprovals`.
- The `aws ssm list-documents` example passed `--filters` twice. AWS CLI examples pass multiple filter structures after a single `--filters` option. Changed the command to `--filters "Key=Owner,Values=Amazon" "Key=DocumentType,Values=Automation"`.
- The IAM section said Automation "needs" an IAM role. AWS documents that Automation can use a service role, but if no IAM service role is specified for runbooks that do not use `aws:executeScript`, Automation can use the permissions of the user who started it. Changed the wording to say Automation can use a role and tied it to the example's `AutomationAssumeRole` parameter.

## Review Notes
- The main Automation YAML uses schema version `0.3`, valid Automation actions, and valid inputs for the examples shown.
- The restart runbook's final `aws:waitForAwsResourceProperty` step is technically valid but somewhat redundant because `aws:changeInstanceState` with `DesiredState: running` already waits for EC2 running state and status checks before completing.
- The IAM trust policy shown is a functional baseline, but AWS recommends adding `aws:SourceArn` and `aws:SourceAccount` condition keys to reduce confused deputy risk.
