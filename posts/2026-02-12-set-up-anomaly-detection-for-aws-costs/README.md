# How to Set Up Anomaly Detection for AWS Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cost Management, Anomaly Detection, CloudWatch, Monitoring

Description: Set up AWS Cost Anomaly Detection to automatically find unexpected spending spikes, with custom monitors, alert thresholds, and integration with SNS and Slack.

---

A runaway Lambda function. An accidentally launched fleet of p4d.24xlarge GPU instances. A DDoS attack driving up CloudFront charges. These things happen, and when they do, the first question is always "why didn't we catch this sooner?"

AWS Cost Anomaly Detection uses machine learning to establish a baseline of your normal spending patterns and alerts you when something deviates. It's free to use and can save you from discovering a $10,000 surprise charge three weeks after it started.

## How Cost Anomaly Detection Works

The service learns your spending patterns over time - daily, weekly, seasonal variations. When actual spending deviates significantly from the expected pattern, it flags it as an anomaly. You define how you want to be notified and what threshold triggers an alert.

It works across three dimensions:
- Individual AWS services
- Linked accounts (in an organization)
- Cost allocation tags

The ML model takes about 2 weeks to establish a baseline from your historical data.

## Setting Up Your First Monitor

You can create monitors at different levels. Start with a service-level monitor that watches all services:

```bash
# Create an anomaly monitor that watches all AWS services
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "AllServicesMonitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'
```

For organizations with multiple accounts, create an account-level monitor:

```bash
# Create a monitor that tracks anomalies per linked account
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "AccountLevelMonitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'
```

For specific high-cost services, create targeted monitors using Cost Explorer expressions:

```bash
# Create a custom monitor for just EC2 and RDS (your biggest cost drivers)
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "ComputeAndDatabaseMonitor",
    "MonitorType": "CUSTOM",
    "MonitorSpecification": {
      "Or": [
        {
          "Dimensions": {
            "Key": "SERVICE",
            "Values": ["Amazon Elastic Compute Cloud - Compute"]
          }
        },
        {
          "Dimensions": {
            "Key": "SERVICE",
            "Values": ["Amazon Relational Database Service"]
          }
        }
      ]
    }
  }'
```

## Creating Alert Subscriptions

Monitors detect anomalies; subscriptions tell you about them. You can set different thresholds and notification methods:

```bash
# Create an email subscription with a $50 daily threshold
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "DailyAlerts",
    "MonitorArnList": [
      "arn:aws:ce::123456789012:anomalymonitor/abc123-def456"
    ],
    "Subscribers": [
      {
        "Address": "cloud-team@example.com",
        "Type": "EMAIL"
      }
    ],
    "ThresholdExpression": {
      "Dimensions": {
        "Key": "ANOMALY_TOTAL_IMPACT_ABSOLUTE",
        "Values": ["50"],
        "MatchOptions": ["GREATER_THAN_OR_EQUAL"]
      }
    },
    "Frequency": "DAILY"
  }'
```

For more immediate alerts, use SNS topics:

```bash
# Create an SNS topic for cost anomaly alerts
aws sns create-topic --name cost-anomaly-alerts

# Subscribe your team's email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:cost-anomaly-alerts \
  --protocol email \
  --notification-endpoint cloud-team@example.com

# Create an immediate alert subscription via SNS
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "ImmediateAlerts",
    "MonitorArnList": [
      "arn:aws:ce::123456789012:anomalymonitor/abc123-def456"
    ],
    "Subscribers": [
      {
        "Address": "arn:aws:sns:us-east-1:123456789012:cost-anomaly-alerts",
        "Type": "SNS"
      }
    ],
    "ThresholdExpression": {
      "Dimensions": {
        "Key": "ANOMALY_TOTAL_IMPACT_ABSOLUTE",
        "Values": ["100"],
        "MatchOptions": ["GREATER_THAN_OR_EQUAL"]
      }
    },
    "Frequency": "IMMEDIATE"
  }'
```

## Sending Alerts to Slack

Connect SNS to a Lambda function that posts to Slack:

