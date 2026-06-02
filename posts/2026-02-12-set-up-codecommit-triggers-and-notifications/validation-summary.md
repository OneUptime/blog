# Validation Summary: How to Set Up CodeCommit Triggers and Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodeCommit
- AWS CodeCommit repository triggers
- AWS CodeStar Notifications
- Amazon SNS
- AWS Lambda
- AWS CLI
- Python 3.12
- Slack incoming webhooks

## Sources Consulted
- AWS CLI Command Reference: put-repository-triggers - https://docs.aws.amazon.com/cli/latest/reference/codecommit/put-repository-triggers.html
- AWS CodeCommit User Guide: Manage triggers for an AWS CodeCommit repository - https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-notify.html
- AWS CodeCommit User Guide: Example Lambda trigger setup - https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-notify-lambda.html
- AWS CodeCommit User Guide: Existing Lambda trigger permissions - https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-notify-lambda-cc.html
- Developer Tools Console User Guide: Notification concepts and CodeCommit event IDs - https://docs.aws.amazon.com/dtconsole/latest/userguide/concepts.html
- AWS CodeCommit User Guide: Create a notification rule - https://docs.aws.amazon.com/codecommit/latest/userguide/notification-rule-create.html
- Developer Tools Console User Guide: Configure Amazon SNS topics for notifications - https://docs.aws.amazon.com/dtconsole/latest/userguide/set-up-sns.html
- AWS Lambda Developer Guide: Invoking Lambda functions with Amazon SNS notifications - https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS CLI Command Reference: sns subscribe - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CodeCommit User Guide document history - https://docs.aws.amazon.com/codecommit/latest/userguide/history.html

## Issues Found
- The first SNS example said to subscribe a Slack webhook or email while showing `--protocol email`. I changed the comment to email only because raw SNS email subscription syntax does not subscribe a Slack webhook.
- The CodeCommit Lambda sample could reference `changed_files` before assignment for commits without parents. I initialized `changed_files` before the parent check.
- The notification rule section reused a manually created SNS topic without granting AWS CodeStar Notifications permission to publish to it. I added an SNS topic policy example with the required `codestar-notifications.amazonaws.com` publish statement.
- The Slack Lambda deployment commands referenced `slack_notifier.zip` without creating it. I added the zip command.
- The SNS-to-Lambda subscription steps omitted the Lambda resource policy permission that allows SNS to invoke the function. I added the required `aws lambda add-permission` command.
- The Slack notifier Python block included triple backticks inside a fenced Markdown code block, which broke Markdown extraction and made the displayed Python snippet unparsable. I removed the embedded Slack code fence from the fallback message.

## Review Notes
AWS CodeCommit was closed to new customers in 2024 but AWS documentation shows it became available to new customers again on November 25, 2025. The tutorial is therefore not obsolete as of this validation date.
