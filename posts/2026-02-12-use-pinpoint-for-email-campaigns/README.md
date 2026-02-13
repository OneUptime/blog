# How to Use Pinpoint for Email Campaigns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Pinpoint, Email, Marketing, Campaigns

Description: Build and manage targeted email campaigns with Amazon Pinpoint, including template creation, audience segmentation, scheduling, A/B testing, and performance analytics.

---

Amazon Pinpoint builds on top of SES to give you a proper email campaign platform. While SES handles the raw sending, Pinpoint adds the marketing layer - templates, segmentation, scheduling, A/B testing, and analytics. If you've outgrown manually sending emails through SES and need to run real campaigns, Pinpoint is the next step.

## Prerequisites

Before you dive in, make sure you have:

- A Pinpoint project (application) created
- The email channel enabled with a verified SES identity
- Some endpoints (users) imported

If you need help with the initial setup, check our guide on [setting up Amazon Pinpoint for marketing campaigns](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-pinpoint-for-marketing-campaigns/view).

## Creating Email Templates

Pinpoint templates are more feature-rich than SES templates. They support personalization, default values, and can be versioned.

```python
import boto3
import json

pinpoint = boto3.client('pinpoint', region_name='us-east-1')

def create_email_template(name, subject, html, text, default_subs=None):
    """Create a reusable email template in Pinpoint."""
    template_request = {
        'Subject': subject,
        'HtmlPart': html,
        'TextPart': text
    }

    if default_subs:
        template_request['DefaultSubstitutions'] = json.dumps(default_subs)

    pinpoint.create_email_template(
        TemplateName=name,
        EmailTemplateRequest=template_request
    )
    print(f"Template '{name}' created")

# Create a monthly newsletter template
create_email_template(
    'monthly-newsletter',
    'Hey {{User.UserAttributes.FirstName}}, your {{Month}} update is here',
    """
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Hello {{User.UserAttributes.FirstName}},</h1>
        <p>Here is your {{Month}} newsletter with the latest updates.</p>

        <h2>What's New</h2>
        <div>{{Content}}</div>

        <h2>Your Stats</h2>
        <p>You have been with us since {{User.UserAttributes.SignupDate}}.</p>
        <p>Current plan: {{User.UserAttributes.Plan}}</p>

        <hr style="border: 1px solid #eee;">
        <p style="font-size: 12px; color: #999;">
            <a href="{{UnsubscribeUrl}}">Unsubscribe</a>
        </p>
    </body>
    </html>
    """,
    'Hello {{User.UserAttributes.FirstName}}, here is your {{Month}} newsletter.',
    default_subs={
        'Month': 'February',
        'Content': 'No updates this month.',
        'UnsubscribeUrl': 'https://yourdomain.com/unsubscribe'
    }
)
```

The `{{User.UserAttributes.X}}` syntax pulls data directly from the endpoint attributes you've set up in Pinpoint. This means you don't have to pass personalization data at send time - Pinpoint fills it in automatically.

## Building Segments

Effective campaigns depend on good segmentation. Here's how to create different types of segments.

### Attribute-Based Segments

```python
def create_attribute_segment(app_id, name, attribute_filters):
    """Create a segment based on user attributes."""
    dimensions = {'Attributes': {}}

    for attr_name, values in attribute_filters.items():
        dimensions['Attributes'][attr_name] = {
            'AttributeType': 'INCLUSIVE',
            'Values': values
        }

    response = pinpoint.create_segment(
        ApplicationId=app_id,
        WriteSegmentRequest={
            'Name': name,
            'SegmentGroups': {
                'Groups': [{
                    'Dimensions': [dimensions],
                    'SourceType': 'ALL',
                    'Type': 'ALL'
                }],
                'Include': 'ALL'
            }
        }
    )
    return response['SegmentResponse']['Id']

# Segment: Premium users who are interested in monitoring
premium_monitoring = create_attribute_segment(
    APP_ID,
    'Premium Monitoring Users',
    {'Plan': ['premium', 'enterprise'], 'Interests': ['monitoring']}
)

# Segment: Free tier users (potential upsell targets)
free_users = create_attribute_segment(
    APP_ID,
    'Free Tier Users',
    {'Plan': ['free']}
)
```

