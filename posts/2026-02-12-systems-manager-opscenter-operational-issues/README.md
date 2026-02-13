# How to Use Systems Manager OpsCenter for Operational Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, OpsCenter, Operations, Incident Management

Description: Learn how to use AWS Systems Manager OpsCenter to centralize, triage, and resolve operational issues across your AWS infrastructure.

---

When you're running infrastructure on AWS, operational issues come from everywhere. CloudWatch fires an alarm, Config finds a non-compliant resource, a deployment goes sideways, or someone notices a performance degradation. Without a central place to track these, your team ends up juggling Slack threads, email chains, and sticky notes. That's where OpsCenter comes in.

AWS Systems Manager OpsCenter is a centralized hub for managing operational issues - called OpsItems - across your AWS environment. It aggregates alerts from multiple AWS services, provides context about affected resources, and links directly to runbooks for remediation. Let's set it up and make it actually useful.

## What's an OpsItem?

An OpsItem is essentially an operational ticket. It has a title, description, severity, status, and related resources. But unlike a generic ticket in Jira or ServiceNow, OpsItems live inside AWS and have direct access to your infrastructure context.

Each OpsItem can include:

- **Related resources** with deep links to the console
- **Operational data** like CloudWatch graphs and Config timelines
- **Related Automation runbooks** you can execute right from the OpsItem
- **Similar OpsItems** so you can spot patterns
- **SNS notifications** for updates

## Enabling OpsCenter

OpsCenter is part of Systems Manager and doesn't cost anything extra - you just need to enable it. Here's how via the CLI:

```bash
# Enable OpsCenter (Explorer needs to be set up first)
aws ssm update-service-setting \
  --setting-id "arn:aws:ssm:us-east-1:123456789012:servicesetting/ssm/opsitem/EC2" \
  --setting-value "Enabled"
```

