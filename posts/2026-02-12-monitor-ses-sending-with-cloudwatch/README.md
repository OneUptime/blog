# How to Monitor SES Sending with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, CloudWatch, Email, Monitoring

Description: Set up comprehensive monitoring for Amazon SES email sending using CloudWatch metrics, alarms, and dashboards to track deliverability and protect your sending reputation.

---

If you're sending email through Amazon SES, you need to monitor what's happening after those emails leave your account. Are they being delivered? Are they bouncing? Are people marking them as spam? Without answers to these questions, you're flying blind.

CloudWatch gives you the visibility you need. Let's set up proper monitoring for SES from scratch.

## What SES Reports to CloudWatch

SES automatically publishes some metrics to CloudWatch, but you get a lot more data when you use configuration sets. Here's what's available:

**Default metrics (always available):**
- Send - number of send API calls
- Delivery - emails accepted by the recipient's mail server
- Bounce - emails that bounced
- Complaint - emails marked as spam by recipients

**With configuration sets (additional metrics):**
- Open - emails opened (requires open tracking)
- Click - links clicked in emails (requires click tracking)
- Rendering Failure - template rendering errors
- Reject - emails rejected by SES before sending

## Setting Up a Configuration Set

Configuration sets are the key to detailed SES monitoring. Create one and attach a CloudWatch event destination.

```bash
# Create the configuration set
aws sesv2 create-configuration-set \
  --configuration-set-name production-email-monitoring

# Add CloudWatch as an event destination
aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name production-email-monitoring \
  --event-destination-name cloudwatch-metrics \
  --event-destination '{
    "Enabled": true,
    "MatchingEventTypes": [
      "SEND", "DELIVERY", "BOUNCE", "COMPLAINT",
      "REJECT", "OPEN", "CLICK", "RENDERING_FAILURE"
    ],
    "CloudWatchDestination": {
      "DimensionConfigurations": [
        {
          "DimensionName": "EmailType",
          "DimensionValueSource": "MESSAGE_TAG",
          "DefaultDimensionValue": "general"
        },
        {
          "DimensionName": "Campaign",
          "DimensionValueSource": "MESSAGE_TAG",
          "DefaultDimensionValue": "none"
        }
      ]
    }
  }'
```

The dimension configurations let you slice your metrics by custom tags. When you send an email, you attach tags that categorize it.

```python
import boto3

ses = boto3.client('ses')

# Send with configuration set and tags
ses.send_email(
    Source='sender@yourdomain.com',
    Destination={'ToAddresses': ['user@example.com']},
    Message={
        'Subject': {'Data': 'Your weekly report'},
        'Body': {'Text': {'Data': 'Report content here'}}
    },
    ConfigurationSetName='production-email-monitoring',
    Tags=[
        {'Name': 'EmailType', 'Value': 'transactional'},
        {'Name': 'Campaign', 'Value': 'weekly-report'}
    ]
)
```

Now you can see CloudWatch metrics broken down by email type and campaign.

## Creating CloudWatch Alarms

The most important alarms are for bounce rate and complaint rate. If these get too high, Amazon will suspend your sending.

```bash
# Alarm when bounce rate exceeds 3%
# SES recommends keeping bounces under 5%
aws cloudwatch put-metric-alarm \
  --alarm-name ses-high-bounce-rate \
  --alarm-description "SES bounce rate is above 3%" \
  --namespace AWS/SES \
  --metric-name Reputation.BounceRate \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 0.03 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ses-alerts \
  --treat-missing-data notBreaching

# Alarm when complaint rate exceeds 0.08%
# SES recommends keeping complaints under 0.1%
aws cloudwatch put-metric-alarm \
  --alarm-name ses-high-complaint-rate \
  --alarm-description "SES complaint rate is above 0.08%" \
  --namespace AWS/SES \
  --metric-name Reputation.ComplaintRate \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 0.0008 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ses-alerts \
  --treat-missing-data notBreaching
```

Also create alarms for sending failures and high rejection rates.

```bash
# Alarm when too many sends are being rejected
aws cloudwatch put-metric-alarm \
  --alarm-name ses-sending-rejected \
  --alarm-description "SES is rejecting emails" \
  --namespace AWS/SES \
  --metric-name Reject \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ses-alerts

# Alarm when delivery rate drops
aws cloudwatch put-metric-alarm \
  --alarm-name ses-low-delivery-rate \
  --alarm-description "SES delivery rate has dropped" \
  --namespace AWS/SES \
  --metric-name Delivery \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ses-alerts \
  --treat-missing-data breaching
```

## Building a CloudWatch Dashboard

