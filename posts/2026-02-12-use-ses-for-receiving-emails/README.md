# How to Use SES for Receiving Emails

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Email, Lambda, S3

Description: Configure Amazon SES to receive incoming emails, process them with receipt rules, store them in S3, and trigger Lambda functions for automated email processing.

---

Most people know Amazon SES as an email sending service, but it can also receive emails. This is useful for all sorts of things - support ticket systems, automated email processing, parsing incoming reports, or building a custom email-based workflow. The setup isn't complicated, but there are a few pieces you need to connect together.

## How SES Email Receiving Works

When SES receives an email, it matches it against receipt rules you've defined. These rules can do several things:

- Store the email in an S3 bucket
- Trigger a Lambda function
- Forward the notification to an SNS topic
- Send the email to Amazon WorkMail
- Stop processing (reject the email)
- Add headers

You can chain multiple actions together. For example, store the raw email in S3 and then trigger a Lambda function to process it.

One important limitation: SES email receiving is only available in specific AWS regions - US East (N. Virginia), US West (Oregon), and Europe (Ireland). Make sure you're working in one of these regions.

## Setting Up Your Domain

First, you need to tell the world that SES handles email for your domain. This means adding an MX record to your DNS configuration.

```
# Add this MX record to your domain's DNS
# The hostname depends on your AWS region

# For us-east-1:
Type: MX
Name: yourdomain.com (or subdomain like inbound.yourdomain.com)
Value: 10 inbound-smtp.us-east-1.amazonaws.com

# For us-west-2:
Value: 10 inbound-smtp.us-west-2.amazonaws.com

# For eu-west-1:
Value: 10 inbound-smtp.eu-west-1.amazonaws.com
```

If you're already using your domain for regular email (like Google Workspace or Microsoft 365), don't change the MX record on the root domain. Instead, use a subdomain like `inbound.yourdomain.com` for SES receiving. That way `support@inbound.yourdomain.com` goes to SES while your regular email keeps working.

## Creating an S3 Bucket for Email Storage

You'll want a place to store incoming emails. Create an S3 bucket with the right permissions.

```bash
# Create the bucket
aws s3 mb s3://my-incoming-emails --region us-east-1

# Add a bucket policy that allows SES to write to it
```

The bucket policy needs to grant SES write access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESPuts",
      "Effect": "Allow",
      "Principal": {
        "Service": "ses.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-incoming-emails/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceAccount": "123456789012"
        }
      }
    }
  ]
}
```

Apply the policy.

```bash
aws s3api put-bucket-policy \
  --bucket my-incoming-emails \
  --policy file://ses-bucket-policy.json
```

## Creating Receipt Rules

Receipt rules tell SES what to do with incoming emails. Rules live inside a rule set, and only one rule set can be active at a time.

```bash
# Create a rule set
aws ses create-receipt-rule-set \
  --rule-set-name my-rules

# Activate it
aws ses set-active-receipt-rule-set \
  --rule-set-name my-rules
```

Now create a rule that stores emails in S3 and triggers a Lambda function.

```bash
aws ses create-receipt-rule \
  --rule-set-name my-rules \
  --rule '{
    "Name": "process-support-emails",
    "Enabled": true,
    "Recipients": ["support@inbound.yourdomain.com"],
    "Actions": [
      {
        "S3Action": {
          "BucketName": "my-incoming-emails",
          "ObjectKeyPrefix": "support/"
        }
      },
      {
        "LambdaAction": {
          "FunctionArn": "arn:aws:lambda:us-east-1:123456789:function:process-email",
          "InvocationType": "Event"
        }
      }
    ],
    "ScanEnabled": true
  }'
