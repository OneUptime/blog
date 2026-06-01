# How to Use Amazon Detective for Security Investigation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Detective, Security, Investigation

Description: Guide to using Amazon Detective for security investigations, covering setup, behavior analysis, finding correlation, VPC flow log analysis, and integration with GuardDuty and Security Hub.

---

When a security alert fires, the clock starts ticking. You need to figure out what happened, what's affected, and how to contain it - fast. The problem is that the data you need is scattered across CloudTrail logs, VPC Flow Logs, GuardDuty findings, and dozens of other sources. Correlating this data manually under pressure is slow and error-prone.

Amazon Detective does the correlation for you. It automatically ingests security data from across your AWS environment, builds a graph model of relationships between resources, and provides visualizations that let you investigate findings in minutes instead of hours.

## What Detective Analyzes

Detective automatically ingests and analyzes:

- **AWS CloudTrail logs**: API calls across your account
- **Amazon VPC Flow Logs**: Network traffic patterns
- **Amazon GuardDuty findings**: Threat detection alerts for accounts enrolled in GuardDuty
- **Amazon EKS audit logs**: Kubernetes API activity when the optional EKS audit logs source package is enabled
- **AWS Security Hub findings**: Aggregated security alerts when the optional AWS security findings source package is enabled

```mermaid
graph TD
    A[CloudTrail] --> D[Amazon Detective]
    B[VPC Flow Logs] --> D
    C[GuardDuty Findings] --> D
    E[EKS Audit Logs] --> D
    F[Security Hub] --> D
    D --> G[Behavior Graph]
    G --> H[Entity Profiles]
    G --> I[Finding Groups]
    G --> J[Visualizations]
```

## Enabling Detective

Detective needs to be enabled and given time to build its behavior graph. The graph improves over two weeks as it establishes baseline behavior.

```bash
# Enable Amazon Detective

aws detective create-graph \
    --tags '{"Environment": "production"}'

# Get your graph ARN
aws detective list-graphs
```

Detective automatically starts ingesting CloudTrail and VPC Flow Log source data through Detective's own data streams. These streams don't require you to create or store CloudTrail logs or VPC Flow Logs separately. If you're using GuardDuty (and you should be), its findings are also ingested.

### Prerequisites

Before enabling Detective:

- GuardDuty should be enabled if you want Detective to correlate GuardDuty findings
- You need IAM permissions to create and manage Detective behavior graphs
- Enable the optional EKS audit logs and AWS security findings source packages if you want Detective to analyze those sources

```bash
# Verify GuardDuty is enabled
aws guardduty list-detectors

# Enable the optional EKS audit logs and AWS security findings source packages
aws detective update-datasource-packages \
    --graph-arn "arn:aws:detective:us-east-1:123456789012:graph:0123456789abcdef0123456789abcdef" \
    --datasource-packages "EKS_AUDIT" "ASFF_SECURITYHUB_FINDING"
```

## Multi-Account Setup

For organizations, enable Detective across all accounts using the administrator account.

```bash
# From the administrator account, invite member accounts
aws detective create-members \
    --graph-arn "arn:aws:detective:us-east-1:123456789012:graph:0123456789abcdef0123456789abcdef" \
    --accounts '[
        {"AccountId": "111111111111", "EmailAddress": "security@member1.example.com"},
        {"AccountId": "222222222222", "EmailAddress": "security@member2.example.com"}
    ]'
```

Member accounts need to accept the invitation.

```bash
# From the member account
aws detective accept-invitation \
    --graph-arn "arn:aws:detective:us-east-1:123456789012:graph:0123456789abcdef0123456789abcdef"
```

## Investigating a GuardDuty Finding

The most common workflow is investigating a GuardDuty finding. When GuardDuty detects something suspicious, Detective provides the context to understand it.

### Example: Unusual API Call

GuardDuty fires `Recon:IAMUser/MaliciousIPCaller`. An IAM user made API calls from a known malicious IP.

