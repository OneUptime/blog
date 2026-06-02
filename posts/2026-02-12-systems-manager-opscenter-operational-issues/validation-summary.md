# Validation Summary: How to Use Systems Manager OpsCenter for Operational Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Systems Manager OpsCenter
- AWS Systems Manager Explorer
- AWS Systems Manager Automation runbooks
- AWS Systems Manager OpsItems
- Amazon EventBridge
- Amazon CloudWatch alarms
- AWS Config
- Amazon SNS
- AWS CLI

## Sources Consulted
- AWS Systems Manager OpsCenter User Guide: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter.html
- Set up OpsCenter: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-setup.html
- Configure CloudWatch alarms to create OpsItems: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-create-OpsItems-from-CloudWatch-Alarms.html
- Configuring an existing CloudWatch alarm to create OpsItems programmatically: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-configuring-an-existing-alarm-programmatically.html
- Configure EventBridge rules to create OpsItems: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-automatically-create-OpsItems-2.html
- Creating OpsItems manually with AWS CLI: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-creating-OpsItems-CLI.html
- Managing duplicate OpsItems: https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-working-deduplication.html
- AWS CLI create-ops-item command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/create-ops-item.html
- AWS CLI describe-ops-items command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-ops-items.html
- AWS CLI get-ops-summary command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-ops-summary.html
- AWS Systems Manager pricing: https://aws.amazon.com/systems-manager/pricing/

## Issues Found
- The post said OpsCenter did not cost anything extra and showed an `update-service-setting` command to enable it. AWS documents OpsCenter as pay-per-use, and current integrated OpsCenter/Explorer setup is console-based, so I replaced the CLI enablement command with accurate setup and pricing wording.
- The CloudWatch alarm automation section used EventBridge as the primary path and an OpsItem target ARN without the required severity suffix. I added the documented CloudWatch `--alarm-actions` OpsItem ARN pattern and corrected the EventBridge OpsItem target ARN.
- The AWS Config section referred to adding an `ssm:ops-item` remediation action. AWS Config remediation uses Systems Manager Automation documents, while OpsItems are created from Config compliance events through EventBridge. I corrected the explanation and added the missing EventBridge target command.
- The runbook association example used a custom `RunbookName` operational data key. AWS documents `/aws/automations` as the key for associating Automation runbooks, so I changed the command to use `/aws/automations` with an `automationId` and `automationType`.
- The Explorer CLI example described enabling Explorer via CLI and used an invalid `get-ops-summary` aggregator shape. I clarified that Explorer is enabled through setup and corrected the aggregator to use `count`, `TypeName`, and `AttributeName`.
- The deduplication section said duplicate data is added to the existing OpsItem. AWS documents that a duplicate OpsItem is not created when the matching item is open or in progress; I tightened the claim to match that behavior.

## Review Notes
The guide is technically relevant and salvageable. IAM role creation and EventBridge permissions are mentioned but not fully expanded; future revisions could add the exact trust policy and permissions for `EventBridgeSSMRole`.