```

The `ScanEnabled` flag tells SES to run spam and virus scanning on incoming emails. Always keep this on.

If you leave `Recipients` empty, the rule matches all incoming emails for your domain. You can also specify multiple addresses to catch emails to different addresses with the same rule.

## Processing Emails with Lambda

When SES triggers your Lambda function, it sends a notification that includes metadata about the email - but not the full email body. If you need the body, you'll read it from S3.

Here's a Lambda function that processes incoming emails.

```python
import json
import boto3
import email
from email import policy

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    # The SES notification is nested in the event
    ses_notification = event['Records'][0]['ses']
    mail = ses_notification['mail']
    receipt = ses_notification['receipt']

    # Basic info from the notification
    message_id = mail['messageId']
    sender = mail['source']
    subject = mail['commonHeaders']['subject']
    recipients = mail['destination']

    # Spam/virus check results
    spam_verdict = receipt['spamVerdict']['status']
    virus_verdict = receipt['virusVerdict']['status']

    if spam_verdict != 'PASS' or virus_verdict != 'PASS':
        print(f"Rejecting email from {sender} - spam: {spam_verdict}, virus: {virus_verdict}")
        return

    print(f"Processing email from {sender}: {subject}")

    # Fetch the full email from S3
    bucket = 'my-incoming-emails'
    key = f'support/{message_id}'

    response = s3_client.get_object(Bucket=bucket, Key=key)
    raw_email = response['Body'].read().decode('utf-8')

    # Parse the email using Python's email library
    msg = email.message_from_string(raw_email, policy=policy.default)

    # Extract the body
    body = get_email_body(msg)

    # Extract attachments
    attachments = get_attachments(msg)

    # Now do something with the email
    # For example, create a support ticket
    create_support_ticket(sender, subject, body, attachments)

def get_email_body(msg):
    """Extract the plain text body from an email message."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == 'text/plain':
                return part.get_content()
        # Fall back to HTML if no plain text
        for part in msg.walk():
            if part.get_content_type() == 'text/html':
                return part.get_content()
    else:
        return msg.get_content()

def get_attachments(msg):
    """Extract attachments from an email message."""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                attachments.append({
                    'filename': part.get_filename(),
                    'content_type': part.get_content_type(),
                    'data': part.get_content()
                })
    return attachments

def create_support_ticket(sender, subject, body, attachments):
    """Placeholder - create a ticket in your support system."""
    print(f"Creating ticket: {subject} from {sender}")
    print(f"Body length: {len(body)} chars")
    print(f"Attachments: {len(attachments)}")
```

Make sure your Lambda function has permission to read from the S3 bucket. Also grant SES permission to invoke the function.

```bash
aws lambda add-permission \
  --function-name process-email \
  --statement-id ses-invoke \
  --action lambda:InvokeFunction \
  --principal ses.amazonaws.com \
  --source-account 123456789012
```

## Handling Multiple Email Addresses

You can create multiple receipt rules to handle different addresses differently. Rules are evaluated in order, and processing stops at the first match (unless you configure otherwise).

```bash
# Rule for support emails - store and process
aws ses create-receipt-rule \
  --rule-set-name my-rules \
  --after "process-support-emails" \
  --rule '{
    "Name": "process-billing-emails",
    "Enabled": true,
    "Recipients": ["billing@inbound.yourdomain.com"],
    "Actions": [
      {
        "S3Action": {
          "BucketName": "my-incoming-emails",
          "ObjectKeyPrefix": "billing/"
        }
      },
      {
        "LambdaAction": {
          "FunctionArn": "arn:aws:lambda:us-east-1:123456789:function:process-billing-email",
          "InvocationType": "Event"
        }
      }
    ],
    "ScanEnabled": true
  }'
```

## IP Address Filtering

You can add IP address filters to allow or block specific senders at the SMTP level, before receipt rules are even evaluated.

```bash
# Block a spammy IP range
aws ses create-receipt-filter \
  --filter '{
    "Name": "block-spammer",
    "IpFilter": {
      "Policy": "Block",
      "Cidr": "192.0.2.0/24"
    }
  }'
```

## Email Size Limits

SES can receive emails up to 40 MB in size (including attachments and encoding). If you're storing emails in S3, the raw email is stored in MIME format. For Lambda processing, keep in mind that the initial notification is much smaller - it just has metadata and the message ID. The full email content needs to be fetched from S3.

## Auto-Forwarding Emails

A common use case is receiving emails at a custom domain and forwarding them to another address. You can do this with a Lambda function that uses SES to resend the email. For the sending side, check out our guide on [integrating SES with Python applications](https://oneuptime.com/blog/post/integrate-ses-with-python-boto3-applications/view).

## Summary

SES email receiving turns your AWS account into a programmable email server. You set up DNS, create receipt rules, and process emails with Lambda. It's especially powerful when combined with other AWS services - store in S3, process with Lambda, notify with SNS, and use the data in DynamoDB. The key is planning your receipt rules carefully and always keeping spam scanning enabled. For processing the emails after receiving them, see our guide on [using SES with Lambda for email processing](https://oneuptime.com/blog/post/use-ses-with-lambda-for-email-processing/view).
