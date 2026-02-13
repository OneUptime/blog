# How to Integrate SES with Python (Boto3) Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Python, Boto3, Email

Description: A complete guide to sending emails from Python applications using Amazon SES and Boto3, covering simple emails, templates, attachments, and production best practices.

---

Python and Boto3 make a natural combination for working with Amazon SES. Boto3 is AWS's official Python SDK, and it handles all the authentication and API communication for you. Whether you're building a Django web app, a Flask API, or a standalone script, the integration pattern is the same.

Let's build a production-ready email sending module.

## Setup and Installation

Install Boto3 if you haven't already.

```bash
pip install boto3
```

Make sure your AWS credentials are configured. Boto3 checks these locations in order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role (if running on EC2, Lambda, or ECS)

For local development, the credentials file is the easiest option.

```bash
# Configure credentials
aws configure
```

## Basic Email Sending

Here's the simplest way to send an email with SES and Boto3.

```python
import boto3
from botocore.exceptions import ClientError

def send_email(to_address, subject, body_text, body_html=None):
    """Send a simple email through SES."""
    ses = boto3.client('ses', region_name='us-east-1')

    message_body = {
        'Text': {
            'Data': body_text,
            'Charset': 'UTF-8'
        }
    }

    # Include HTML version if provided
    if body_html:
        message_body['Html'] = {
            'Data': body_html,
            'Charset': 'UTF-8'
        }

    try:
        response = ses.send_email(
            Source='sender@yourdomain.com',
            Destination={
                'ToAddresses': [to_address] if isinstance(to_address, str) else to_address
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': message_body
            }
        )
        return response['MessageId']
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"SES error ({error_code}): {error_message}")
        raise
```

## A Production Email Service Class

For real applications, wrap the SES functionality in a class with proper error handling, retries, and logging.

```python
import boto3
import json
import logging
import time
from botocore.exceptions import ClientError
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

logger = logging.getLogger(__name__)

class EmailService:
    """Production-ready SES email service."""

    # SES-specific error codes that are retryable
    RETRYABLE_ERRORS = ['Throttling', 'ServiceUnavailable', 'RequestTimeout']

    def __init__(self, region='us-east-1', from_address=None, config_set=None):
        self.ses = boto3.client('ses', region_name=region)
        self.ses_v2 = boto3.client('sesv2', region_name=region)
        self.from_address = from_address or 'noreply@yourdomain.com'
        self.config_set = config_set
        self.max_retries = 3

    def send(self, to, subject, text=None, html=None, cc=None, bcc=None,
             reply_to=None, tags=None):
        """Send a simple email with optional HTML."""

        destination = {
            'ToAddresses': self._to_list(to)
        }
        if cc:
            destination['CcAddresses'] = self._to_list(cc)
        if bcc:
            destination['BccAddresses'] = self._to_list(bcc)

        body = {}
        if text:
            body['Text'] = {'Data': text, 'Charset': 'UTF-8'}
        if html:
            body['Html'] = {'Data': html, 'Charset': 'UTF-8'}

        if not body:
            raise ValueError("At least one of 'text' or 'html' must be provided")

        params = {
            'Source': self.from_address,
            'Destination': destination,
            'Message': {
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': body
            }
        }

        if reply_to:
            params['ReplyToAddresses'] = self._to_list(reply_to)
        if self.config_set:
            params['ConfigurationSetName'] = self.config_set
        if tags:
            params['Tags'] = [
                {'Name': k, 'Value': v} for k, v in tags.items()
            ]

        return self._send_with_retry('send_email', params)

    def send_templated(self, to, template_name, template_data, tags=None):
        """Send an email using an SES template."""

        params = {
            'Source': self.from_address,
            'Destination': {
                'ToAddresses': self._to_list(to)
            },
            'Template': template_name,
            'TemplateData': json.dumps(template_data)
        }

        if self.config_set:
            params['ConfigurationSetName'] = self.config_set
        if tags:
            params['Tags'] = [
                {'Name': k, 'Value': v} for k, v in tags.items()
            ]

        return self._send_with_retry('send_templated_email', params)

    def send_with_attachment(self, to, subject, body_text, attachments):
        """Send an email with file attachments using raw MIME."""

        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = self.from_address
        msg['To'] = ', '.join(self._to_list(to))

        # Add the text body
        text_part = MIMEText(body_text, 'plain', 'utf-8')
        msg.attach(text_part)

        # Add each attachment
        for attachment in attachments:
            att = MIMEApplication(attachment['data'])
            att.add_header(
                'Content-Disposition', 'attachment',
                filename=attachment['filename']
            )
            if 'content_type' in attachment:
                att.set_type(attachment['content_type'])
            msg.attach(att)

        params = {
            'Source': self.from_address,
            'Destinations': self._to_list(to),
            'RawMessage': {
                'Data': msg.as_string()
            }
        }

        return self._send_with_retry('send_raw_email', params)

    def _send_with_retry(self, method_name, params):
        """Execute an SES API call with automatic retries."""

        method = getattr(self.ses, method_name)

        for attempt in range(self.max_retries):
            try:
                response = method(**params)
                message_id = response.get('MessageId', 'unknown')
                logger.info(f"Email sent successfully: {message_id}")
                return {'success': True, 'message_id': message_id}

            except ClientError as e:
                error_code = e.response['Error']['Code']
                error_msg = e.response['Error']['Message']

                if error_code in self.RETRYABLE_ERRORS and attempt < self.max_retries - 1:
                    wait_time = (2 ** attempt) + 1  # exponential backoff
                    logger.warning(
                        f"Retryable error ({error_code}), "
                        f"waiting {wait_time}s before retry {attempt + 1}"
                    )
                    time.sleep(wait_time)
                    continue

                logger.error(f"SES error ({error_code}): {error_msg}")
                return {
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_msg
                }

    def _to_list(self, value):
        """Convert a string or list to a list."""
        if isinstance(value, str):
            return [value]
        return list(value)
```