```python
# investigate.py - Programmatic investigation with Detective
import boto3
from datetime import datetime, timedelta

detective = boto3.client('detective', region_name='us-east-1')

GRAPH_ARN = "arn:aws:detective:us-east-1:123456789012:graph:0123456789abcdef0123456789abcdef"
USER_ARN = "arn:aws:iam::123456789012:user/compromised-user"

def investigate_iam_user(user_arn, hours_back=24):
    """Investigate an IAM user's recent activity."""

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours_back)

    investigation = detective.start_investigation(
        GraphArn=GRAPH_ARN,
        EntityArn=user_arn,
        ScopeStartTime=start_time,
        ScopeEndTime=end_time
    )

    investigation_id = investigation['InvestigationId']

    # List indicators after the investigation starts generating results
    response = detective.list_indicators(
        GraphArn=GRAPH_ARN,
        InvestigationId=investigation_id,
        MaxResults=50
    )

    for indicator in response.get('Indicators', []):
        print(f"Type: {indicator['IndicatorType']}")
        detail = indicator.get('IndicatorDetail', {})
        print(f"Detail: {detail}")
        print("---")

def get_investigation_details(investigation_id):
    """Get detailed investigation data for an IAM user or role."""
    response = detective.get_investigation(
        GraphArn=GRAPH_ARN,
        InvestigationId=investigation_id
    )

    print(f"Status: {response['Status']}")
    print(f"Severity: {response['Severity']}")
    print(f"Entity: {response['EntityArn']}")
    print(f"Created: {response['CreatedTime']}")

investigate_iam_user(USER_ARN)
```

## Understanding the Behavior Graph

Detective's behavior graph connects entities (IAM users, EC2 instances, IP addresses, S3 buckets) through observed relationships. This is what makes investigation fast - you can see at a glance who accessed what, from where, and when.

### Entity Types

- **AWS accounts**: Which accounts are involved
- **IAM users and roles**: Who performed actions
- **EC2 instances**: Which instances were involved
- **IP addresses**: Source of API calls and network connections
- **S3 buckets**: Data access patterns
- **EKS clusters**: Kubernetes activity

### Relationship Types

- IAM user assumed role X
- EC2 instance communicated with IP address Y
- IAM role accessed S3 bucket Z
- API calls originated from IP address W

## Common Investigation Scenarios

### Compromised Credentials

When GuardDuty detects `UnauthorizedAccess:IAMUser/MaliciousIPCaller`:

1. Open the finding in Detective
2. Check the IAM user's profile - compare recent API calls to baseline
3. Look at IP addresses - are they from expected locations?
4. Check what resources were accessed
5. Look for lateral movement - did the user assume other roles?

```bash
# Get recent API activity for the investigation
# Detective provides this through its console visualizations
# For programmatic access:
aws detective start-investigation \
    --graph-arn "arn:aws:detective:us-east-1:123456789012:graph:0123456789abcdef0123456789abcdef" \
    --entity-arn "arn:aws:iam::123456789012:user/suspicious-user" \
    --scope-start-time "2026-02-11T00:00:00Z" \
    --scope-end-time "2026-02-12T00:00:00Z"
```

### Cryptocurrency Mining

When GuardDuty detects `CryptoCurrency:EC2/BitcoinTool.B`:

1. Open the finding in Detective
2. Check the EC2 instance's network profile - look for connections to mining pools
3. Look at who launched or modified the instance
4. Check if other instances have similar patterns
5. Identify the initial compromise vector

### Data Exfiltration

When unusual data transfer patterns are detected:

1. Check VPC Flow Log analysis for the source instance
2. Look at destination IPs - are they known data exfiltration endpoints?
3. Check the volume of data transferred compared to baseline
4. Identify which IAM credentials were used to access the data
5. Trace back to how the credentials were obtained

## Working with Finding Groups

Detective automatically groups related findings that may be part of the same security incident.

```python
# finding_groups.py - Work with finding groups
def list_related_finding_groups(investigation_id):
    """List finding groups related to a Detective investigation."""
    response = detective.list_indicators(
        GraphArn=GRAPH_ARN,
        InvestigationId=investigation_id,
        IndicatorType="RELATED_FINDING_GROUP"
    )

    for indicator in response.get('Indicators', []):
        detail = indicator.get('IndicatorDetail', {})
        group = detail.get('RelatedFindingGroupDetail', {})
        print(f"Finding group: {group.get('Id')}")
```

Finding groups help you see the bigger picture. What looks like isolated events - a login from a new IP, an unusual API call, increased data transfer - might be stages of a coordinated attack.

## VPC Flow Log Analysis

Detective's network analysis shows communication patterns for your EC2 instances.

Key things to look for:

- **New destinations**: Connections to IP addresses not seen in the baseline period
- **Port anomalies**: Communication on unusual ports
- **Volume spikes**: Significant increase in data transfer
- **Protocol changes**: Unexpected protocol usage

