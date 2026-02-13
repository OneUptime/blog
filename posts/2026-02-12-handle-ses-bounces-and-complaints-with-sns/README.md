# How to Handle SES Bounces and Complaints with SNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, SNS, Email, Monitoring

Description: Set up automated bounce and complaint handling for Amazon SES using SNS notifications to protect your sending reputation and maintain clean email lists.

---

If you're sending email through Amazon SES, handling bounces and complaints isn't optional. It's the single most important thing you can do to protect your sending reputation. Let a bounce rate creep above 5% or complaints above 0.1%, and Amazon will put your account on probation - or shut it down entirely.

The good news is that SES integrates neatly with SNS (Simple Notification Service) to give you real-time notifications when something goes wrong with a delivery. Let's set this up properly.

## Why Bounces and Complaints Matter

There are two types of bounces you'll encounter:

**Hard bounces** mean the email address doesn't exist, the domain doesn't exist, or the receiving server has permanently rejected your email. These addresses will never work, and you should remove them immediately.

**Soft bounces** are temporary failures - mailbox full, server temporarily unavailable, message too large. SES retries soft bounces automatically for a period, but if they keep failing, treat them like hard bounces.

**Complaints** happen when a recipient marks your email as spam. This is worse than a bounce because it directly tells mailbox providers that you're sending unwanted email. Too many complaints and your emails start going to spam for everyone.

## Setting Up SNS Topics

First, create SNS topics for each notification type. Keeping them separate makes processing easier.

```bash
# Create topics for bounces, complaints, and deliveries
aws sns create-topic --name ses-bounces
aws sns create-topic --name ses-complaints
aws sns create-topic --name ses-deliveries

# Note the ARNs from the output - you'll need them
```

Now connect these topics to your SES identity (your verified domain or email address).

```bash
# Get your identity's current notification settings
aws ses get-identity-notification-attributes \
  --identities yourdomain.com

# Set up bounce notifications
aws ses set-identity-notification-topic \
  --identity yourdomain.com \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:us-east-1:123456789:ses-bounces

# Set up complaint notifications
aws ses set-identity-notification-topic \
  --identity yourdomain.com \
  --notification-type Complaint \
  --sns-topic arn:aws:sns:us-east-1:123456789:ses-complaints

# Set up delivery notifications (optional but useful)
aws ses set-identity-notification-topic \
  --identity yourdomain.com \
  --notification-type Delivery \
  --sns-topic arn:aws:sns:us-east-1:123456789:ses-deliveries
```

By default, SES also sends bounce and complaint notifications via email to the address in the Return-Path header. Once you've confirmed SNS is working, you can disable the email notifications.

```bash
# Disable email feedback forwarding (only after SNS is confirmed working)
aws ses set-identity-feedback-forwarding-enabled \
  --identity yourdomain.com \
  --forwarding-enabled false
```

## Processing Notifications with Lambda

The most common approach is to subscribe a Lambda function to your SNS topics. The function processes each notification and updates your database accordingly.

Here's a Lambda function that handles both bounces and complaints.

```python
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
suppression_table = dynamodb.Table('email-suppression-list')

def lambda_handler(event, context):
    # SNS wraps the SES notification in its own message format
    for record in event['Records']:
        sns_message = json.loads(record['Sns']['Message'])
        notification_type = sns_message.get('notificationType')

        if notification_type == 'Bounce':
            handle_bounce(sns_message)
        elif notification_type == 'Complaint':
            handle_complaint(sns_message)
        elif notification_type == 'Delivery':
            handle_delivery(sns_message)
        else:
            logger.warning(f"Unknown notification type: {notification_type}")

def handle_bounce(message):
    bounce = message['bounce']
    bounce_type = bounce['bounceType']

    for recipient in bounce['bouncedRecipients']:
        email = recipient['emailAddress']

        if bounce_type == 'Permanent':
            # Hard bounce - suppress this address immediately
            logger.info(f"Hard bounce: {email}")
            suppress_email(email, 'hard_bounce')
        elif bounce_type == 'Transient':
            # Soft bounce - log it but don't suppress yet
            logger.info(f"Soft bounce: {email}")
            record_soft_bounce(email)

def handle_complaint(message):
    complaint = message['complaint']

    for recipient in complaint['complainedRecipients']:
        email = recipient['emailAddress']
        logger.info(f"Complaint from: {email}")
        # Always suppress on complaint - they don't want your email
        suppress_email(email, 'complaint')

def handle_delivery(message):
    # Useful for tracking successful deliveries
    delivery = message['delivery']
    for recipient in delivery['recipients']:
        logger.info(f"Delivered to: {recipient}")

def suppress_email(email, reason):
    """Add email to suppression list in DynamoDB."""
    suppression_table.put_item(
        Item={
            'email': email.lower(),
            'reason': reason,
            'timestamp': int(time.time())
        }
    )

def record_soft_bounce(email):
    """Track soft bounces - suppress after 3 occurrences."""
    response = suppression_table.update_item(
        Key={'email': email.lower()},
        UpdateExpression='SET soft_bounce_count = if_not_exists(soft_bounce_count, :zero) + :one, reason = :reason',
        ExpressionAttributeValues={
            ':zero': 0,
            ':one': 1,
            ':reason': 'soft_bounce'
        },
        ReturnValues='UPDATED_NEW'
    )

    count = response['Attributes']['soft_bounce_count']
    if count >= 3:
        suppress_email(email, 'repeated_soft_bounce')
```