In the console, go to Systems Manager, then OpsCenter in the left sidebar. If it's your first time, you'll be walked through a setup wizard that also configures Explorer (OpsCenter's reporting dashboard).

## Creating OpsItems Manually

Sometimes you need to create an OpsItem by hand - maybe you noticed something during a review that isn't tied to an automated alert.

```bash
# Create an OpsItem manually
aws ssm create-ops-item \
  --title "High memory usage on production web servers" \
  --description "Memory usage on web-prod-* instances has been above 85% for the past 3 hours. Need to investigate if there's a memory leak in the latest deployment." \
  --source "Manual" \
  --severity "2" \
  --priority 1 \
  --operational-data '{
    "AffectedInstances": {
      "Value": "[\"i-0abc123\", \"i-0def456\", \"i-0ghi789\"]",
      "Type": "SearchableString"
    }
  }' \
  --notifications '[{"Arn": "arn:aws:sns:us-east-1:123456789012:ops-team"}]'
```

The severity scale runs from 1 (critical) to 4 (low). Priority is a separate numeric field you can use however your team sees fit.

## Automatic OpsItem Creation from CloudWatch Alarms

The real power is automatic creation. You can configure CloudWatch alarms to create OpsItems when they trigger, giving you a centralized view of all active issues.

First, create an EventBridge rule that catches CloudWatch alarm state changes:

```json
{
  "source": ["aws.cloudwatch"],
  "detail-type": ["CloudWatch Alarm State Change"],
  "detail": {
    "state": {
      "value": ["ALARM"]
    }
  }
}
```

Set the target to SSM OpsItem with a template:

```bash
# Create EventBridge rule for CloudWatch alarm OpsItems
aws events put-rule \
  --name "cloudwatch-alarm-to-opsitem" \
  --event-pattern '{
    "source": ["aws.cloudwatch"],
    "detail-type": ["CloudWatch Alarm State Change"],
    "detail": {
      "state": {"value": ["ALARM"]}
    }
  }'

# Set the target to create an OpsItem
aws events put-targets \
  --rule "cloudwatch-alarm-to-opsitem" \
  --targets '[{
    "Id": "create-opsitem",
    "Arn": "arn:aws:ssm:us-east-1:123456789012:opsitem",
    "RoleArn": "arn:aws:iam::123456789012:role/EventBridgeSSMRole",
    "InputTransformer": {
      "InputPathsMap": {
        "alarm": "$.detail.alarmName",
        "reason": "$.detail.state.reason",
        "region": "$.region"
      },
      "InputTemplate": "{\"title\": \"CloudWatch Alarm: <alarm>\", \"description\": \"Alarm <alarm> triggered. Reason: <reason>\", \"source\": \"CloudWatch\", \"severity\": \"2\"}"
    }
  }]'
```

## Automatic OpsItems from AWS Config

AWS Config can also create OpsItems when resources fall out of compliance. This is great for catching security issues like unencrypted volumes or open security groups.

Enable this in Config rules by adding the `ssm:ops-item` remediation action, or configure it via EventBridge:

```bash
# EventBridge rule for Config compliance changes
aws events put-rule \
  --name "config-noncompliant-to-opsitem" \
  --event-pattern '{
    "source": ["aws.config"],
    "detail-type": ["Config Rules Compliance Change"],
    "detail": {
      "newEvaluationResult": {
        "complianceType": ["NON_COMPLIANT"]
      }
    }
  }'
```

## Managing OpsItems

Once OpsItems start flowing in, you need a process for triaging and resolving them. Here are the key operations:

To list open OpsItems filtered by severity:

```bash
# List critical and high severity open OpsItems
aws ssm describe-ops-items \
  --ops-item-filters '[
    {"Key": "Status", "Values": ["Open", "InProgress"], "Operator": "Equal"},
    {"Key": "Severity", "Values": ["1", "2"], "Operator": "Equal"}
  ]' \
  --query "OpsItemSummaries[].{Id:OpsItemId,Title:Title,Severity:Severity,Status:Status,Created:CreatedTime}" \
  --output table
```

To update an OpsItem's status when you start working on it:

```bash
# Move an OpsItem to InProgress
aws ssm update-ops-item \
  --ops-item-id "oi-abc123def456" \
  --status "InProgress" \
  --operational-data '{
    "AssignedTo": {
      "Value": "jane@example.com",
      "Type": "SearchableString"
    }
  }'
```

To resolve an OpsItem:

```bash
# Resolve an OpsItem with a resolution note
aws ssm update-ops-item \
  --ops-item-id "oi-abc123def456" \
  --status "Resolved" \
  --operational-data '{
    "Resolution": {
      "Value": "Deployed hotfix v2.4.2 which fixed the memory leak in the connection pool. Memory usage returned to normal within 15 minutes.",
      "Type": "SearchableString"
    }
  }'
```

## Linking Runbooks to OpsItems

One of the best features of OpsCenter is the ability to link Automation runbooks directly to OpsItems. When an operator picks up an OpsItem, they can see recommended runbooks and execute them right there.

```bash
# Associate a runbook with an OpsItem
aws ssm update-ops-item \
  --ops-item-id "oi-abc123def456" \
  --operational-data '{
    "RunbookName": {
      "Value": "Restart-EC2-Instance",
      "Type": "SearchableString"
    }
  }' \
  --related-ops-items '[{
    "OpsItemId": "oi-previous-similar-issue"
  }]'
```

For a deeper dive on building automation runbooks that pair well with OpsCenter, see our post on [Systems Manager Automation for runbooks](https://oneuptime.com/blog/post/2026-02-12-systems-manager-automation-runbooks/view).

## Using OpsCenter with Explorer

OpsCenter Explorer gives you dashboards and reports across all your OpsItems. You can see trends like:

- How many OpsItems were created this week vs last week
- Average time to resolution
- Which sources generate the most issues
- Breakdown by severity

Enable Explorer through the console setup wizard, or via CLI:

```bash
# Get the current Explorer configuration
aws ssm get-ops-summary \
  --filters '[{"Key": "AWS:OpsItem.Status", "Values": ["Open"], "Type": "Equal"}]' \
  --aggregators '[{
    "AggregatorType": "Count",
    "AttributeName": "AWS:OpsItem.Severity",
    "Values": {}
  }]'
```

## Deduplication

A common problem with automated OpsItem creation is duplicates. If a CloudWatch alarm flaps, you could end up with dozens of OpsItems for the same underlying issue. OpsCenter handles this with deduplication strings.

When creating OpsItems, include a dedup string:

```bash
# Create OpsItem with deduplication
aws ssm create-ops-item \
  --title "High CPU on i-0abc123" \
  --source "CloudWatch" \
  --severity "2" \
  --description "CPU utilization exceeded 90% for 15 minutes" \
  --operational-data '{
    "/aws/dedup": {
      "Value": "{\"dedupString\": \"high-cpu-i-0abc123\"}",
      "Type": "SearchableString"
    }
  }'
```

If another OpsItem comes in with the same dedup string and the previous one is still open, OpsCenter won't create a duplicate. Instead, it adds the information to the existing OpsItem.

## Setting Up Notifications

You want your team to know when critical OpsItems are created. Set up SNS notifications:

```bash
# Create an SNS topic for OpsItem notifications
aws sns create-topic --name ops-critical-alerts

# Subscribe your team's email
aws sns subscribe \
  --topic-arn "arn:aws:sns:us-east-1:123456789012:ops-critical-alerts" \
  --protocol email \
  --notification-endpoint "ops-team@example.com"
```

Then reference this SNS topic ARN in your OpsItem creation calls or EventBridge rules.

## Best Practices

Here's what works well in practice:

1. **Set up automatic creation first** - Manual OpsItem creation won't stick as a habit. Automate it from CloudWatch, Config, and other sources.
2. **Use consistent severity levels** - Define what each severity means for your team and stick to it. Severity 1 means someone gets paged. Severity 4 means it goes in the backlog.
3. **Always add dedup strings** - It takes 30 seconds and saves you from OpsItem floods.
4. **Link runbooks** - The faster an operator can go from "I see the problem" to "I'm fixing the problem," the shorter your outages.
5. **Review weekly** - Use Explorer dashboards in your ops review meetings to spot trends and systemic issues.
6. **Close resolved items** - An OpsCenter full of stale items becomes useless. Set up a process to review and close items that are no longer relevant.

## Wrapping Up

OpsCenter won't replace your incident management platform for major outages, but it fills a gap that most teams have - tracking the day-to-day operational issues that don't rise to the level of an incident but still need attention. Set up automatic creation from your alerting sources, establish a triage process, and link your runbooks. Your on-call team will thank you.
