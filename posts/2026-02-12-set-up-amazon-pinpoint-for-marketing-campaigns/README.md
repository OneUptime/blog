# How to Set Up Amazon Pinpoint for Marketing Campaigns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Pinpoint, Marketing, Email, SMS

Description: A complete walkthrough of setting up Amazon Pinpoint for multi-channel marketing campaigns including audience segmentation, campaign creation, and analytics.

---

Amazon Pinpoint is AWS's marketing and analytics platform. Unlike SES, which is purely about sending email, Pinpoint handles the full lifecycle - audience segmentation, campaign scheduling, A/B testing, and analytics across email, SMS, push notifications, and voice channels. If you need to move beyond one-off sends and start running actual marketing campaigns, Pinpoint is where you go.

Let's set it up from scratch.

## Creating a Pinpoint Project

Everything in Pinpoint lives inside a project (also called an application). Think of it as a container for your campaigns, segments, and analytics.

```bash
# Create a new Pinpoint project
aws pinpoint create-app \
  --create-application-request Name=my-marketing-app

# The response includes an ApplicationId - save this
# {
#   "ApplicationResponse": {
#     "Arn": "arn:aws:mobiletargeting:us-east-1:123456789:apps/abc123",
#     "Id": "abc123def456",
#     "Name": "my-marketing-app"
#   }
# }
```

Store the Application ID somewhere safe - you'll use it in every subsequent API call.

## Enabling Email Channel

Pinpoint doesn't have email enabled by default. You need to configure it, and it uses SES under the hood.

```bash
# Enable the email channel
aws pinpoint update-email-channel \
  --application-id abc123def456 \
  --email-channel-request '{
    "Enabled": true,
    "FromAddress": "marketing@yourdomain.com",
    "Identity": "arn:aws:ses:us-east-1:123456789:identity/yourdomain.com"
  }'
```

The identity ARN should point to your verified SES domain or email address. If you haven't set up SES yet, do that first - Pinpoint relies on SES for actual email delivery.

## Enabling SMS Channel

For SMS campaigns, you'll need to configure the SMS channel and possibly request a dedicated phone number.

```bash
# Enable SMS channel
aws pinpoint update-sms-channel \
  --application-id abc123def456 \
  --sms-channel-request '{
    "Enabled": true
  }'

# Request a dedicated long code or short code through the console
# or use the phone number management API
```