```python
import json
import urllib3
import os

http = urllib3.PoolManager()
SLACK_WEBHOOK = os.environ['SLACK_WEBHOOK_URL']

def lambda_handler(event, context):
    """Forward AWS Cost Anomaly alerts to Slack"""
    for record in event['Records']:
        message = json.loads(record['Sns']['Message'])

        # Extract anomaly details
        anomaly_id = message.get('anomalyId', 'unknown')
        service = message.get('dimensionValue', 'Unknown service')
        impact = message.get('impact', {})
        total_impact = impact.get('totalImpact', 0)
        expected = impact.get('totalExpectedSpend', 0)
        actual = impact.get('totalActualSpend', 0)

        # Format the Slack message
        slack_message = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "AWS Cost Anomaly Detected"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Service:*\n{service}"},
                        {"type": "mrkdwn", "text": f"*Anomaly Impact:*\n${total_impact:.2f}"},
                        {"type": "mrkdwn", "text": f"*Expected Spend:*\n${expected:.2f}"},
                        {"type": "mrkdwn", "text": f"*Actual Spend:*\n${actual:.2f}"}
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"<https://console.aws.amazon.com/cost-management/home#/anomaly-detection/monitor/{anomaly_id}|View in AWS Console>"
                    }
                }
            ]
        }

        response = http.request(
            'POST',
            SLACK_WEBHOOK,
            body=json.dumps(slack_message),
            headers={'Content-Type': 'application/json'}
        )

    return {'statusCode': 200}
```

## Setting the Right Thresholds

Thresholds that are too low create alert fatigue. Too high, and you miss real issues. Here's how to calibrate:

**Start generous, then tighten.** Begin with a threshold of $100/day for the absolute impact. After a couple of weeks, review what was flagged and adjust.

**Use percentage-based thresholds for variable workloads:**

```bash
# Alert when spending is 20% above expected (percentage-based)
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "PercentageAlerts",
    "MonitorArnList": [
      "arn:aws:ce::123456789012:anomalymonitor/abc123-def456"
    ],
    "Subscribers": [
      {
        "Address": "cloud-team@example.com",
        "Type": "EMAIL"
      }
    ],
    "ThresholdExpression": {
      "And": [
        {
          "Dimensions": {
            "Key": "ANOMALY_TOTAL_IMPACT_PERCENTAGE",
            "Values": ["20"],
            "MatchOptions": ["GREATER_THAN_OR_EQUAL"]
          }
        },
        {
          "Dimensions": {
            "Key": "ANOMALY_TOTAL_IMPACT_ABSOLUTE",
            "Values": ["25"],
            "MatchOptions": ["GREATER_THAN_OR_EQUAL"]
          }
        }
      ]
    },
    "Frequency": "DAILY"
  }'
```

This example uses a combined threshold: alert only when the anomaly is both 20% above expected AND at least $25 in absolute terms. This prevents alerts for small percentage swings on low-cost services.

## Reviewing Detected Anomalies

Regularly review anomalies to understand patterns:

```python
import boto3
from datetime import datetime, timedelta

def review_recent_anomalies(days=30):
    """Review anomalies detected in the past N days"""
    ce = boto3.client('ce')

    response = ce.get_anomalies(
        DateInterval={
            'StartDate': (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d'),
            'EndDate': datetime.now().strftime('%Y-%m-%d')
        },
        MaxResults=50
    )

    anomalies = response['Anomalies']
    print(f"Found {len(anomalies)} anomalies in the past {days} days\n")

    for anomaly in anomalies:
        aid = anomaly['AnomalyId']
        score = anomaly['AnomalyScore']['CurrentScore']
        impact = anomaly['Impact']
        dimension = anomaly.get('DimensionValue', 'N/A')

        total_impact = impact.get('TotalImpact', 0)
        expected = impact.get('TotalExpectedSpend', 0)
        actual = impact.get('TotalActualSpend', 0)

        start = anomaly['AnomalyStartDate']
        end = anomaly.get('AnomalyEndDate', 'ongoing')

        print(f"Anomaly: {aid[:20]}...")
        print(f"  Service/Dimension: {dimension}")
        print(f"  Period: {start} to {end}")
        print(f"  Score: {score:.2f}")
        print(f"  Expected: ${expected:.2f}, Actual: ${actual:.2f}, Impact: ${total_impact:.2f}")
        print()

review_recent_anomalies()
```

## Combining with Budgets for Defense in Depth

Cost Anomaly Detection catches unexpected spikes. AWS Budgets catch gradual increases. Use both together:

```bash
# Anomaly Detection handles spikes
# Budgets handle gradual creep
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "MonthlyTotal",
    "BudgetLimit": {"Amount": "10000", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "finance@example.com"}
      ]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "finance@example.com"}
      ]
    }
  ]'
```

## Key Takeaways

AWS Cost Anomaly Detection is free, takes 10 minutes to set up, and can save you from nasty billing surprises. Create a service-level monitor first, set a reasonable threshold ($50-100 absolute impact), and connect it to your team's communication channel. Review anomalies weekly to refine your thresholds and understand your spending patterns.

For the broader cost management picture, check out our guides on [creating a cost optimization strategy for AWS](https://oneuptime.com/blog/post/create-a-cost-optimization-strategy-for-aws/view) and [using Trusted Advisor for cost optimization](https://oneuptime.com/blog/post/use-trusted-advisor-for-cost-optimization-recommendations/view).
