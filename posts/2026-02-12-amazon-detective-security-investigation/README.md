# How to Set Up Amazon Detective for Security Investigation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Detective, Security, Investigation, GuardDuty

Description: Learn how to enable and use Amazon Detective for security investigation, including graph analysis, entity profiling, finding investigation, and multi-account setup.

---

When a security alert fires - whether from GuardDuty, Security Hub, or your own monitoring - the first question is always "what happened?" That's followed by "who did it?", "what else did they access?", and "how bad is it?" Answering those questions typically means jumping between CloudTrail logs, VPC Flow Logs, GuardDuty findings, and multiple AWS consoles, piecing together a timeline manually.

Amazon Detective automates that investigation process. It ingests data from CloudTrail, VPC Flow Logs, GuardDuty, and EKS audit logs, builds a graph database of relationships between entities (IP addresses, IAM users, EC2 instances), and lets you visualize the scope of a security event. Think of it as a pre-built security investigation platform that's always ready.

## Prerequisites

Before enabling Detective, you need these data sources active:

- **GuardDuty** must be enabled (Detective uses GuardDuty findings as starting points)
- **CloudTrail** must be logging management events (this is on by default)
- **VPC Flow Logs** are optional but strongly recommended for network analysis

Detective costs are based on the volume of data ingested. It's billed per GB with a 30-day free trial.

## Enabling Detective

Detective is straightforward to enable. It starts ingesting data immediately and builds its behavior graph over the next few weeks.

```bash
# Enable Detective
aws detective create-graph \
  --tags '{"Environment": "production", "ManagedBy": "security-team"}'
```

The response gives you the graph ARN, which you'll need for all subsequent operations.

```bash
# Verify the graph is active
aws detective list-graphs \
  --query 'GraphList[*].{Arn:Arn,Status:Status,Created:CreatedTime}'
```

## Terraform Configuration

```hcl
# Enable GuardDuty first (required for Detective)
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }
}

# Enable Detective
resource "aws_detective_graph" "main" {
  tags = {
    Environment = "production"
    Team        = "security"
  }
}
```

## Multi-Account Setup

In an AWS Organizations environment, designate a Detective administrator and invite member accounts. The administrator account sees data from all member accounts in a unified graph.

```bash
# Designate the security account as Detective admin
aws detective enable-organization-admin-account \
  --account-id "222233334444"

# From the admin account, invite member accounts
aws detective create-members \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123" \
  --accounts '[
    {"AccountId": "333344445555", "EmailAddress": "team1@example.com"},
    {"AccountId": "444455556666", "EmailAddress": "team2@example.com"}
  ]'
```

Member accounts need to accept the invitation.

```bash
# From a member account, accept the invitation
aws detective accept-invitation \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123"
```

Or auto-enable for all organization members.

```hcl
resource "aws_detective_organization_admin_account" "main" {
  account_id = "222233334444"
}

resource "aws_detective_organization_configuration" "main" {
  auto_enable = true
  graph_arn   = aws_detective_graph.main.id
}
```

## How Detective Builds Its Graph

Detective doesn't just store logs - it builds a behavior graph that maps relationships between entities. Over the first two weeks, it establishes behavioral baselines for your accounts.

The graph includes these entity types:
- **AWS accounts**
- **IAM users and roles** (including assumed role sessions)
- **EC2 instances**
- **IP addresses** (both internal and external)
- **S3 buckets**
- **EKS clusters, pods, and containers**
- **GuardDuty findings**

Detective correlates these entities based on activity patterns. For example, it can show you that a specific IAM user assumed a role, which was used by an EC2 instance, which communicated with a suspicious IP address.

## Investigating a GuardDuty Finding

The most common workflow starts with a GuardDuty finding. Detective provides deep context around each finding.

```bash
# List recent GuardDuty findings to investigate
aws guardduty list-findings \
  --detector-id "your-detector-id" \
  --finding-criteria '{
    "Criterion": {
      "severity": {"Gte": 7}
    }
  }' \
  --sort-criteria '{"AttributeName": "updatedAt", "OrderBy": "DESC"}' \
  --max-results 5
```

Once you have a finding ARN, start the investigation in Detective. While the Detective console provides the richest investigation experience, you can also query the API.

```bash
# Get investigation details for a finding
aws detective start-investigation \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123" \
  --entity-arn "arn:aws:iam::123456789012:user/suspicious-user" \
  --scope-start-time "2026-02-11T00:00:00Z" \
  --scope-end-time "2026-02-12T00:00:00Z"
```

The investigation returns a comprehensive analysis of the entity's behavior during the specified time window, including unusual activity compared to baseline.

```bash
# Check investigation status and results
aws detective get-investigation \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123" \
  --investigation-id "investigation-id-here"
```

## Entity Profiling

Detective maintains profiles for every entity in your environment. These profiles show normal behavior patterns and highlight anomalies.

For an IAM role, the profile includes:
- API call patterns (which APIs, how often, what time of day)
- Resources accessed
- Source IP addresses used
- Assumed by which principals
- Geographic distribution of activity

