# How to Fix SNS 'Authorization Error' for Subscriptions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SNS, IAM, Troubleshooting

Description: Learn how to diagnose and fix Authorization Error messages when creating or managing SNS subscriptions in AWS, including IAM policy fixes and cross-account configurations.

---

If you've ever tried to subscribe a Lambda function, SQS queue, or HTTP endpoint to an SNS topic and been greeted with an `AuthorizationError`, you know the frustration. The error message is usually vague, and tracking down which permission is missing can eat up hours. Let's walk through the most common causes and their fixes.

## Understanding the Error

When you see something like this:

```
An error occurred (AuthorizationError) when calling the Subscribe operation:
User: arn:aws:iam::123456789012:user/myuser is not authorized to perform: SNS:Subscribe on resource: arn:aws:sns:us-east-1:123456789012:my-topic
```

It means the IAM principal making the request doesn't have the right permissions. But the root cause can vary depending on whether you're working within a single account or across accounts.

## Cause 1: Missing IAM Policy

The most straightforward reason is that the IAM user or role simply doesn't have `sns:Subscribe` permission. Here's a policy that grants the necessary permissions for subscribing to an SNS topic.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:ListSubscriptionsByTopic"
      ],
      "Resource": "arn:aws:sns:us-east-1:123456789012:my-topic"
    }
  ]
}
```

Attach this to the IAM user, group, or role that needs to create subscriptions. If you want to be more permissive during development, you can use a wildcard for the resource, but tighten it up before going to production.

## Cause 2: SNS Topic Policy Restrictions

Even if your IAM policy is correct, the SNS topic itself has a resource-based policy that can block subscriptions. This is especially common when you're working with topics created by other teams or automated processes.

Check the topic's access policy with the AWS CLI.

```bash
# Retrieve the SNS topic attributes, including its access policy
aws sns get-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --query 'Attributes.Policy' \
  --output text | python3 -m json.tool
```

The policy needs to allow the `SNS:Subscribe` action for your principal. Here's what a permissive topic policy looks like.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSubscriptions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "SNS:Subscribe",
      "Resource": "arn:aws:sns:us-east-1:123456789012:my-topic"
    }
  ]
}
```

You can update the topic policy using the `set-topic-attributes` command.

```bash
# Update the SNS topic policy to allow subscriptions
aws sns set-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-topic \
  --attribute-name Policy \
  --attribute-value file://topic-policy.json
```

## Cause 3: Cross-Account Subscription Issues

Cross-account SNS subscriptions are one of the biggest sources of authorization errors. When account A owns the topic and account B wants to subscribe, both sides need to grant permissions.

On the topic owner's side (Account A), the topic policy needs to allow the subscriber's account.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountSubscribe",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::987654321098:root"
      },
      "Action": "SNS:Subscribe",
      "Resource": "arn:aws:sns:us-east-1:123456789012:my-topic",
      "Condition": {
        "StringEquals": {
          "sns:Protocol": "sqs"
        }
      }
    }
  ]
}
```

On the subscriber's side (Account B), the IAM policy needs to allow subscribing to the remote topic, and the receiving resource (like an SQS queue) needs its own resource policy.

Here's the SQS queue policy for receiving messages from the SNS topic.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSNSMessages",
      "Effect": "Allow",
      "Principal": {
        "Service": "sns.amazonaws.com"
      },
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:us-east-1:987654321098:my-queue",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "arn:aws:sns:us-east-1:123456789012:my-topic"
        }
      }
    }
  ]
}
```

## Cause 4: KMS Encryption on the Topic

If your SNS topic uses server-side encryption with a KMS key, the subscriber needs `kms:Decrypt` and `kms:GenerateDataKey` permissions on that key. This one catches people off guard because the error message doesn't always mention KMS.

Add these KMS permissions to the subscriber's IAM policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey*"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id"
    }
  ]
}
```

## Cause 5: SCP or Permission Boundaries

If you're running in an AWS Organization, Service Control Policies (SCPs) can silently block actions even when IAM policies allow them. Similarly, permission boundaries on IAM entities act as a ceiling for what the entity can do.

Check for SCPs at the OU level and permission boundaries on the role or user.

```bash
# Check if the IAM user has a permissions boundary
aws iam get-user --user-name myuser \
  --query 'User.PermissionsBoundary'

# List SCPs attached to the account's organizational unit
aws organizations list-policies-for-target \
  --target-id ou-xxxx-xxxxxxxx \
  --filter SERVICE_CONTROL_POLICY
```

## Debugging with CloudTrail

When you're stuck, CloudTrail is your best friend. Look up the failed API call to get the full context of why it was denied.

```bash
# Search CloudTrail for failed SNS Subscribe calls in the last hour
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=Subscribe \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Events[?contains(CloudTrailEvent, `AccessDenied`) || contains(CloudTrailEvent, `AuthorizationError`)]'
```

The `errorCode` and `errorMessage` fields in the CloudTrail event give you much more detail than the CLI error output.

## Quick Troubleshooting Checklist

Before you start debugging, run through this list:

1. Does the IAM principal have `sns:Subscribe` permission?
2. Does the SNS topic policy allow the subscription?
3. Is this a cross-account scenario? If so, have both sides been configured?
4. Is the topic encrypted with KMS? If so, does the subscriber have KMS permissions?
5. Are there any SCPs or permission boundaries blocking the action?
6. Does the subscription protocol match any conditions in the topic policy?

Most of the time, the issue falls into one of these categories. Start from the top, and you'll usually find the problem within a few minutes.

For more on monitoring your AWS infrastructure and catching these issues early, check out how to set up proper [AWS monitoring with OneUptime](https://oneuptime.com/blog/post/2026-02-12-setup-aws-cloudshell-quick-command-line-access/view).

## Wrapping Up

SNS authorization errors are almost always about mismatched or missing permissions across IAM policies, resource policies, or KMS key policies. The trickiest cases involve cross-account setups where you need to coordinate permissions on both sides. Once you understand the layered permission model - IAM policies, resource policies, encryption keys, and organizational policies - these errors become much easier to diagnose and fix. Keep CloudTrail handy, and you'll spend less time guessing and more time building.
