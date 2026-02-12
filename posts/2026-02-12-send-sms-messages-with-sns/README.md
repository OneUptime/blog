# How to Send SMS Messages with SNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SNS, SMS, Notifications

Description: Learn how to send SMS messages with Amazon SNS, including direct publishing, topic-based broadcasting, spend limits, sender IDs, and opt-out management.

---

Amazon SNS can send SMS text messages to phone numbers worldwide. You can send directly to a phone number or subscribe numbers to a topic for broadcast messaging. It's a straightforward way to add SMS notifications to your application without managing SMS gateway integrations.

But SMS through SNS has some important details around costs, sender IDs, regulations, and opt-out handling that you need to understand before going to production.

## Sending Your First SMS

The simplest possible SMS send.

```bash
# Send an SMS directly to a phone number
aws sns publish \
  --phone-number "+12025551234" \
  --message "Your verification code is 847291. It expires in 10 minutes."
```

That's it. No topic needed, no subscription required. SNS delivers the message directly.

## Message Types: Transactional vs Promotional

SNS categorizes SMS messages into two types that affect delivery priority and cost.

- **Transactional**: High priority, higher cost. Use for OTPs, alerts, and time-sensitive messages. These get preferential delivery.
- **Promotional**: Lower priority, lower cost. Use for marketing, updates, and non-urgent notifications.

```bash
# Send a transactional SMS (higher priority)
aws sns publish \
  --phone-number "+12025551234" \
  --message "Your login code is 847291" \
  --message-attributes '{
    "AWS.SNS.SMS.SMSType": {
      "DataType": "String",
      "StringValue": "Transactional"
    }
  }'
```

## Sending SMS with Python

Here's a complete SMS sending module with proper configuration.

```python
import boto3

sns = boto3.client('sns', region_name='us-east-1')

def send_sms(phone_number, message, transactional=True, sender_id=None):
    """Send an SMS message to a phone number.

    Args:
        phone_number: E.164 format, e.g., +12025551234
        message: The text message (max 160 chars for single SMS)
        transactional: True for OTPs/alerts, False for marketing
        sender_id: Optional sender ID (not supported in all countries)
    """
    attributes = {
        'AWS.SNS.SMS.SMSType': {
            'DataType': 'String',
            'StringValue': 'Transactional' if transactional else 'Promotional',
        }
    }

    if sender_id:
        attributes['AWS.SNS.SMS.SenderID'] = {
            'DataType': 'String',
            'StringValue': sender_id,
        }

    response = sns.publish(
        PhoneNumber=phone_number,
        Message=message,
        MessageAttributes=attributes,
    )

    return response['MessageId']

# Send an OTP code
message_id = send_sms(
    phone_number='+12025551234',
    message='Your OneUptime verification code is 847291. Valid for 10 minutes.',
    transactional=True,
)
print(f'Sent SMS: {message_id}')

# Send a promotional message
message_id = send_sms(
    phone_number='+12025551234',
    message='Your monthly uptime report is ready. Log in to view it.',
    transactional=False,
    sender_id='OneUptime',
)
```

## Setting Account-Level SMS Preferences

Configure default settings that apply to all SMS messages from your account.

```python
import boto3

sns = boto3.client('sns')

# Set account-level SMS preferences
sns.set_sms_attributes(
    attributes={
        # Default message type for all SMS
        'DefaultSMSType': 'Transactional',
        # Monthly spend limit in USD (important for cost control)
        'MonthlySpendLimit': '100',
        # Default sender ID (supported in some countries)
        'DefaultSenderID': 'MyApp',
        # S3 bucket for delivery status logs
        'DeliveryStatusSuccessSamplingRate': '100',
    }
)

# Verify the settings
response = sns.get_sms_attributes(
    attributes=[
        'DefaultSMSType',
        'MonthlySpendLimit',
        'DefaultSenderID',
    ]
)
print('SMS Settings:', response['attributes'])
```

## Broadcasting SMS via Topic

For sending the same message to multiple phone numbers, use a topic.

```python
import boto3

sns = boto3.client('sns')

# Create a topic for SMS broadcasts
topic_response = sns.create_topic(Name='system-alerts-sms')
topic_arn = topic_response['TopicArn']

# Subscribe phone numbers to the topic
phone_numbers = ['+12025551234', '+12025555678', '+12025559012']

for phone in phone_numbers:
    sns.subscribe(
        TopicArn=topic_arn,
        Protocol='sms',
        Endpoint=phone,
    )
    print(f'Subscribed: {phone}')

# Send to all subscribers at once
sns.publish(
    TopicArn=topic_arn,
    Message='System maintenance scheduled for tonight 10 PM - 2 AM EST.',
    MessageAttributes={
        'AWS.SNS.SMS.SMSType': {
            'DataType': 'String',
            'StringValue': 'Transactional',
        }
    }
)
```

