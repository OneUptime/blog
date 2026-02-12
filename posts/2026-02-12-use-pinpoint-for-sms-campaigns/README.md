# How to Use Pinpoint for SMS Campaigns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Pinpoint, SMS, Marketing, Messaging

Description: Set up and run SMS campaigns with Amazon Pinpoint, including number provisioning, compliance, message sending, two-way SMS, and delivery analytics.

---

SMS has open rates above 90% - far higher than email. That makes it incredibly effective for time-sensitive messages like alerts, appointment reminders, verification codes, and promotional offers. Amazon Pinpoint handles SMS delivery to over 200 countries, managing the complexity of carrier regulations and number formatting for you.

But SMS comes with more regulatory requirements than email. You need to get the compliance right before sending a single message.

## Enabling the SMS Channel

Start by enabling SMS in your Pinpoint project.

```bash
# Enable SMS channel
aws pinpoint update-sms-channel \
  --application-id YOUR_APP_ID \
  --sms-channel-request '{
    "Enabled": true
  }'
```

## Getting a Phone Number

You need an originating phone number to send SMS. Pinpoint supports several types:

- **Long codes** - standard 10-digit numbers. Good for conversational messaging. Lower throughput.
- **Short codes** - 5 or 6-digit numbers. High throughput. Take weeks to provision and cost more.
- **Toll-free numbers** - Good for transactional messaging in the US and Canada.
- **10DLC** (10-Digit Long Code) - registered long codes for A2P messaging in the US. Required since 2023.

For US messaging, you'll likely need a 10DLC registration.

```bash
# Request a toll-free number through the console
# or use the phone number management API
aws pinpoint-sms-voice-v2 request-phone-number \
  --iso-country-code US \
  --message-type TRANSACTIONAL \
  --number-capabilities SMS \
  --number-type TOLL_FREE
```

## 10DLC Registration

If you're sending SMS to US numbers, you need to register your brand and campaign with the 10DLC system. This is a regulatory requirement, not an AWS thing.

The registration happens through the AWS Pinpoint SMS console:

1. Register your company (brand)
2. Register your use case (campaign)
3. Associate your phone numbers with the campaign
4. Wait for approval (usually a few days)

Without 10DLC registration, your messages will be filtered by carriers and your throughput will be severely limited.

## Sending a Direct SMS

Once your number is provisioned, send messages.

```python
import boto3

pinpoint = boto3.client('pinpoint', region_name='us-east-1')
APP_ID = 'YOUR_APP_ID'

def send_sms(phone_number, message, message_type='TRANSACTIONAL'):
    """Send an SMS message to a single number.

    message_type: 'TRANSACTIONAL' or 'PROMOTIONAL'
    - TRANSACTIONAL: time-sensitive messages (verification codes, alerts)
    - PROMOTIONAL: marketing messages (offers, newsletters)
    """
    response = pinpoint.send_messages(
        ApplicationId=APP_ID,
        MessageRequest={
            'Addresses': {
                phone_number: {
                    'ChannelType': 'SMS'
                }
            },
            'MessageConfiguration': {
                'SMSMessage': {
                    'Body': message,
                    'MessageType': message_type,
                    'OriginationNumber': '+11234567890'  # Your provisioned number
                }
            }
        }
    )

    # Check the result
    result = response['MessageResponse']['Result'][phone_number]
    status = result['StatusCode']
    delivery_status = result['DeliveryStatus']

    print(f"Status: {status}, Delivery: {delivery_status}")
    return result

# Send a transactional SMS
send_sms('+11234567890', 'Your verification code is 483921')

# Send a promotional SMS
send_sms('+11234567890', 'Flash sale! 30% off all plans today only. Reply STOP to opt out.',
         message_type='PROMOTIONAL')
```

## Importing SMS Endpoints

To use Pinpoint's campaign features for SMS, you need to register phone numbers as endpoints.

```python
def register_sms_endpoint(user_id, phone_number, attributes=None):
    """Register a phone number as an SMS endpoint."""
    endpoint_request = {
        'Address': phone_number,
        'ChannelType': 'SMS',
        'OptOut': 'NONE',  # User has opted in
        'User': {
            'UserId': user_id
        }
    }

    if attributes:
        endpoint_request['Attributes'] = attributes

    pinpoint.update_endpoint(
        ApplicationId=APP_ID,
        EndpointId=f'sms-{user_id}',
        EndpointRequest=endpoint_request
    )

# Register some users
register_sms_endpoint('user-001', '+11234567890', {
    'Plan': ['premium'],
    'SMSOptIn': ['true'],
    'City': ['New York']
})

register_sms_endpoint('user-002', '+10987654321', {
    'Plan': ['free'],
    'SMSOptIn': ['true'],
    'City': ['San Francisco']
})
```

## Creating an SMS Campaign

With endpoints registered and segments defined, create an SMS campaign.

