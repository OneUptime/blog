# Validation Summary: How to Integrate CloudWatch Alarms with Slack

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Amazon CloudWatch alarms
- Amazon SNS
- AWS Lambda
- Amazon Q Developer in chat applications / AWS Chatbot
- AWS CLI
- AWS CloudFormation
- Slack incoming webhooks
- Python 3.12

## Sources Consulted
- AWS CLI Command Reference: `chatbot create-slack-channel-configuration` - https://docs.aws.amazon.com/cli/latest/reference/chatbot/create-slack-channel-configuration.html
- Amazon Q Developer in chat applications rename summary - https://docs.aws.amazon.com/chatbot/latest/adminguide/service-rename.html
- Amazon Q Developer in chat applications Slack setup - https://docs.aws.amazon.com/chatbot/latest/adminguide/slack-setup.html
- IAM policies for Amazon Q Developer in chat applications - https://docs.aws.amazon.com/chatbot/latest/adminguide/chatbot-iam-policies.html
- Amazon SNS HTTP/HTTPS subscription confirmation - https://docs.aws.amazon.com/sns/latest/dg/http-subscription-confirmation-json.html
- AWS Lambda Python runtime documentation - https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Lambda Python .zip package documentation - https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- AWS CloudFormation `AWS::Lambda::Function` Code property - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html
- Slack incoming webhooks documentation - https://api.slack.com/messaging/webhooks
- Slack Block Kit blocks reference - https://api.slack.com/reference/block-kit/blocks

## Issues Found
- The post referred to AWS Chatbot as the current product name. AWS renamed AWS Chatbot to Amazon Q Developer in chat applications on February 19, 2025, while keeping APIs, endpoints, IAM permissions, and the AWS CLI `chatbot` namespace unchanged. Updated the managed-service section to use the current name and note the unchanged CLI namespace.
- The `aws chatbot create-slack-channel-configuration` example used `--slack-workspace-id`, but the current AWS CLI option is `--slack-team-id`. Updated the command and surrounding explanation.
- The IAM trust policy was shown as a `json` block with a `//` comment inside it, which would make `file://chatbot-trust.json` invalid JSON. Moved that explanation into prose and left the fenced block as valid JSON.
- The IAM example attached `arn:aws:iam::aws:policy/AWSChatbotNotificationsOnly`, but the notification-only policy is documented as a customer managed policy surfaced by the console, not that AWS managed policy ARN. Changed the CLI example to attach the AWS managed `CloudWatchReadOnlyAccess` policy, which AWS documents as usable for CloudWatch alarm notification support.
- The direct SNS-to-Slack webhook method was technically incorrect. SNS HTTPS endpoints must confirm a subscription before receiving notifications, and Slack incoming webhooks cannot follow the SNS `SubscribeURL` confirmation flow. Updated the section to explain that the direct subscription remains pending and to recommend Amazon Q Developer in chat applications or Lambda instead.
- The Lambda examples used `urllib3`, which is not part of Python's standard library and should not be assumed as an application dependency in Lambda examples. Replaced it with `urllib.request` from the Python standard library in both the standalone Lambda function and the inline CloudFormation example.

## Review Notes
- The standalone Python Lambda snippet was parsed with Python's `ast` module after editing.
- The CloudFormation example remains intentionally minimal and does not include production hardening such as request timeouts, retry handling, or moving the Lambda code to S3.
