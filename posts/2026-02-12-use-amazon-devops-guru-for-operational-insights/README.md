# How to Use Amazon DevOps Guru for Operational Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DevOps Guru, Monitoring, Operations, Machine Learning

Description: Learn how to set up Amazon DevOps Guru to detect operational anomalies, get proactive insights, and reduce downtime across your AWS infrastructure.

---

Something breaks in production. The PagerDuty alert fires. You spend the next hour staring at CloudWatch dashboards, trying to figure out which metric went sideways first and what caused it. Sound familiar?

Amazon DevOps Guru is designed to make that process less painful. It uses machine learning to analyze your AWS resources, detect anomalies, and - here's the good part - correlate them into actionable insights that point you toward the root cause instead of making you hunt for it.

## What DevOps Guru Actually Does

DevOps Guru monitors your AWS resources and does three things:

1. **Learns normal behavior** - It builds a baseline from your operational metrics over time
2. **Detects anomalies** - When metrics deviate from the baseline, it flags them
3. **Groups related anomalies** - Instead of 50 separate alerts, you get one insight that ties related anomalies together with a probable cause

It covers a wide range of AWS services including EC2, RDS, Lambda, DynamoDB, ECS, S3, SQS, API Gateway, and many more.

## Enabling DevOps Guru

Setting it up is surprisingly simple. You can cover your entire account or specific resources.

### Console Setup

1. Open the DevOps Guru console
2. Click "Get started"
3. Choose your coverage - entire account, specific CloudFormation stacks, or tagged resources
4. Set up notifications via SNS
5. That's it

### Programmatic Setup

```python
# Enable DevOps Guru with coverage for tagged resources
import boto3

devops_guru = boto3.client('devops-guru', region_name='us-east-1')

# Set up the service to monitor resources with a specific tag
response = devops_guru.update_resource_collection(
    Action='ADD',
    ResourceCollection={
        'Tags': [
            {
                'AppBoundaryKey': 'devops-guru-enabled',
                'TagValues': ['true']
            }
        ]
    }
)
```

Now any AWS resource tagged with `devops-guru-enabled: true` will be monitored. This is a clean way to control exactly what gets covered.

### Using CloudFormation Stacks

If your infrastructure is defined in CloudFormation (and it should be), you can tell DevOps Guru to monitor specific stacks:

```python
# Monitor specific CloudFormation stacks
devops_guru.update_resource_collection(
    Action='ADD',
    ResourceCollection={
        'CloudFormation': {
            'StackNames': [
                'production-api',
                'production-database',
                'production-frontend'
            ]
        }
    }
)
```

## Setting Up Notifications

You want to know about insights as they happen. Set up an SNS notification channel:

```python
# Add an SNS topic for DevOps Guru notifications
devops_guru.add_notification_channel(
    Config={
        'Sns': {
            'TopicArn': 'arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:devops-guru-alerts'
        },
        'Filters': {
            'Severities': ['HIGH', 'MEDIUM'],
            'MessageTypes': ['NEW_INSIGHT', 'SEVERITY_UPGRADED']
        }
    }
)
```

The filters keep things manageable. You probably don't want a notification for every low-severity insight, but you definitely want to know about high and medium ones.

## Understanding Insights

DevOps Guru generates two types of insights:

### Reactive Insights

These appear after something goes wrong. They correlate anomalous metrics and suggest what happened.

```python
# List recent reactive insights
reactive_insights = devops_guru.list_insights(
    StatusFilter={
        'Ongoing': {
            'Type': 'REACTIVE'
        }
    }
)

for insight in reactive_insights['ReactiveInsights']:
    print(f"Insight: {insight['Name']}")
    print(f"  Severity: {insight['Severity']}")
    print(f"  Status: {insight['Status']}")
    print(f"  Started: {insight['InsightTimeRange']['StartTime']}")
    print()
```

### Proactive Insights

These are the real value. DevOps Guru spots issues before they become incidents. Maybe your DynamoDB table's read capacity is trending toward throttling, or your Lambda function's duration is creeping up.

```python
# List proactive insights
proactive_insights = devops_guru.list_insights(
    StatusFilter={
        'Ongoing': {
            'Type': 'PROACTIVE'
        }
    }
)

for insight in proactive_insights['ProactiveInsights']:
    print(f"Proactive Insight: {insight['Name']}")
    print(f"  Severity: {insight['Severity']}")
    print(f"  Prediction Time: {insight['PredictionTimeRange']['StartTime']}")
    print()
```

## Diving Into an Insight

Each insight contains anomalies and recommendations. Let's look at the details:

```python
# Get detailed information about a specific insight
insight_detail = devops_guru.describe_insight(
    Id='insight-id-12345'
)

insight = insight_detail['ReactiveInsight']
print(f"Name: {insight['Name']}")
print(f"Description: {insight.get('Description', 'N/A')}")
print(f"Severity: {insight['Severity']}")

# Get the anomalies associated with this insight
anomalies = devops_guru.list_anomalies_for_insight(
    InsightId='insight-id-12345'
)

for anomaly in anomalies['ReactiveAnomalies']:
    print(f"\nAnomaly: {anomaly['Id']}")
    print(f"  Status: {anomaly['Status']}")

    # Each anomaly has source details
    for source in anomaly.get('AnomalyResources', []):
        print(f"  Resource: {source['Name']}")
        print(f"  Type: {source['Type']}")
```

## What DevOps Guru Monitors

Here's a sampling of what it watches across services:

| Service | Metrics Monitored |
|---------|-------------------|
| EC2 | CPU, network, disk I/O, status checks |
| RDS | CPU, connections, read/write latency, free storage |
| Lambda | Duration, errors, throttles, concurrent executions |
| DynamoDB | Read/write capacity, throttled requests, latency |
| ELB | Request count, error rates, latency |
| SQS | Message age, queue depth, send/receive rates |
| API Gateway | Latency, 4xx/5xx errors, request count |

It also analyzes CloudFormation events, AWS Config changes, and CloudTrail logs to correlate operational changes with anomalies.

## A Real-World Scenario

Let's say you deployed a new version of your API. Twenty minutes later, DevOps Guru generates a reactive insight:

**Insight: Increased API latency and error rate**
- Anomaly 1: API Gateway 5xx errors spiked from 0.1% to 12%
- Anomaly 2: Lambda function duration increased from 200ms to 2500ms
- Anomaly 3: DynamoDB read throttling detected
- Related event: CloudFormation stack update at 14:23 UTC

DevOps Guru has done several things for you:
1. Grouped four related problems into one insight
2. Identified the probable trigger (the deployment)
3. Pointed to the root cause (DynamoDB throttling is likely causing Lambda timeouts, which cascade to API errors)

Without DevOps Guru, you'd be jumping between CloudWatch dashboards, X-Ray traces, and deployment logs trying to connect these dots yourself.

## Recommendations

DevOps Guru doesn't just tell you what's wrong - it suggests fixes:

```python
# Get recommendations for an insight
recommendations = devops_guru.list_recommendations(
    InsightId='insight-id-12345'
)

for rec in recommendations['Recommendations']:
    print(f"Recommendation: {rec['Description']}")
    print(f"  Reason: {rec['Reason']}")

    for action in rec.get('RelatedAnomalies', []):
        print(f"  Related anomaly: {action['AnomalyId']}")

    for link in rec.get('RelatedEvents', []):
        print(f"  Related event: {link['Name']}")
    print()
```

Recommendations might include things like:
- "Increase DynamoDB provisioned read capacity or switch to on-demand mode"
- "Review the recent CloudFormation deployment for changes that might increase read load"
- "Consider adding a caching layer to reduce DynamoDB reads"

## Integration with Systems Manager OpsCenter

DevOps Guru can automatically create OpsItems in Systems Manager OpsCenter, giving your operations team a central place to track and resolve issues:

```python
# Enable Systems Manager OpsCenter integration
devops_guru.update_service_integration(
    ServiceIntegration={
        'OpsCenter': {
            'OptInStatus': 'ENABLED'
        }
    }
)
```

## Cost and Coverage

DevOps Guru pricing is based on the number of AWS resources analyzed per hour. The cost depends on the resource type:

- CloudFormation stack resources are billed per resource per hour
- API calls for insights and recommendations are free

For a typical production stack with 50-100 resources, expect to pay somewhere in the range of $50-200/month. That's a fraction of the cost of an engineer spending hours debugging production issues.

## Best Practices

**Give it time to learn.** DevOps Guru needs at least 2-4 weeks of data to establish good baselines. Don't expect great insights on day one.

**Tag your resources consistently.** If you use tag-based coverage, make sure your tagging is clean and comprehensive.

**Start with one environment.** Monitor your production environment first, since that's where anomaly detection provides the most value.

**Act on proactive insights.** The proactive insights are the biggest value driver. When DevOps Guru warns you about a trending issue, fix it before it becomes an incident.

**Combine with other monitoring.** DevOps Guru is great for anomaly detection, but you still need your regular monitoring stack for dashboards, alerting on specific thresholds, and long-term metrics storage. For comprehensive application monitoring including uptime checks, incident management, and status pages, tools like [OneUptime](https://oneuptime.com) complement DevOps Guru well.

## Wrapping Up

DevOps Guru takes the pattern recognition that experienced ops engineers do intuitively and automates it with ML. It's not perfect - you'll get some false positives, especially early on - but the ability to correlate multiple anomalies into a single insight with a probable cause is genuinely useful.

The proactive insights alone can justify the cost by helping you prevent incidents instead of just responding to them. Set it up, give it a few weeks to learn your baseline, and let it start surfacing the patterns you'd otherwise miss.