For a deeper dive into SMS, see our post on [using Pinpoint for SMS campaigns](https://oneuptime.com/blog/post/2026-02-12-use-pinpoint-for-sms-campaigns/view).

## Importing Your Audience

Before you can run campaigns, Pinpoint needs to know about your users. You import endpoints - each one represents a way to reach a user (email address, phone number, device token).

### Direct API Import

For small datasets, use the API directly.

```python
import boto3
import json

pinpoint = boto3.client('pinpoint', region_name='us-east-1')
APP_ID = 'abc123def456'

def import_user(user_id, email, attributes=None):
    """Import a single user endpoint into Pinpoint."""
    endpoint = {
        'ChannelType': 'EMAIL',
        'Address': email,
        'Attributes': attributes or {},
        'User': {
            'UserId': user_id
        }
    }

    pinpoint.update_endpoint(
        ApplicationId=APP_ID,
        EndpointId=f'email-{user_id}',
        EndpointRequest=endpoint
    )

# Import some users
import_user('user-001', 'alice@example.com', {
    'Plan': ['premium'],
    'SignupDate': ['2025-06-15'],
    'Interests': ['devops', 'monitoring']
})

import_user('user-002', 'bob@example.com', {
    'Plan': ['free'],
    'SignupDate': ['2026-01-10'],
    'Interests': ['security', 'compliance']
})
```

### Bulk Import from S3

For larger datasets, create a CSV or JSON file in S3 and run an import job.

```python
def start_bulk_import(app_id, s3_url, role_arn):
    """Start a bulk endpoint import from S3."""
    response = pinpoint.create_import_job(
        ApplicationId=app_id,
        ImportJobRequest={
            'DefineSegment': True,
            'Format': 'JSON',
            'RegisterEndpoints': True,
            'RoleArn': role_arn,
            'S3Url': s3_url,
            'SegmentName': 'imported-users'
        }
    )

    job_id = response['ImportJobResponse']['Id']
    print(f"Import job started: {job_id}")
    return job_id

# The S3 file should contain one JSON endpoint per line (NDJSON format)
# Each line looks like:
# {"ChannelType":"EMAIL","Address":"user@example.com","User":{"UserId":"123"},"Attributes":{"Plan":["premium"]}}
```

## Creating Segments

Segments are groups of users you want to target. You can create them based on user attributes, behavior, or import them directly.

```python
def create_segment(app_id, name, filters):
    """Create a dynamic segment based on attribute filters."""
    response = pinpoint.create_segment(
        ApplicationId=app_id,
        WriteSegmentRequest={
            'Name': name,
            'SegmentGroups': {
                'Groups': [{
                    'Dimensions': [{
                        'Attributes': filters
                    }],
                    'SourceType': 'ALL',
                    'Type': 'ALL'
                }],
                'Include': 'ALL'
            }
        }
    )

    segment_id = response['SegmentResponse']['Id']
    print(f"Segment created: {segment_id}")
    return segment_id

# Create a segment of premium users interested in devops
segment_id = create_segment(APP_ID, 'Premium DevOps Users', {
    'Plan': {
        'AttributeType': 'INCLUSIVE',
        'Values': ['premium']
    },
    'Interests': {
        'AttributeType': 'INCLUSIVE',
        'Values': ['devops']
    }
})
```

## Creating a Campaign

Now for the main event - creating and scheduling a campaign.

```python
from datetime import datetime, timedelta

def create_campaign(app_id, name, segment_id, subject, html_body, text_body,
                    schedule_time=None):
    """Create and optionally schedule an email campaign."""

    # Build the schedule
    if schedule_time:
        schedule = {
            'StartTime': schedule_time.strftime('%Y-%m-%dT%H:%M:%S'),
            'Timezone': 'UTC'
        }
    else:
        # Send immediately
        schedule = {
            'StartTime': 'IMMEDIATE'
        }

    response = pinpoint.create_campaign(
        ApplicationId=app_id,
        WriteCampaignRequest={
            'Name': name,
            'SegmentId': segment_id,
            'MessageConfiguration': {
                'EmailMessage': {
                    'Title': subject,
                    'HtmlBody': html_body,
                    'Body': text_body,
                    'FromAddress': 'marketing@yourdomain.com'
                }
            },
            'Schedule': schedule
        }
    )

    campaign_id = response['CampaignResponse']['Id']
    print(f"Campaign created: {campaign_id}")
    return campaign_id

# Create a campaign scheduled for next week
next_monday = datetime.utcnow() + timedelta(days=(7 - datetime.utcnow().weekday()) % 7)
next_monday = next_monday.replace(hour=14, minute=0, second=0)  # 2 PM UTC

create_campaign(
    APP_ID,
    'February DevOps Newsletter',
    segment_id,
    'Your February DevOps Update',
    '<h1>February Newsletter</h1><p>Here is what is new this month...</p>',
    'February Newsletter\n\nHere is what is new this month...',
    schedule_time=next_monday
)
```

## A/B Testing

Pinpoint supports A/B testing out of the box. You can test different messages against segments of your audience.

```python
def create_ab_test_campaign(app_id, name, segment_id, treatments):
    """Create a campaign with A/B testing."""
    response = pinpoint.create_campaign(
        ApplicationId=app_id,
        WriteCampaignRequest={
            'Name': name,
            'SegmentId': segment_id,
            'AdditionalTreatments': [
                {
                    'MessageConfiguration': {
                        'EmailMessage': {
                            'Title': t['subject'],
                            'HtmlBody': t['html'],
                            'FromAddress': 'marketing@yourdomain.com'
                        }
                    },
                    'SizePercent': t['percent'],
                    'TreatmentName': t['name']
                }
                for t in treatments[1:]  # All except the default
            ],
            'MessageConfiguration': {
                'EmailMessage': {
                    'Title': treatments[0]['subject'],
                    'HtmlBody': treatments[0]['html'],
                    'FromAddress': 'marketing@yourdomain.com'
                }
            },
            'HoldoutPercent': 0,
            'Schedule': {'StartTime': 'IMMEDIATE'}
        }
    )
    return response['CampaignResponse']['Id']

# Test two different subject lines
create_ab_test_campaign(APP_ID, 'Subject Line Test', segment_id, [
    {
        'name': 'Control',
        'subject': 'Your February Update',
        'html': '<h1>February Update</h1><p>Content here</p>',
        'percent': 50
    },
    {
        'name': 'Variant A',
        'subject': 'You will not want to miss this',
        'html': '<h1>February Update</h1><p>Content here</p>',
        'percent': 50
    }
])
```

## Viewing Campaign Analytics

After a campaign runs, check the results.

```python
def get_campaign_results(app_id, campaign_id):
    """Get analytics for a completed campaign."""
    response = pinpoint.get_campaign_activities(
        ApplicationId=app_id,
        CampaignId=campaign_id
    )

    for activity in response['ActivitiesResponse']['Item']:
        print(f"Activity: {activity.get('TreatmentId', 'Default')}")
        print(f"  Successful deliveries: {activity.get('SuccessfulEndpointCount', 0)}")
        print(f"  Total endpoints: {activity.get('TotalEndpointCount', 0)}")
        print(f"  State: {activity.get('State', 'unknown')}")
```

## Summary

Pinpoint gives you a lot more than raw email sending. The audience management, segmentation, scheduling, and A/B testing features make it a genuine marketing platform built on top of AWS infrastructure. It takes more setup than SES alone, but if you're running real marketing campaigns, the investment is worth it. Start with a small segment, test your campaigns, and scale up as you learn what works for your audience.
