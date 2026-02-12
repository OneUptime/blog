# How to Set Up CloudTrail Insights for Anomaly Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudTrail, Security, Anomaly Detection

Description: Learn how to enable and configure CloudTrail Insights to automatically detect unusual API activity patterns in your AWS accounts without writing custom rules.

---

Writing custom queries and alerts for every possible security threat in your AWS environment isn't practical. There are thousands of API actions, and the patterns that indicate a problem are constantly changing. CloudTrail Insights takes a different approach - it learns what "normal" looks like for your account and then flags anything that deviates significantly from that baseline.

It's not magic, and it won't catch everything. But it's a solid layer of detection that requires almost zero ongoing maintenance once you've turned it on.

## What CloudTrail Insights Actually Does

Insights analyzes your management events (the API calls that create, modify, and delete AWS resources) and builds a baseline of normal activity. It looks at two things:

1. **API call rate** - How often specific API actions are called over time
2. **API error rate** - How often API calls result in errors

When either metric spikes beyond what's statistically normal for your account, Insights generates an event. For example, if someone suddenly starts calling `RunInstances` 500 times in an hour when you normally see 5, that'll trigger an insight.

This is useful for catching things like:
- Compromised credentials being used to spin up crypto mining instances
- Automated scripts gone haywire
- Reconnaissance activity from an attacker probing your APIs
- Misconfigured applications hammering an API endpoint

## Enabling Insights

You can enable Insights on an existing trail or when creating a new one. Here's how to enable it on an existing trail through the CLI.

```bash
# Enable both API call rate and API error rate insights
aws cloudtrail put-insight-selectors \
  --trail-name my-trail \
  --insight-selectors '[
    {"InsightType": "ApiCallRateInsight"},
    {"InsightType": "ApiErrorRateInsight"}
  ]'
```

You can verify it's enabled with this command.

```bash
# Check which insight types are enabled
aws cloudtrail get-insight-selectors --trail-name my-trail
```

If you're using Terraform, add this to your trail resource.

```hcl
resource "aws_cloudtrail" "main" {
  name                          = "main-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }

  insight_selector {
    insight_type = "ApiErrorRateInsight"
  }
}
```

## How the Baseline Works

Once you enable Insights, CloudTrail needs about 36 hours to build the initial baseline. During this period, it's analyzing your normal API patterns but won't generate any insights yet. Don't worry if you don't see results immediately.

The baseline is continuously updated, so it adapts to gradual changes in your usage patterns. If your team starts using a new service and API calls gradually increase over weeks, Insights won't flag that. But if the same increase happens in minutes, it will.

The baseline considers:
- Time of day patterns (your API usage probably looks different at 3 AM vs 3 PM)
- Day of week patterns (weekends vs weekdays)
- Historical trends over the past 7 days

## Understanding Insight Events

When an anomaly is detected, Insights generates a pair of events - one when the unusual activity starts and one when it ends. Here's what an insight event looks like.

```json
{
    "eventVersion": "1.08",
    "eventTime": "2026-02-12T14:30:00Z",
    "eventSource": "ec2.amazonaws.com",
    "eventName": "RunInstances",
    "insightDetails": {
        "state": "Start",
        "eventSource": "ec2.amazonaws.com",
        "eventName": "RunInstances",
        "insightType": "ApiCallRateInsight",
        "insightContext": {
            "statistics": {
                "baseline": {
                    "average": 2.5
                },
                "insight": {
                    "average": 150.0
                },
                "insightDuration": 300
            },
            "attributions": [
                {
                    "attribute": "userIdentityArn",
                    "insight": [
                        {
                            "value": "arn:aws:iam::111111111111:user/suspicious-user",
                            "average": 148.0
                        }
                    ],
                    "baseline": [
                        {
                            "value": "arn:aws:iam::111111111111:role/deploy-role",
                            "average": 2.0
                        }
                    ]
                }
            ]
        }
    },
    "eventCategory": "Insight"
}
```

The key fields are:
- **baseline.average** - What's normally expected (2.5 calls in this case)
- **insight.average** - What actually happened (150 calls)
- **attributions** - Who or what caused the anomaly