### Activity-Based Segments

You can also segment based on email engagement - people who opened recent emails, people who haven't engaged in a while, etc.

```python
def create_inactive_segment(app_id, name, days_inactive=30):
    """Create a segment of users who haven't engaged recently."""
    response = pinpoint.create_segment(
        ApplicationId=app_id,
        WriteSegmentRequest={
            'Name': name,
            'SegmentGroups': {
                'Groups': [{
                    'Dimensions': [{
                        'Behavior': {
                            'Recency': {
                                'Duration': 'DAY_30' if days_inactive == 30 else 'DAY_14',
                                'RecencyType': 'INACTIVE'
                            }
                        }
                    }],
                    'SourceType': 'ALL',
                    'Type': 'ALL'
                }],
                'Include': 'ALL'
            }
        }
    )
    return response['SegmentResponse']['Id']

# Create segment of users inactive for 30 days
inactive_users = create_inactive_segment(APP_ID, 'Inactive 30 Days', 30)
```

## Creating and Scheduling Campaigns

With templates and segments ready, create the campaign.

```python
def create_email_campaign(app_id, name, segment_id, template_name,
                          schedule_time=None, template_version=None):
    """Create an email campaign using a Pinpoint template."""

    # Configure the schedule
    if schedule_time:
        schedule = {
            'StartTime': schedule_time,
            'Timezone': 'UTC',
            'IsLocalTime': False
        }
    else:
        schedule = {'StartTime': 'IMMEDIATE'}

    # Template configuration
    template_config = {
        'EmailTemplate': {
            'Name': template_name
        }
    }
    if template_version:
        template_config['EmailTemplate']['Version'] = template_version

    response = pinpoint.create_campaign(
        ApplicationId=app_id,
        WriteCampaignRequest={
            'Name': name,
            'SegmentId': segment_id,
            'TemplateConfiguration': template_config,
            'Schedule': schedule,
            'Limits': {
                'Daily': 0,           # 0 means unlimited
                'MaximumDuration': 60, # seconds the campaign can run
                'MessagesPerSecond': 50,
                'Total': 0            # 0 means unlimited
            }
        }
    )

    campaign_id = response['CampaignResponse']['Id']
    print(f"Campaign '{name}' created with ID: {campaign_id}")
    return campaign_id

# Launch campaign immediately
create_email_campaign(
    APP_ID,
    'February Newsletter - Premium',
    premium_monitoring,
    'monthly-newsletter'
)

# Schedule campaign for next Tuesday at 10 AM UTC
create_email_campaign(
    APP_ID,
    'Re-engagement - Inactive Users',
    inactive_users,
    'monthly-newsletter',
    schedule_time='2026-02-17T10:00:00+00:00'
)
```

## A/B Testing Subject Lines

A/B testing is essential for improving open rates. Pinpoint makes it easy to test different versions of your campaign.

```python
def create_ab_test(app_id, name, segment_id, variants):
    """Create an A/B test campaign with different subject lines."""

    # The first variant is the default treatment
    default = variants[0]
    additional = variants[1:]

    campaign_request = {
        'Name': name,
        'SegmentId': segment_id,
        'MessageConfiguration': {
            'EmailMessage': {
                'Title': default['subject'],
                'HtmlBody': default['html'],
                'Body': default.get('text', ''),
                'FromAddress': 'marketing@yourdomain.com'
            }
        },
        'Schedule': {'StartTime': 'IMMEDIATE'},
        'HoldoutPercent': 0
    }

    if additional:
        campaign_request['AdditionalTreatments'] = [
            {
                'SizePercent': v.get('percent', 50),
                'TreatmentName': v['name'],
                'MessageConfiguration': {
                    'EmailMessage': {
                        'Title': v['subject'],
                        'HtmlBody': v['html'],
                        'Body': v.get('text', ''),
                        'FromAddress': 'marketing@yourdomain.com'
                    }
                }
            }
            for v in additional
        ]

    response = pinpoint.create_campaign(
        ApplicationId=app_id,
        WriteCampaignRequest=campaign_request
    )
    return response['CampaignResponse']['Id']

# Test emoji vs. no emoji in subject line
create_ab_test(APP_ID, 'Subject Line Test Feb', premium_monitoring, [
    {
        'name': 'No Emoji',
        'subject': 'Your February Monitoring Report',
        'html': '<h1>February Report</h1><p>Details inside...</p>',
        'percent': 50
    },
    {
        'name': 'With Question',
        'subject': 'How did your uptime look in February?',
        'html': '<h1>February Report</h1><p>Details inside...</p>',
        'percent': 50
    }
])
```