## Django Integration

If you're using Django, you can plug SES in as the email backend.

```python
# settings.py
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_SES_REGION_NAME = 'us-east-1'
AWS_SES_REGION_ENDPOINT = 'email.us-east-1.amazonaws.com'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
```

Install the django-ses package first.

```bash
pip install django-ses
```

Then use Django's standard email functions as normal.

```python
from django.core.mail import send_mail

send_mail(
    subject='Password Reset',
    message='Click this link to reset your password: ...',
    from_email=None,  # uses DEFAULT_FROM_EMAIL
    recipient_list=['user@example.com']
)
```

## Flask Integration

For Flask, integrate the email service as an extension or just import it.

```python
from flask import Flask, request, jsonify
from email_service import EmailService

app = Flask(__name__)
email_service = EmailService(
    from_address='noreply@yourdomain.com',
    config_set='production-email-monitoring'
)

@app.route('/api/send-notification', methods=['POST'])
def send_notification():
    data = request.get_json()
    recipient = data.get('email')
    message = data.get('message')

    if not recipient or not message:
        return jsonify({'error': 'Missing required fields'}), 400

    result = email_service.send(
        to=recipient,
        subject='Notification',
        text=message,
        tags={'EmailType': 'notification'}
    )

    if result['success']:
        return jsonify({'message_id': result['message_id']}), 200
    else:
        return jsonify({'error': result['error_message']}), 500
```

## Managing Templates with Boto3

Here's how to create and manage SES templates programmatically.

```python
def manage_template(ses_client, name, subject, html, text):
    """Create or update an SES template."""
    template = {
        'TemplateName': name,
        'SubjectPart': subject,
        'HtmlPart': html,
        'TextPart': text
    }

    try:
        ses_client.create_template(Template=template)
        print(f"Created template: {name}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'AlreadyExistsException':
            ses_client.update_template(Template=template)
            print(f"Updated template: {name}")
        else:
            raise

# Example: Create a password reset template
ses = boto3.client('ses', region_name='us-east-1')

manage_template(
    ses,
    name='password-reset',
    subject='Reset your password',
    html='<p>Hi {{name}},</p><p>Click <a href="{{reset_link}}">here</a> to reset your password.</p>',
    text='Hi {{name}}, visit this link to reset your password: {{reset_link}}'
)
```

## Handling Bulk Sends

When you need to send to a large list, batch your calls and respect rate limits.

```python
def send_bulk(email_service, recipients, subject, text, html=None, rate_limit=14):
    """Send to a list of recipients with rate limiting."""
    results = {'sent': 0, 'failed': 0, 'errors': []}
    delay = 1.0 / rate_limit

    for recipient in recipients:
        result = email_service.send(
            to=recipient,
            subject=subject,
            text=text,
            html=html
        )

        if result['success']:
            results['sent'] += 1
        else:
            results['failed'] += 1
            results['errors'].append({
                'email': recipient,
                'error': result.get('error_message')
            })

        time.sleep(delay)

        # Log progress every 100 emails
        total = results['sent'] + results['failed']
        if total % 100 == 0:
            print(f"Progress: {total}/{len(recipients)}")

    return results
```

For larger bulk operations, see our guide on [sending bulk emails with Amazon SES](https://oneuptime.com/blog/post/2026-02-12-send-bulk-emails-with-amazon-ses/view).

## Summary

Boto3 gives you clean, Pythonic access to all SES features. Build a service class with retry logic and good error handling, and you've got a reliable email sending system. The patterns shown here work whether you're in Django, Flask, FastAPI, or a standalone script. Keep your credentials secure, respect rate limits, and always handle errors - SES will occasionally throttle you or reject messages, and your code needs to deal with that gracefully.