```python
from datetime import datetime, timedelta

def create_sms_campaign(app_id, name, segment_id, message,
                        message_type='PROMOTIONAL', schedule_time=None):
    """Create an SMS campaign targeting a segment."""

    schedule = {'StartTime': 'IMMEDIATE'}
    if schedule_time:
        schedule = {
            'StartTime': schedule_time,
            'Timezone': 'America/New_York',
            'IsLocalTime': True  # Send at the specified time in each user's timezone
        }

    response = pinpoint.create_campaign(
        ApplicationId=app_id,
        WriteCampaignRequest={
            'Name': name,
            'SegmentId': segment_id,
            'MessageConfiguration': {
                'SMSMessage': {
                    'Body': message,
                    'MessageType': message_type,
                    'OriginationNumber': '+11234567890'
                }
            },
            'Schedule': schedule,
            'Limits': {
                'Daily': 1,    # Max 1 SMS per user per day
                'Total': 3,    # Max 3 SMS per user for this campaign
                'MessagesPerSecond': 20
            }
        }
    )

    campaign_id = response['CampaignResponse']['Id']
    print(f"SMS campaign created: {campaign_id}")
    return campaign_id

# Create a promotional campaign
create_sms_campaign(
    APP_ID,
    'February Flash Sale',
    premium_segment_id,
    'Hi {{User.UserAttributes.FirstName}}! Premium members get 30% off this weekend. Use code FEB30. Reply STOP to opt out.'
)
```

## Handling Opt-Outs

When someone replies STOP, AWS automatically handles the opt-out at the carrier level. But you should also update your own records.

```python
def setup_sms_opt_out_handler():
    """Process opt-out events from Pinpoint."""
    # Pinpoint publishes events to Kinesis or CloudWatch
    # Set up event streaming first

    pinpoint.put_event_stream(
        ApplicationId=APP_ID,
        WriteEventStream={
            'DestinationStreamArn': 'arn:aws:kinesis:us-east-1:123456789:stream/pinpoint-events',
            'RoleArn': 'arn:aws:iam::123456789:role/pinpoint-kinesis-role'
        }
    )

# Lambda function to process opt-out events from Kinesis
def process_sms_event(event, context):
    """Process Pinpoint SMS events from Kinesis."""
    import json
    import base64

    for record in event['Records']:
        payload = json.loads(base64.b64decode(record['kinesis']['data']))
        event_type = payload.get('event_type')

        if event_type == '_SMS.OPTOUT':
            phone = payload.get('attributes', {}).get('destination_phone_number')
            print(f"SMS opt-out received for: {phone}")
            # Update your database to mark this user as opted out
            mark_sms_opted_out(phone)

        elif event_type == '_SMS.SUCCESS':
            print(f"SMS delivered successfully")

        elif event_type == '_SMS.FAILURE':
            phone = payload.get('attributes', {}).get('destination_phone_number')
            reason = payload.get('attributes', {}).get('record_status')
            print(f"SMS delivery failed for {phone}: {reason}")
```

## Two-Way SMS

You can set up two-way SMS so users can reply to your messages and trigger automated responses.

```python
# Configure two-way SMS on your phone number
# This is typically done through the console, but you can use the SMS Voice V2 API

sms_voice = boto3.client('pinpoint-sms-voice-v2', region_name='us-east-1')

# When a user replies, the message goes to an SNS topic
# Your Lambda function processes it

def handle_inbound_sms(event, context):
    """Process inbound SMS messages."""
    import json

    for record in event['Records']:
        message = json.loads(record['Sns']['Message'])

        sender = message.get('originationNumber')
        body = message.get('messageBody', '').strip().upper()
        destination = message.get('destinationNumber')

        print(f"Received from {sender}: {body}")

        if body == 'HELP':
            send_sms(sender, 'For support, visit https://yourdomain.com/help or call 1-800-XXX-XXXX')
        elif body == 'STATUS':
            # Look up the user's account status
            status = get_user_status(sender)
            send_sms(sender, f'Your account status: {status}')
        elif body == 'YES':
            send_sms(sender, 'Great! You are confirmed. We will send you a reminder.')
```

## SMS Spending Limits

AWS has spending limits on SMS to prevent runaway costs. Check and adjust yours.

```bash
# Check current spending limit
aws pinpoint-sms-voice-v2 describe-spend-limits

# Check current month's spending
aws pinpoint-sms-voice-v2 describe-account-attributes
```

You can request a spending limit increase through AWS Support if you need to send more messages.

## Compliance Checklist

SMS has strict regulations. Before you send any messages:

1. **Get explicit opt-in.** You need written consent before sending SMS. A checkbox on a form works.
2. **Include opt-out instructions.** Every promotional message must include "Reply STOP to opt out" or equivalent.
3. **Respect quiet hours.** Don't send promotional messages before 8 AM or after 9 PM in the recipient's timezone.
4. **Keep records.** Store proof of opt-in for every phone number.
5. **Register for 10DLC** if sending to US numbers.
6. **Don't share or sell numbers.** The opt-in is specific to your company and use case.

## Analyzing SMS Performance

Track your SMS campaign results.

```python
def get_sms_metrics(app_id):
    """Get SMS delivery and engagement metrics."""
    metrics = [
        'sms-success-rate',
        'sms-spend'
    ]

    for metric in metrics:
        try:
            response = pinpoint.get_application_date_range_kpi(
                ApplicationId=app_id,
                KpiName=metric,
                StartTime='2026-02-01T00:00:00Z',
                EndTime='2026-02-12T00:00:00Z'
            )
            print(f"\n{metric}:")
            for row in response['ApplicationDateRangeKpiResponse']['KpiResult']['Rows']:
                print(f"  {row}")
        except Exception as e:
            print(f"Error fetching {metric}: {e}")
```

## Summary

SMS through Pinpoint is powerful but comes with more responsibility than email. The regulatory requirements are stricter, the costs are higher per message, and the impact on users is more immediate. Get your compliance right, register for 10DLC, respect opt-outs, and use segmentation to target only the users who want to hear from you. When done right, SMS campaigns consistently outperform email in engagement rates.
