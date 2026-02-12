# How to Send SES Emails with Boto3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Boto3, Python, Email

Description: Learn how to send emails through Amazon SES using Boto3 in Python, including plain text, HTML emails, attachments, templates, and bulk sending with proper error handling.

---

Amazon Simple Email Service (SES) is AWS's email sending service, and Boto3 makes it accessible from Python without dealing with SMTP configurations. Whether you're sending transactional emails, notifications, or marketing campaigns, SES through Boto3 handles it. Let's go from basic emails to production-ready sending patterns.

## Verifying Email Addresses

Before you can send emails with SES, you need to verify the sender address (or the entire domain in production). In sandbox mode, you also need to verify recipient addresses.

```python
import boto3

ses = boto3.client('ses', region_name='us-east-1')

# Verify a sender email address
ses.verify_email_identity(EmailAddress='sender@example.com')
print("Verification email sent - check your inbox")

# Check verification status
response = ses.get_identity_verification_attributes(
    Identities=['sender@example.com']
)

status = response['VerificationAttributes'].get('sender@example.com', {})
print(f"Status: {status.get('VerificationStatus', 'Not found')}")

# List all verified identities
response = ses.list_identities(IdentityType='EmailAddress')
for identity in response['Identities']:
    print(f"Verified: {identity}")
```

## Sending a Simple Text Email

The most straightforward way to send an email with SES.

```python
import boto3
from botocore.exceptions import ClientError

ses = boto3.client('ses', region_name='us-east-1')

try:
    response = ses.send_email(
        Source='sender@example.com',
        Destination={
            'ToAddresses': ['recipient@example.com'],
            'CcAddresses': ['cc@example.com'],
            'BccAddresses': ['bcc@example.com']
        },
        Message={
            'Subject': {
                'Data': 'Your Weekly Report',
                'Charset': 'UTF-8'
            },
            'Body': {
                'Text': {
                    'Data': 'Hello! Here is your weekly report summary.',
                    'Charset': 'UTF-8'
                }
            }
        }
    )
    print(f"Email sent! Message ID: {response['MessageId']}")
except ClientError as e:
    print(f"Error sending email: {e.response['Error']['Message']}")
```

## Sending HTML Emails

Most transactional emails need HTML formatting. You can send both HTML and plain text versions so clients that don't render HTML still get something readable.

```python
import boto3

ses = boto3.client('ses', region_name='us-east-1')

html_body = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { background-color: #4CAF50; color: white; padding: 20px; }
        .content { padding: 20px; }
        .button {
            background-color: #4CAF50; color: white;
            padding: 10px 20px; text-decoration: none;
            border-radius: 4px; display: inline-block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Your Report is Ready</h1>
    </div>
    <div class="content">
        <p>Hi there,</p>
        <p>Your weekly analytics report has been generated.</p>
        <p><a href="https://example.com/report" class="button">View Report</a></p>
        <p>Best regards,<br>The Analytics Team</p>
    </div>
</body>
</html>
"""

text_body = """Your Report is Ready

Hi there,

Your weekly analytics report has been generated.
View it here: https://example.com/report

Best regards,
The Analytics Team
"""

response = ses.send_email(
    Source='Analytics Team <analytics@example.com>',
    Destination={'ToAddresses': ['user@example.com']},
    Message={
        'Subject': {'Data': 'Your Weekly Report is Ready'},
        'Body': {
            'Text': {'Data': text_body},
            'Html': {'Data': html_body}
        }
    }
)
```

## Sending Emails with Attachments

For attachments, you need to use `send_raw_email` and build a MIME message.

```python
import boto3
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

ses = boto3.client('ses', region_name='us-east-1')

# Build the MIME message
msg = MIMEMultipart('mixed')
msg['Subject'] = 'Invoice #12345'
msg['From'] = 'billing@example.com'
msg['To'] = 'customer@example.com'

# Add text body
text_part = MIMEText('Please find your invoice attached.', 'plain')
msg.attach(text_part)

# Add HTML body
html_part = MIMEText(
    '<h2>Invoice #12345</h2><p>Please find your invoice attached.</p>',
    'html'
)
msg.attach(html_part)

# Add a PDF attachment
with open('invoice.pdf', 'rb') as f:
    attachment = MIMEApplication(f.read(), _subtype='pdf')
    attachment.add_header(
        'Content-Disposition', 'attachment',
        filename='invoice-12345.pdf'
    )
    msg.attach(attachment)

# Add a CSV attachment
with open('summary.csv', 'rb') as f:
    csv_attachment = MIMEApplication(f.read(), _subtype='csv')
    csv_attachment.add_header(
        'Content-Disposition', 'attachment',
        filename='summary.csv'
    )
    msg.attach(csv_attachment)

# Send the raw email
response = ses.send_raw_email(
    Source='billing@example.com',
    Destinations=['customer@example.com'],
    RawMessage={'Data': msg.as_string()}
)

print(f"Email with attachments sent: {response['MessageId']}")
```

## Using SES Templates

Templates let you define email layouts once and reuse them with different data. They're great for transactional emails.

First, create a template.

```python
import boto3
import json

ses = boto3.client('ses', region_name='us-east-1')

# Create an email template
ses.create_template(
    Template={
        'TemplateName': 'welcome-email',
        'SubjectPart': 'Welcome to {{company}}, {{name}}!',
        'HtmlPart': """
            <h1>Welcome, {{name}}!</h1>
            <p>Thanks for joining {{company}}. Your account is ready.</p>
            <p>Your username: <strong>{{username}}</strong></p>
            <p><a href="{{login_url}}">Log in now</a></p>
        """,
        'TextPart': (
            'Welcome, {{name}}!\n\n'
            'Thanks for joining {{company}}. Your account is ready.\n'
            'Your username: {{username}}\n'
            'Log in: {{login_url}}'
        )
    }
)
print("Template created")
```