```python
# Analyze tactics, techniques, and procedures from a Detective investigation
def check_ttp_indicators(investigation_id):
    """Check TTP indicators for an IAM user or role investigation."""
    response = detective.list_indicators(
        GraphArn=GRAPH_ARN,
        InvestigationId=investigation_id,
        IndicatorType="TTP_OBSERVED"
    )

    for indicator in response.get('Indicators', []):
        detail = indicator.get('IndicatorDetail', {})
        if 'TTPsObservedDetail' in detail:
            ttp = detail['TTPsObservedDetail']
            print(f"TTP: {ttp.get('Tactic')} / {ttp.get('Technique')}")
            print(f"  Observed: {ttp.get('Procedure')}")
```

## Automating Investigation Response

Combine Detective with Lambda for automated initial triage.

```python
# auto_triage.py - Automated security investigation triage
import boto3
import json
from datetime import datetime

detective = boto3.client('detective')
sns = boto3.client('sns')

GRAPH_ARN = "arn:aws:detective:us-east-1:123456789012:graph:0123456789abcdef0123456789abcdef"

def lambda_handler(event, context):
    """Triggered by GuardDuty finding via EventBridge."""
    finding = event['detail']
    severity = finding['severity']
    finding_type = finding['type']
    account_id = finding['accountId']
    access_key_details = finding.get('resource', {}).get('accessKeyDetails', {})

    if access_key_details.get('userType') != 'IAMUser' or 'userName' not in access_key_details:
        return {
            'message': 'Detective investigations support IAM users and IAM roles. No IAM user was found in this finding.',
            'finding_type': finding_type,
            'severity': severity
        }

    entity_arn = f"arn:aws:iam::{account_id}:user/{access_key_details['userName']}"

    # Start an investigation in Detective
    investigation = detective.start_investigation(
        GraphArn=GRAPH_ARN,
        EntityArn=entity_arn,
        ScopeStartTime=datetime.fromisoformat(finding['createdAt'].replace('Z', '+00:00')),
        ScopeEndTime=datetime.fromisoformat(finding['updatedAt'].replace('Z', '+00:00'))
    )

    # For critical findings, notify immediately
    if severity >= 7:
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:security-critical',
            Subject=f'Critical Security Finding: {finding_type}',
            Message=json.dumps({
                'finding_type': finding_type,
                'severity': severity,
                'investigation_id': investigation['InvestigationId'],
                'entity_arn': entity_arn
            }, indent=2)
        )

    return {
        'investigation_id': investigation['InvestigationId'],
        'severity': severity
    }
```

Set up the EventBridge rule to trigger this.

```bash
# Create EventBridge rule for GuardDuty findings
aws events put-rule \
    --name "guardduty-to-detective" \
    --event-pattern '{
        "source": ["aws.guardduty"],
        "detail-type": ["GuardDuty Finding"],
        "detail": {
            "severity": [{"numeric": [">=", 4]}]
        }
    }'

aws events put-targets \
    --rule "guardduty-to-detective" \
    --targets '[{
        "Id": "auto-triage",
        "Arn": "arn:aws:lambda:us-east-1:123456789012:function:auto-triage"
    }]'

aws lambda add-permission \
    --function-name auto-triage \
    --statement-id guardduty-to-detective-eventbridge \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:us-east-1:123456789012:rule/guardduty-to-detective"
```

## Cost Considerations

Detective pricing is based on the volume of data ingested:

- CloudTrail events
- VPC Flow Log records
- GuardDuty findings
- EKS audit logs

Detective provides a 30-day free trial per Region. After that, costs scale with data volume, so use the pricing page or AWS Pricing Calculator to estimate costs for your accounts.

## Best Practices

**Enable Detective in all regions** where you have resources. An attacker will find and exploit resources in regions you're not monitoring.

**Integrate with your incident response process.** Detective should be the first tool your security team opens when investigating a finding.

**Let the behavior graph mature.** Detective needs two weeks to establish good baselines. Don't overreact to findings during the initial period.

**Use finding groups for context.** Individual findings tell part of the story. Finding groups show the full attack chain.

**Automate initial triage.** Not every finding needs immediate human attention. Use Lambda to categorize and route findings based on severity and type.

## Wrapping Up

Amazon Detective turns security investigation from a multi-hour log-crawling exercise into a guided analysis workflow. The behavior graph automatically correlates data from CloudTrail, VPC Flow Logs, and GuardDuty, so you can focus on understanding the incident rather than finding the data.

Start by enabling Detective and letting it build its behavior graph. When the next GuardDuty finding fires, use Detective to investigate instead of manually querying logs. The time savings during an actual incident are substantial.