You'll also need to import the `time` module at the top. Now subscribe this Lambda to your SNS topics.

```bash
# Subscribe Lambda to bounce topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:ses-bounces \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789:function:ses-bounce-handler

# Subscribe Lambda to complaint topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:ses-complaints \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789:function:ses-bounce-handler
```

Don't forget to give SNS permission to invoke your Lambda.

```bash
aws lambda add-permission \
  --function-name ses-bounce-handler \
  --statement-id sns-bounce-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn arn:aws:sns:us-east-1:123456789:ses-bounces
```

## Checking the Suppression List Before Sending

Every time you send an email, check your suppression list first. It's a simple DynamoDB lookup that saves you from sending to known bad addresses.

```python
def is_suppressed(email):
    """Check if an email address is on the suppression list."""
    response = suppression_table.get_item(
        Key={'email': email.lower()}
    )
    return 'Item' in response

# Before sending, filter your recipient list
clean_recipients = [
    r for r in recipients
    if not is_suppressed(r['email'])
]
```

## Using the SES Account-Level Suppression List

SES also has a built-in account-level suppression list. When enabled, SES automatically stops sending to addresses that have previously bounced or complained - before you even make the API call.

```bash
# Enable the account-level suppression list
aws sesv2 put-account-suppression-attributes \
  --suppressed-reasons BOUNCE COMPLAINT

# Check what's on the list
aws sesv2 list-suppressed-destinations \
  --reasons BOUNCE COMPLAINT

# Manually add an address
aws sesv2 put-suppressed-destination \
  --email-address bad@example.com \
  --reason BOUNCE

# Remove an address (if the issue was resolved)
aws sesv2 delete-suppressed-destination \
  --email-address fixed@example.com
```

This is a great safety net, but don't rely on it exclusively. You should still maintain your own suppression list so your application logic knows not to attempt sending to these addresses in the first place. For more details, see our guide on [configuring SES suppression lists](https://oneuptime.com/blog/post/2026-02-12-configure-ses-suppression-lists/view).

## Monitoring Bounce and Complaint Rates

You need to keep an eye on your rates. SES provides reputation metrics in the console, but you can also pull them programmatically.

```bash
# Get your current reputation metrics
aws sesv2 get-account

# This returns something like:
# "SendingEnabled": true,
# "ReputationOptions": {
#   "ReputationMetricsEnabled": true
# }
```

Set up CloudWatch alarms that alert you when rates get dangerous. For details on how to do this, check out [monitoring SES sending with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-ses-sending-with-cloudwatch/view).

The thresholds you want to watch:
- Bounce rate: alarm at 3%, take action at 2%
- Complaint rate: alarm at 0.08%, take action at 0.05%

These are below the SES enforcement thresholds, giving you time to react before Amazon intervenes.

## Testing Your Setup

Before you rely on this in production, test it. SES provides a simulator that lets you trigger bounces and complaints without affecting real addresses.

```bash
# Send to the bounce simulator
aws ses send-email \
  --from sender@yourdomain.com \
  --to bounce@simulator.amazonses.com \
  --subject "Bounce test" \
  --text "Testing bounce handling"

# Send to the complaint simulator
aws ses send-email \
  --from sender@yourdomain.com \
  --to complaint@simulator.amazonses.com \
  --subject "Complaint test" \
  --text "Testing complaint handling"
```

Check your Lambda logs to confirm the notifications were received and processed correctly.

## Summary

Bounce and complaint handling is the unglamorous but essential part of email sending. Without it, your SES account is living on borrowed time. Set up SNS notifications, process them with Lambda, maintain a suppression list, and monitor your rates. Do this from day one - not after you've already damaged your reputation. It's much harder to recover a bad sending reputation than it is to maintain a good one.
