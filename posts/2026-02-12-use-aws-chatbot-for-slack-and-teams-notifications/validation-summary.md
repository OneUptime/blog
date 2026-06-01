# Validation Summary: How to Use AWS Chatbot for Slack and Teams Notifications

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- AWS Chatbot / Amazon Q Developer in chat applications
- AWS CLI
- Amazon SNS
- Amazon CloudWatch alarms
- IAM roles and policies
- Slack
- Microsoft Teams
- Python boto3

## Sources Consulted
- AWS CLI Command Reference: create-slack-channel-configuration: https://docs.aws.amazon.com/cli/latest/reference/chatbot/create-slack-channel-configuration.html
- AWS CLI Command Reference: create-microsoft-teams-channel-configuration: https://docs.aws.amazon.com/cli/latest/reference/chatbot/create-microsoft-teams-channel-configuration.html
- Amazon Q Developer in chat applications rename summary: https://docs.aws.amazon.com/chatbot/latest/adminguide/service-rename.html
- Amazon Q Developer in chat applications Slack setup guide: https://docs.aws.amazon.com/chatbot/latest/adminguide/slack-setup.html
- Amazon Q Developer in chat applications Teams setup guide: https://docs.aws.amazon.com/chatbot/latest/adminguide/teams-setup.html
- Amazon Q Developer in chat applications IAM policies: https://docs.aws.amazon.com/chatbot/latest/adminguide/chatbot-iam-policies.html
- Amazon Q Developer in chat applications custom notifications: https://docs.aws.amazon.com/chatbot/latest/adminguide/custom-notifs.html
- Amazon Q Developer in chat applications CLI commands from chat: https://docs.aws.amazon.com/chatbot/latest/adminguide/chatbot-cli-commands.html
- Amazon SNS subscription filter policy documentation: https://docs.aws.amazon.com/sns/latest/dg/message-filtering-apply.html
- Amazon CloudWatch alarm notification documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html
- AWS CLI Command Reference: put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The Slack channel configuration examples used `--slack-workspace-id`, but the AWS CLI command uses `--slack-team-id`. Updated all Slack CLI examples and the accompanying field description.
- Sample ARNs used a 9-digit account ID. Updated them to a valid 12-digit placeholder account ID (`123456789012`).
- The post used pre-rename `@aws` chat mentions. Updated the command examples to use `@Amazon Q`, which AWS documents as the current mention after the AWS Chatbot rename.
- The SNS filtering example manually subscribed to an internal-looking Chatbot HTTPS endpoint and filtered on `AlarmState`. Replaced it with `set-subscription-attributes` on the existing Chatbot-created subscription ARN, using payload-based filtering on CloudWatch alarm `NewStateValue`.
- The IAM setup labeled `AWSResourceExplorerReadOnlyAccess` as the managed policy for Chatbot notification use. Removed that attachment and kept `CloudWatchReadOnlyAccess`, which AWS documents as sufficient for notification-only CloudWatch alarm functionality.
- Updated current naming in setup text from AWS Chatbot app/console to Amazon Q Developer in chat applications where the current AWS documentation uses the renamed service.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI command reference rather than local `--help` output. The AWS CLI namespace remains `aws chatbot` even though the user-facing service name is now Amazon Q Developer in chat applications.