```bash
# List investigations for review
aws detective list-investigations \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123" \
  --filter-criteria '{
    "Status": {"Value": "RUNNING"}
  }'

# Get indicators of compromise
aws detective list-indicators \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123" \
  --investigation-id "investigation-id-here"
```

## Automated Investigation Workflow

Combine GuardDuty, Detective, and Step Functions for an automated investigation pipeline.

```python
import boto3
import json

detective = boto3.client('detective')
guardduty = boto3.client('guardduty')
sns = boto3.client('sns')

GRAPH_ARN = 'arn:aws:detective:us-east-1:222233334444:graph/abc123'
ALERT_TOPIC = 'arn:aws:sns:us-east-1:123456789012:security-investigations'


def lambda_handler(event, context):
    """Start a Detective investigation for high-severity GuardDuty findings."""
    detail = event['detail']

    severity = detail['severity']
    finding_type = detail['type']
    account_id = detail['accountId']

    # Only investigate high-severity findings
    if severity < 7:
        return {'action': 'skipped', 'reason': 'below threshold'}

    # Determine the entity to investigate
    resource = detail.get('resource', {})
    entity_arn = None

    # Check for IAM-related findings
    if 'accessKeyDetails' in resource:
        user_name = resource['accessKeyDetails'].get('userName')
        if user_name:
            entity_arn = f"arn:aws:iam::{account_id}:user/{user_name}"

    # Check for EC2-related findings
    if 'instanceDetails' in resource:
        instance_id = resource['instanceDetails'].get('instanceId')
        if instance_id:
            entity_arn = f"arn:aws:ec2:{event['region']}:{account_id}:instance/{instance_id}"

    if not entity_arn:
        print("Could not determine entity to investigate")
        return {'action': 'no_entity'}

    # Start the investigation
    try:
        response = detective.start_investigation(
            GraphArn=GRAPH_ARN,
            EntityArn=entity_arn,
            ScopeStartTime=detail['createdAt'],
            ScopeEndTime=detail['updatedAt']
        )
        investigation_id = response['InvestigationId']
    except Exception as e:
        print(f"Failed to start investigation: {e}")
        return {'action': 'failed', 'error': str(e)}

    # Notify the security team
    sns.publish(
        TopicArn=ALERT_TOPIC,
        Subject=f"Investigation Started: {finding_type}",
        Message=json.dumps({
            'investigation_id': investigation_id,
            'entity': entity_arn,
            'finding_type': finding_type,
            'severity': severity,
            'account': account_id,
            'console_link': f"https://console.aws.amazon.com/detective/home?region={event['region']}#investigations/{investigation_id}"
        }, indent=2)
    )

    return {
        'action': 'investigation_started',
        'investigation_id': investigation_id
    }
```

Wire it up with EventBridge.

```hcl
resource "aws_cloudwatch_event_rule" "guardduty_high" {
  name = "guardduty-high-severity"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{ "numeric": [">=", 7] }]
    }
  })
}

resource "aws_cloudwatch_event_target" "investigate" {
  rule = aws_cloudwatch_event_rule.guardduty_high.name
  arn  = aws_lambda_function.investigate.arn
}
```

## Data Sources and Costs

Detective ingests data from these sources:
- **CloudTrail management events** (always included)
- **VPC Flow Logs** (recommended for network analysis)
- **GuardDuty findings** (required)
- **EKS audit logs** (optional, for container workloads)

Costs scale with data volume. The first 30 days are free, then you're billed per GB ingested. Check your current usage.

```bash
# Check Detective usage
aws detective list-datasource-packages \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123"
```

## Optional Data Source Packages

Enable additional data sources for deeper investigation capabilities.

```bash
# Enable EKS audit log analysis
aws detective update-datasource-packages \
  --graph-arn "arn:aws:detective:us-east-1:222233334444:graph/abc123" \
  --datasource-packages '["EKS_AUDIT"]'
```

## Investigation Best Practices

1. **Let Detective build baselines first.** It needs 2 weeks of data to establish normal behavior patterns. Early investigations might miss anomalies.
2. **Start from GuardDuty findings.** Detective works best when you begin with a specific finding and expand from there.
3. **Use the console for visual investigation.** The API is useful for automation, but the console's graph visualization is where Detective really shines.
4. **Document your investigations.** Tag investigations with outcomes for future reference.
5. **Combine with other security services.** Use Detective alongside Security Hub for centralized findings and [Inspector for vulnerability context](https://oneuptime.com/blog/post/amazon-inspector-ec2-vulnerability-scanning/view).

## Wrapping Up

Amazon Detective transforms security investigation from a manual, time-consuming process into something you can do in minutes. Enable it alongside GuardDuty, give it a few weeks to build baselines, and when alerts fire, you'll have a comprehensive investigation tool ready to go. The key value isn't just faster investigations - it's the relationships and patterns that Detective surfaces that you might never find manually combing through raw logs.
