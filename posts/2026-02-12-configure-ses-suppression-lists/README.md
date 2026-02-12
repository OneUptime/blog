# How to Configure SES Suppression Lists

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Email, Deliverability

Description: Learn how to configure and manage Amazon SES account-level and configuration-set-level suppression lists to protect your email sending reputation.

---

Suppression lists are your first line of defense against sending emails to addresses that will hurt your reputation. When someone's email bounces or they mark you as spam, you don't want to keep sending to them. Amazon SES provides built-in suppression list functionality at both the account level and the configuration set level.

Let's walk through how to configure both, how to manage them, and when to use each one.

## Account-Level Suppression List

The account-level suppression list applies to all emails sent from your SES account. When an address is on this list, SES won't even attempt to deliver the email - it drops it before it hits the recipient's mail server.

You can configure it to automatically suppress addresses that generate bounces, complaints, or both.

```bash
# Enable account-level suppression for both bounces and complaints
aws sesv2 put-account-suppression-attributes \
  --suppressed-reasons BOUNCE COMPLAINT

# Check current settings
aws sesv2 get-account
```

Once enabled, SES automatically adds addresses to the suppression list when:
- A hard bounce occurs (the address doesn't exist or permanently rejects mail)
- A recipient files a complaint (marks your email as spam)

This happens silently in the background. You don't need to write any code - SES handles it.

## Configuration-Set-Level Suppression

If you need different suppression behavior for different types of emails, use configuration-set-level overrides. Maybe you want transactional emails to only suppress on bounces, but marketing emails to suppress on both bounces and complaints.

```bash
# Create a configuration set for marketing emails
aws sesv2 create-configuration-set \
  --configuration-set-name marketing-emails

# Override suppression settings for this configuration set
aws sesv2 put-configuration-set-suppression-options \
  --configuration-set-name marketing-emails \
  --suppressed-reasons BOUNCE COMPLAINT

# Create a configuration set for transactional emails with different settings
aws sesv2 create-configuration-set \
  --configuration-set-name transactional-emails

# Only suppress on bounces for transactional emails
aws sesv2 put-configuration-set-suppression-options \
  --configuration-set-name transactional-emails \
  --suppressed-reasons BOUNCE
```

When a configuration set has its own suppression settings, those override the account-level settings. You can even disable suppression entirely for a specific configuration set (though that's rarely a good idea).

## Managing the Suppression List

You'll need to view, add, and remove addresses from the suppression list periodically. Here's how.

### Viewing Suppressed Addresses

```bash
# List all suppressed addresses
aws sesv2 list-suppressed-destinations

# Filter by reason
aws sesv2 list-suppressed-destinations --reasons BOUNCE
aws sesv2 list-suppressed-destinations --reasons COMPLAINT

# Filter by date range
aws sesv2 list-suppressed-destinations \
  --start-date 2026-01-01T00:00:00Z \
  --end-date 2026-02-01T00:00:00Z

# Get details for a specific address
aws sesv2 get-suppressed-destination \
  --email-address user@example.com
```

### Adding Addresses Manually

Sometimes you want to proactively add addresses. Maybe a customer asked you to stop emailing them, or you know an address is invalid.

```bash
# Add a single address
aws sesv2 put-suppressed-destination \
  --email-address invalid@example.com \
  --reason BOUNCE

# Add because of a complaint
aws sesv2 put-suppressed-destination \
  --email-address complainant@example.com \
  --reason COMPLAINT
```

### Bulk Import

If you're migrating from another email provider and you already have a suppression list, you can bulk import it.

```python
import boto3
import csv

ses = boto3.client('sesv2')

# Read addresses from a CSV file
with open('suppression-list.csv', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        email_address = row[0].strip()
        reason = row[1].strip() if len(row) > 1 else 'BOUNCE'

        try:
            ses.put_suppressed_destination(
                EmailAddress=email_address,
                Reason=reason
            )
            print(f"Added: {email_address} ({reason})")
        except ses.exceptions.TooManyRequestsException:
            # Rate limited - wait and retry
            import time
            time.sleep(1)
            ses.put_suppressed_destination(
                EmailAddress=email_address,
                Reason=reason
            )
        except Exception as e:
            print(f"Error adding {email_address}: {e}")
```

### Removing Addresses

If someone fixes their email configuration or you've confirmed an address is valid again, you can remove it from the suppression list.

```bash
# Remove a single address
aws sesv2 delete-suppressed-destination \
  --email-address fixed@example.com
```

Be careful with this. If you remove an address and it bounces again, it goes right back on the list - and the bounce still counts against your reputation.

## Building Your Own Suppression Layer

The SES suppression list is great as a safety net, but you should also maintain your own application-level suppression. The SES list only prevents delivery attempts - it doesn't prevent your application from building emails and making API calls.

Here's a simple DynamoDB-backed suppression check.

```python
import boto3
import time

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('app-suppression-list')

def suppress_address(email, reason, source='ses'):
    """Add an email to the application suppression list."""
    table.put_item(
        Item={
            'email': email.lower(),
            'reason': reason,
            'source': source,
            'suppressed_at': int(time.time())
        }
    )

def is_suppressed(email):
    """Check if an email is on the suppression list."""
    response = table.get_item(
        Key={'email': email.lower()}
    )
    return 'Item' in response

def unsuppress_address(email):
    """Remove an email from the suppression list."""
    table.delete_item(
        Key={'email': email.lower()}
    )

def send_email_safely(ses_client, to_address, subject, body):
    """Only send if the address isn't suppressed."""
    if is_suppressed(to_address):
        print(f"Skipping suppressed address: {to_address}")
        return None

    return ses_client.send_email(
        Source='sender@yourdomain.com',
        Destination={'ToAddresses': [to_address]},
        Message={
            'Subject': {'Data': subject},
            'Body': {'Text': {'Data': body}}
        }
    )
```

This saves you API calls and gives you more control over the suppression logic. For example, you might want to unsuppress addresses after 90 days for re-engagement campaigns, or you might want different suppression rules for different email types.

## Monitoring Suppression Activity

Keep an eye on how fast your suppression list is growing. A sudden spike usually means something is wrong - bad list, content issues, or a technical problem.

```python
from datetime import datetime, timedelta

ses = boto3.client('sesv2')

# Count recently suppressed addresses
paginator = ses.get_paginator('list_suppressed_destinations')
recent_count = 0
cutoff = datetime.utcnow() - timedelta(hours=24)

for page in paginator.paginate(
    Reasons=['BOUNCE', 'COMPLAINT'],
    StartDate=cutoff
):
    recent_count += len(page.get('SuppressedDestinationSummaries', []))

print(f"Addresses suppressed in last 24h: {recent_count}")

# Publish as a custom CloudWatch metric
cloudwatch = boto3.client('cloudwatch')
cloudwatch.put_metric_data(
    Namespace='Custom/SES',
    MetricData=[{
        'MetricName': 'NewSuppressions',
        'Value': recent_count,
        'Unit': 'Count'
    }]
)
```

For comprehensive SES monitoring, see our guide on [monitoring SES sending with CloudWatch](https://oneuptime.com/blog/post/monitor-ses-sending-with-cloudwatch/view).

## Suppression List vs. Bounce Handling

These are complementary, not competing approaches. The suppression list prevents future sends. Bounce handling with SNS gives you real-time notification when bounces happen so you can take immediate action. You should use both.

For setting up SNS-based bounce handling, see [handling SES bounces and complaints with SNS](https://oneuptime.com/blog/post/handle-ses-bounces-and-complaints-with-sns/view).

## Best Practices

1. **Enable suppression from day one.** Don't wait until you have reputation problems.
2. **Suppress on both bounces and complaints** for most use cases.
3. **Maintain your own suppression list** in addition to the SES list. Your app should know about bad addresses before making API calls.
4. **Audit the list regularly.** Check for accidental suppressions, especially after technical issues.
5. **Be very cautious about removing addresses.** Only unsuppress when you have evidence the address is valid and the recipient wants your email.
6. **Import existing suppression data** when migrating from another provider.

## Summary

SES suppression lists are a straightforward but powerful tool for protecting your sending reputation. Enable account-level suppression, use configuration-set overrides when you need different behavior for different email types, and always maintain your own application-level suppression list as well. The few lines of configuration involved are a small price to pay for keeping your bounce and complaint rates healthy.