## OTP Verification Pattern

Here's a common pattern for SMS-based verification codes.

```python
import boto3
import random
import time

sns = boto3.client('sns')
# In production, use DynamoDB or Redis for OTP storage
otp_store = {}

def send_verification_code(phone_number):
    """Generate and send a 6-digit verification code."""
    code = str(random.randint(100000, 999999))
    expiry = time.time() + 600  # 10 minutes

    # Store the code (use DynamoDB/Redis in production)
    otp_store[phone_number] = {
        'code': code,
        'expiry': expiry,
        'attempts': 0,
    }

    # Send the SMS
    message_id = sns.publish(
        PhoneNumber=phone_number,
        Message=f'Your verification code is {code}. It expires in 10 minutes.',
        MessageAttributes={
            'AWS.SNS.SMS.SMSType': {
                'DataType': 'String',
                'StringValue': 'Transactional',
            }
        }
    )

    return message_id['MessageId']

def verify_code(phone_number, submitted_code):
    """Verify a submitted code against the stored one."""
    stored = otp_store.get(phone_number)

    if not stored:
        return False, 'No verification code found'

    if time.time() > stored['expiry']:
        del otp_store[phone_number]
        return False, 'Code expired'

    stored['attempts'] += 1
    if stored['attempts'] > 3:
        del otp_store[phone_number]
        return False, 'Too many attempts'

    if stored['code'] == submitted_code:
        del otp_store[phone_number]
        return True, 'Verified'

    return False, 'Invalid code'
```

## Opt-Out Management

SMS recipients can opt out by replying "STOP" to your messages. SNS handles this automatically - opted-out numbers won't receive further messages.

```python
import boto3

sns = boto3.client('sns')

def check_opt_out(phone_number):
    """Check if a phone number has opted out of SMS."""
    response = sns.check_if_phone_number_is_opted_out(
        phoneNumber=phone_number
    )
    return response['isOptedOut']

def list_opted_out_numbers():
    """List all phone numbers that have opted out."""
    numbers = []
    response = sns.list_phone_numbers_opted_out()
    numbers.extend(response.get('phoneNumbers', []))

    while response.get('nextToken'):
        response = sns.list_phone_numbers_opted_out(
            nextToken=response['nextToken']
        )
        numbers.extend(response.get('phoneNumbers', []))

    return numbers

def opt_in_number(phone_number):
    """Re-enable SMS for a number that previously opted out.

    Only do this if the user explicitly requests it through
    another channel (e.g., your app or website).
    """
    sns.opt_in_phone_number(phoneNumber=phone_number)
    print(f'Opted in: {phone_number}')

# Check before sending
if not check_opt_out('+12025551234'):
    send_sms('+12025551234', 'Your alert message here')
else:
    print('Phone number has opted out')
```

## Monitoring SMS Delivery

Track your SMS delivery rates and costs.

```python
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client('cloudwatch')

def get_sms_stats(days=7):
    """Get SMS delivery statistics for the last N days."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    metrics = {
        'NumberOfMessagesPublished': 'Messages Sent',
        'NumberOfNotificationsDelivered': 'Delivered',
        'NumberOfNotificationsFailed': 'Failed',
        'SMSMonthToDateSpentUSD': 'Monthly Spend ($)',
    }

    for metric_name, label in metrics.items():
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/SNS',
            MetricName=metric_name,
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,  # Daily
            Statistics=['Sum'],
        )

        total = sum(dp['Sum'] for dp in response['Datapoints'])
        print(f'{label}: {total}')

get_sms_stats()
```

## Cost Management

SMS costs vary by country. US messages cost about $0.00645 per message. International rates can be much higher. Always set a monthly spend limit.

```bash
# Set a spend limit to prevent surprise bills
aws sns set-sms-attributes \
  --attributes '{"MonthlySpendLimit": "50"}'
```

The default limit is $1.00 per month, which only covers about 155 US messages. You'll need to increase this for any real workload, and for high volumes you may need to request a limit increase through AWS Support.

For integrating SMS alerts with your monitoring stack, see [using SNS with CloudWatch alarms](https://oneuptime.com/blog/post/use-sns-with-cloudwatch-alarms/view). SNS SMS combined with CloudWatch gives you a solid on-call alerting system.