A dashboard gives you a single view of your email sending health. Here's how to create one that shows the most important metrics.

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Email Volume",
        "metrics": [
          ["AWS/SES", "Send", {"stat": "Sum", "period": 3600}],
          ["AWS/SES", "Delivery", {"stat": "Sum", "period": 3600}]
        ],
        "view": "timeSeries",
        "region": "us-east-1",
        "period": 3600
      },
      "width": 12,
      "height": 6
    },
    {
      "type": "metric",
      "properties": {
        "title": "Bounces and Complaints",
        "metrics": [
          ["AWS/SES", "Bounce", {"stat": "Sum", "period": 3600, "color": "#d62728"}],
          ["AWS/SES", "Complaint", {"stat": "Sum", "period": 3600, "color": "#ff7f0e"}]
        ],
        "view": "timeSeries",
        "region": "us-east-1",
        "period": 3600
      },
      "width": 12,
      "height": 6
    },
    {
      "type": "metric",
      "properties": {
        "title": "Reputation Metrics",
        "metrics": [
          ["AWS/SES", "Reputation.BounceRate", {"stat": "Average", "period": 3600}],
          ["AWS/SES", "Reputation.ComplaintRate", {"stat": "Average", "period": 3600}]
        ],
        "view": "timeSeries",
        "region": "us-east-1",
        "period": 3600
      },
      "width": 12,
      "height": 6
    },
    {
      "type": "metric",
      "properties": {
        "title": "Engagement (Opens and Clicks)",
        "metrics": [
          ["AWS/SES", "Open", {"stat": "Sum", "period": 3600}],
          ["AWS/SES", "Click", {"stat": "Sum", "period": 3600}]
        ],
        "view": "timeSeries",
        "region": "us-east-1",
        "period": 3600
      },
      "width": 12,
      "height": 6
    }
  ]
}
```

Create the dashboard with the CLI.

```bash
aws cloudwatch put-dashboard \
  --dashboard-name SES-Email-Monitoring \
  --dashboard-body file://ses-dashboard.json
```

## Custom Metrics for Deeper Insights

The built-in metrics are great, but you might want to track additional things. For example, how long it takes for emails to be delivered, or delivery rates broken down by recipient domain.

You can publish custom metrics from your application code.

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def publish_custom_ses_metrics(email_type, recipient_domain, send_time_ms):
    """Publish custom metrics about email sending."""
    cloudwatch.put_metric_data(
        Namespace='Custom/SES',
        MetricData=[
            {
                'MetricName': 'SendLatency',
                'Value': send_time_ms,
                'Unit': 'Milliseconds',
                'Dimensions': [
                    {'Name': 'EmailType', 'Value': email_type},
                    {'Name': 'RecipientDomain', 'Value': recipient_domain}
                ]
            },
            {
                'MetricName': 'SendAttempt',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'EmailType', 'Value': email_type},
                    {'Name': 'RecipientDomain', 'Value': recipient_domain}
                ]
            }
        ]
    )
```

## Querying Metrics Programmatically

Sometimes you want to pull metrics into your own reports or dashboards. Here's how to query SES metrics from the API.

```python
from datetime import datetime, timedelta

cloudwatch = boto3.client('cloudwatch')

# Get bounce count for the last 24 hours
response = cloudwatch.get_metric_statistics(
    Namespace='AWS/SES',
    MetricName='Bounce',
    StartTime=datetime.utcnow() - timedelta(hours=24),
    EndTime=datetime.utcnow(),
    Period=3600,
    Statistics=['Sum']
)

# Calculate bounce rate
sends = cloudwatch.get_metric_statistics(
    Namespace='AWS/SES',
    MetricName='Send',
    StartTime=datetime.utcnow() - timedelta(hours=24),
    EndTime=datetime.utcnow(),
    Period=3600,
    Statistics=['Sum']
)

total_bounces = sum(dp['Sum'] for dp in response['Datapoints'])
total_sends = sum(dp['Sum'] for dp in sends['Datapoints'])

if total_sends > 0:
    bounce_rate = (total_bounces / total_sends) * 100
    print(f"24h bounce rate: {bounce_rate:.2f}%")
    print(f"Total sends: {int(total_sends)}, Bounces: {int(total_bounces)}")
```

## Setting Up SNS for Alarm Notifications

Your alarms need to notify someone when they fire. Create an SNS topic and subscribe your team.

```bash
# Create the notification topic
aws sns create-topic --name ses-alerts

# Subscribe email addresses
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:ses-alerts \
  --protocol email \
  --notification-endpoint ops-team@yourdomain.com

# For Slack notifications, see our guide on AWS Chatbot
```

For Slack and Teams integration, check out our post on [using AWS Chatbot for Slack and Teams notifications](https://oneuptime.com/blog/post/use-aws-chatbot-for-slack-and-teams-notifications/view).

## Monitoring Checklist

Here's what you should have set up at a minimum:

1. A configuration set with CloudWatch event destination
2. Alarms for bounce rate (threshold: 3%)
3. Alarms for complaint rate (threshold: 0.08%)
4. Alarms for sending failures and rejections
5. A dashboard showing volume, bounces, complaints, and engagement
6. SNS notifications for when alarms fire
7. Regular review of metrics (weekly at minimum)

For handling the bounces and complaints you detect through monitoring, see our guide on [handling SES bounces and complaints with SNS](https://oneuptime.com/blog/post/handle-ses-bounces-and-complaints-with-sns/view).

## Summary

Monitoring SES with CloudWatch isn't just about knowing your email volume. It's about protecting your sending reputation, catching problems early, and understanding how recipients engage with your emails. Set up the alarms, build the dashboard, and check it regularly. The few hours you spend on this setup will save you from the much longer process of recovering a damaged sending reputation.