Then send templated emails.

```python
import boto3
import json

ses = boto3.client('ses', region_name='us-east-1')

# Send a templated email
response = ses.send_templated_email(
    Source='welcome@example.com',
    Destination={'ToAddresses': ['newuser@example.com']},
    Template='welcome-email',
    TemplateData=json.dumps({
        'name': 'Alice',
        'company': 'Acme Corp',
        'username': 'alice42',
        'login_url': 'https://app.example.com/login'
    })
)

print(f"Templated email sent: {response['MessageId']}")
```

## Bulk Sending with Templates

For sending the same template to many recipients at once, use `send_bulk_templated_email`.

```python
import boto3
import json

ses = boto3.client('ses', region_name='us-east-1')

# Send to multiple recipients with different template data
response = ses.send_bulk_templated_email(
    Source='newsletter@example.com',
    Template='welcome-email',
    DefaultTemplateData=json.dumps({
        'name': 'Valued Customer',
        'company': 'Acme Corp',
        'username': 'user',
        'login_url': 'https://app.example.com/login'
    }),
    Destinations=[
        {
            'Destination': {'ToAddresses': ['alice@example.com']},
            'ReplacementTemplateData': json.dumps({
                'name': 'Alice',
                'username': 'alice42'
            })
        },
        {
            'Destination': {'ToAddresses': ['bob@example.com']},
            'ReplacementTemplateData': json.dumps({
                'name': 'Bob',
                'username': 'bob99'
            })
        }
    ]
)

# Check results for each recipient
for i, status in enumerate(response['Status']):
    if status['Status'] == 'Success':
        print(f"Recipient {i}: Sent ({status['MessageId']})")
    else:
        print(f"Recipient {i}: Failed ({status.get('Error', 'Unknown error')})")
```

## Checking Send Quota and Statistics

SES has sending limits. Always check your quota before bulk operations.

```python
import boto3

ses = boto3.client('ses', region_name='us-east-1')

# Check your sending quota
quota = ses.get_send_quota()
print(f"Max 24-hour send: {quota['Max24HourSend']:.0f}")
print(f"Sent last 24 hours: {quota['SentLast24Hours']:.0f}")
print(f"Max send rate: {quota['MaxSendRate']:.0f}/sec")
print(f"Remaining: {quota['Max24HourSend'] - quota['SentLast24Hours']:.0f}")

# Get send statistics (last two weeks)
stats = ses.get_send_statistics()
for point in sorted(stats['SendDataPoints'],
                     key=lambda x: x['Timestamp'])[-5:]:
    print(f"{point['Timestamp']}: "
          f"attempts={point['DeliveryAttempts']}, "
          f"bounces={point['Bounces']}, "
          f"complaints={point['Complaints']}, "
          f"rejects={point['Rejects']}")
```

## Production Email Sender

Here's a production-ready class that handles common concerns like retries, rate limiting, and error tracking.

```python
import boto3
import json
import time
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class EmailSender:
    def __init__(self, region='us-east-1'):
        self.ses = boto3.client('ses', region_name=region)
        self.stats = {'sent': 0, 'failed': 0, 'bounced': 0}

    def send(self, to, subject, html_body, text_body=None,
             sender='noreply@example.com', reply_to=None, max_retries=3):
        """Send an email with retry logic."""
        message = {
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Html': {'Data': html_body, 'Charset': 'UTF-8'}
            }
        }

        if text_body:
            message['Body']['Text'] = {'Data': text_body, 'Charset': 'UTF-8'}

        kwargs = {
            'Source': sender,
            'Destination': {'ToAddresses': to if isinstance(to, list) else [to]},
            'Message': message
        }

        if reply_to:
            kwargs['ReplyToAddresses'] = [reply_to]

        for attempt in range(1, max_retries + 1):
            try:
                response = self.ses.send_email(**kwargs)
                self.stats['sent'] += 1
                logger.info(f"Email sent to {to}: {response['MessageId']}")
                return response['MessageId']
            except ClientError as e:
                code = e.response['Error']['Code']
                if code == 'Throttling' and attempt < max_retries:
                    wait = 2 ** attempt
                    logger.warning(f"Throttled, waiting {wait}s...")
                    time.sleep(wait)
                elif code == 'MessageRejected':
                    self.stats['failed'] += 1
                    logger.error(f"Message rejected: {e.response['Error']['Message']}")
                    return None
                else:
                    self.stats['failed'] += 1
                    raise

        return None

# Usage
sender = EmailSender()
message_id = sender.send(
    to='user@example.com',
    subject='Your order shipped',
    html_body='<h1>Order Shipped!</h1><p>Your order is on the way.</p>',
    text_body='Order Shipped! Your order is on the way.'
)
```

## Best Practices

- **Move out of SES sandbox** for production. In sandbox mode, you can only send to verified addresses.
- **Set up bounce and complaint handling** using SNS topics. High bounce rates can get your SES account suspended.
- **Use templates** for transactional emails. They're faster and ensure consistency.
- **Monitor your send rates** and stay within your quota.
- **Include unsubscribe links** in marketing emails to comply with regulations.
- **Test with SES simulator addresses** before sending to real recipients.

For handling the various errors SES can throw, see the guide on [Boto3 error handling](https://oneuptime.com/blog/post/boto3-errors-and-exceptions/view). Monitoring your email delivery metrics is critical for production systems - tracking bounce and complaint rates helps you maintain a good sender reputation.