## Analyzing Campaign Performance

After a campaign runs, dig into the metrics.

```python
def get_campaign_metrics(app_id, campaign_id):
    """Retrieve detailed campaign performance metrics."""

    # Get campaign activities
    activities = pinpoint.get_campaign_activities(
        ApplicationId=app_id,
        CampaignId=campaign_id
    )

    for activity in activities['ActivitiesResponse']['Item']:
        print(f"\nTreatment: {activity.get('TreatmentId', 'Default')}")
        print(f"  State: {activity['State']}")
        print(f"  Successful: {activity.get('SuccessfulEndpointCount', 0)}")
        print(f"  Total targeted: {activity.get('TotalEndpointCount', 0)}")

        # Calculate delivery rate
        total = activity.get('TotalEndpointCount', 0)
        success = activity.get('SuccessfulEndpointCount', 0)
        if total > 0:
            rate = (success / total) * 100
            print(f"  Delivery rate: {rate:.1f}%")

def get_email_kpis(app_id):
    """Get email-specific KPIs for the application."""
    metrics_to_check = [
        'email-open-rate',
        'email-click-rate',
        'email-bounce-rate',
        'email-complaint-rate'
    ]

    for metric in metrics_to_check:
        try:
            response = pinpoint.get_application_date_range_kpi(
                ApplicationId=app_id,
                KpiName=metric,
                StartTime='2026-02-01T00:00:00Z',
                EndTime='2026-02-12T00:00:00Z'
            )
            rows = response['ApplicationDateRangeKpiResponse']['KpiResult']['Rows']
            print(f"\n{metric}:")
            for row in rows:
                print(f"  {row}")
        except Exception as e:
            print(f"Could not fetch {metric}: {e}")
```

## Recurring Campaigns with Journeys

For recurring email sequences (onboarding, drip campaigns), use Pinpoint Journeys instead of one-off campaigns. Journeys let you build multi-step, condition-based flows.

```python
def create_simple_journey(app_id, name, segment_id):
    """Create a basic welcome email journey."""
    response = pinpoint.create_journey(
        ApplicationId=app_id,
        WriteJourneyRequest={
            'Name': name,
            'StartCondition': {
                'SegmentStartCondition': {
                    'SegmentId': segment_id
                }
            },
            'Activities': {
                'welcome-email': {
                    'EMAIL': {
                        'TemplateName': 'welcome-email',
                        'TemplateVersion': '1'
                    },
                    'NextActivity': 'wait-3-days'
                },
                'wait-3-days': {
                    'Wait': {
                        'WaitTime': {
                            'WaitFor': 'P3D'  # ISO 8601 duration: 3 days
                        }
                    },
                    'NextActivity': 'followup-email'
                },
                'followup-email': {
                    'EMAIL': {
                        'TemplateName': 'followup-email',
                        'TemplateVersion': '1'
                    }
                }
            },
            'StartActivity': 'welcome-email',
            'State': 'ACTIVE',
            'Schedule': {
                'StartTime': '2026-02-13T00:00:00+00:00'
            }
        }
    )
    return response['JourneyResponse']['Id']
```

## Summary

Pinpoint email campaigns give you marketing automation that lives entirely within AWS. Templates with auto-personalization, dynamic segments, A/B testing, and detailed analytics - it's a solid platform that you can manage entirely through code. The biggest advantage over third-party tools is the integration with your existing AWS infrastructure and the pricing model. Start with simple campaigns, measure results, and iterate. That's how good email marketing works regardless of the platform.