That attribution data is gold. It tells you exactly which IAM principal is responsible for the spike, so you can investigate immediately rather than digging through logs.

## Viewing Insights in the Console

The CloudTrail console has a dedicated "Insights" tab. You can filter by:
- Event source (which AWS service)
- Event name (which API action)
- Time range

Each insight shows a graph with the baseline activity overlaid with the anomalous spike. It's genuinely helpful for understanding the scale of the anomaly and how long it lasted.

## Setting Up Automated Alerts

Insights are only useful if someone actually sees them. You'll want automated notifications. The best approach is to use EventBridge to catch Insight events and route them to SNS.

First, create the EventBridge rule.

```bash
# Create EventBridge rule to catch CloudTrail Insight events
aws events put-rule \
  --name cloudtrail-insights-alert \
  --event-pattern '{
    "source": ["aws.cloudtrail"],
    "detail-type": ["AWS CloudTrail Insight"],
    "detail": {
      "insightDetails": {
        "state": ["Start"]
      }
    }
  }' \
  --description "Alert on CloudTrail Insight anomalies"
```

Then set the SNS topic as the target.

```bash
# Create an SNS topic for alerts
aws sns create-topic --name cloudtrail-insights-alerts

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:111111111111:cloudtrail-insights-alerts \
  --protocol email \
  --notification-endpoint security-team@example.com

# Add SNS as the EventBridge rule target
aws events put-targets \
  --rule cloudtrail-insights-alert \
  --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:111111111111:cloudtrail-insights-alerts"
```

For richer notifications, use a Lambda function as the target instead of SNS directly. This lets you format the message, include attribution details, and even trigger automated remediation.

```python
import json
import boto3

sns = boto3.client('sns')

def handler(event, context):
    detail = event['detail']
    insight = detail['insightDetails']

    # Build a human-readable message
    message = f"""
CloudTrail Insight Detected!

API: {detail.get('eventSource', 'unknown')} / {detail.get('eventName', 'unknown')}
Type: {insight.get('insightType', 'unknown')}
State: {insight.get('state', 'unknown')}

Baseline average: {insight['insightContext']['statistics']['baseline']['average']}
Anomaly average: {insight['insightContext']['statistics']['insight']['average']}

Top contributors:
"""

    for attribution in insight['insightContext'].get('attributions', []):
        for contributor in attribution.get('insight', []):
            message += f"  - {contributor['value']}: {contributor['average']} calls\n"

    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:111111111111:cloudtrail-insights-alerts',
        Subject=f"CloudTrail Insight: {detail.get('eventName', 'unknown')} anomaly",
        Message=message
    )
```

## Pricing Considerations

Insights isn't free. You're charged per 100,000 events analyzed, currently at $0.35 per 100,000 management events. For most accounts, this works out to a few dollars a month. But if you've got a very high volume of management events, do the math first.

You can check how many management events you generate by looking at your CloudTrail event history or [querying your logs with Athena](https://oneuptime.com/blog/post/query-cloudtrail-logs-athena/view).

## Limitations to Know About

Insights has some real limitations:

- It only works with management events, not data events (like S3 object-level operations)
- The 36-hour baseline warmup means you won't catch anomalies right after enabling it
- It can't detect low-and-slow attacks that stay within normal thresholds
- Single unusual API calls won't trigger it - there needs to be a sustained change in rate
- It doesn't replace rule-based detection for known bad patterns

## Making It Part of Your Security Stack

Insights works best as one layer in a broader detection strategy. Combine it with:

- [CloudWatch alarms for specific CloudTrail events](https://oneuptime.com/blog/post/alerts-specific-cloudtrail-events/view) to catch known-bad patterns
- [GuardDuty](https://oneuptime.com/blog/post/enable-guardduty-threat-detection/view) for threat detection based on CloudTrail, VPC Flow Logs, and DNS logs
- [Security Hub](https://oneuptime.com/blog/post/enable-aws-security-hub/view) to centralize all findings in one place

No single tool catches everything. But Insights fills a useful gap by detecting the unknown-unknowns - the anomalies you didn't know to write rules for.
