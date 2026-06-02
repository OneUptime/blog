# Validation Summary: How to Subscribe an Email Endpoint to SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS
- AWS CLI
- Boto3 / Python
- SNS email and email-json protocols
- SNS subscription filter policies
- SNS message attributes

## Sources Consulted
- AWS CLI Command Reference: `aws sns subscribe` - https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CLI Command Reference: `aws sns publish` - https://docs.aws.amazon.com/cli/latest/reference/sns/publish.html
- Amazon SNS API Reference: `ConfirmSubscription` - https://docs.aws.amazon.com/sns/latest/api/API_ConfirmSubscription.html
- Boto3 SNS client `subscribe` documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/subscribe.html
- Amazon SNS email subscription setup and management - https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html
- Amazon SNS subscription filter policies - https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Applying a subscription filter policy in Amazon SNS - https://docs.aws.amazon.com/sns/latest/dg/message-filtering-apply.html
- Amazon SNS message attributes - https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- Amazon SNS `Publish` API Reference - https://docs.aws.amazon.com/sns/latest/api/API_Publish.html

## Issues Found
- The post stated that there is no way around clicking the confirmation link and that email subscription confirmation cannot be automated. AWS requires confirmation by the endpoint owner, but the `ConfirmSubscription` API can confirm a subscription when the confirmation token is available. Updated the wording to say that the topic owner cannot bypass endpoint-owner confirmation.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI syntax was verified against current AWS CLI documentation instead of local `aws --help` output.
- Directly subscribing email endpoints is supported for standard SNS topics only.
