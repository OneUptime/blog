# How to Configure VPC Network Access Analyzer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Network Security, Compliance, Network Analysis

Description: Learn how to use VPC Network Access Analyzer to verify network access paths, detect unintended connectivity, and maintain compliance in your AWS environment.

---

Security groups, NACLs, route tables, VPC peering, transit gateways - there are so many layers controlling network access in AWS that it's genuinely hard to answer a simple question: "Can this resource reach that resource?" Even experienced engineers get tripped up by the interaction between all these layers.

VPC Network Access Analyzer answers that question definitively. It analyzes your network configuration and identifies all possible access paths between resources. You define what access should and shouldn't exist, and Network Access Analyzer tells you where reality doesn't match your intent.

## What Network Access Analyzer Does

Network Access Analyzer doesn't send traffic or scan ports. It's a static analysis tool that examines your configuration - security groups, NACLs, route tables, VPC peering connections, transit gateway routes, and more - to determine all possible network paths. Think of it as a reasoning engine for your network configuration.

Two main use cases:

1. **Verify intended access**: Confirm that your web servers can reach your database, or that your application tier can call external APIs.
2. **Detect unintended access**: Find paths that shouldn't exist, like internet access to a database port or cross-VPC access that wasn't planned.

## Creating Network Access Scopes

A Network Access Scope defines what you want to analyze. It has match conditions for source and destination, and you can include or exclude specific paths.

Create a scope to find internet access to databases:

```bash
# Create a scope that finds paths from the internet to any RDS instance
aws ec2 create-network-insights-access-scope \
  --match-paths '[
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::RDS::DBInstance"]
        },
        "PacketHeader": {
          "DestinationPorts": [
            {"From": 3306, "To": 3306},
            {"From": 5432, "To": 5432}
          ]
        }
      }
    }
  ]' \
  --tags Key=Purpose,Value=DatabaseInternetAccess
```

Create a scope to detect cross-VPC access:

```bash
# Find paths between specific VPCs that shouldn't communicate
aws ec2 create-network-insights-access-scope \
  --match-paths '[
    {
      "Source": {
        "ResourceStatement": {
          "Resources": ["vpc-prod001"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "Resources": ["vpc-dev001"]
        }
      }
    }
  ]' \
  --tags Key=Purpose,Value=ProdDevIsolation
```

## Running an Analysis

Once you have a scope, run the analysis:

```bash
# Start the analysis
aws ec2 start-network-insights-access-scope-analysis \
  --network-insights-access-scope-id nis-abc123

# Check the status
aws ec2 describe-network-insights-access-scope-analyses \
  --network-insights-access-scope-analysis-ids nisa-xyz789

# Get the findings
aws ec2 get-network-insights-access-scope-analysis-findings \
  --network-insights-access-scope-analysis-id nisa-xyz789 \
  --max-results 50
```

The analysis runs asynchronously. For a simple VPC, it completes in minutes. For large, complex networks, it can take longer. The findings show each access path that matches your scope, including every hop along the way.

## Understanding Findings

Each finding describes a complete network path. Here's what a finding looks like:

```json
{
  "NetworkInsightsAccessScopeAnalysisId": "nisa-xyz789",
  "FindingId": "finding-001",
  "FindingComponents": [
    {
      "Component": {
        "Id": "igw-abc123",
        "Arn": "arn:aws:ec2:us-east-1:123456789012:internet-gateway/igw-abc123"
      },
      "SecurityGroupRuleIds": []
    },
    {
      "Component": {
        "Id": "eni-def456",
        "Arn": "arn:aws:ec2:us-east-1:123456789012:network-interface/eni-def456"
      },
      "InboundHeader": {
        "DestinationPorts": [{"From": 3306, "To": 3306}],
        "Protocol": "tcp"
      },
      "SecurityGroupRuleIds": ["sgr-abc123"]
    },
    {
      "Component": {
        "Id": "rds-instance-prod",
        "Arn": "arn:aws:rds:us-east-1:123456789012:db:production-db"
      }
    }
  ]
}
```

This finding shows a path from an internet gateway to an RDS instance on port 3306. The finding includes which security group rule allowed the traffic. Now you know exactly what to fix.

## Common Scopes for Security Auditing

Here are scopes that every organization should run regularly.

Scope: Internet to SSH/RDP:

```bash
aws ec2 create-network-insights-access-scope \
  --match-paths '[
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::Instance"]
        },
        "PacketHeader": {
          "DestinationPorts": [
            {"From": 22, "To": 22},
            {"From": 3389, "To": 3389}
          ]
        }
      }
    }
  ]' \
  --tags Key=Audit,Value=InternetSSHRDP
```

Scope: Internal services reaching the internet:

```bash
aws ec2 create-network-insights-access-scope \
  --match-paths '[
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::Instance"],
          "Resources": ["vpc-internal001"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      }
    }
  ]' \
  --tags Key=Audit,Value=EgressControl
```

## Automating Regular Scans

Set up a Lambda function to run analyses on a schedule and report findings.

Lambda function for automated network analysis:

```python
import boto3
import json
import time

ec2 = boto3.client('ec2')
sns = boto3.client('sns')

SCOPES = [
    'nis-internet-to-db',
    'nis-internet-to-ssh',
    'nis-prod-dev-isolation'
]

SNS_TOPIC = 'arn:aws:sns:us-east-1:123456789012:security-findings'

def handler(event, context):
    all_findings = []

    for scope_id in SCOPES:
        # Start analysis
        response = ec2.start_network_insights_access_scope_analysis(
            NetworkInsightsAccessScopeId=scope_id
        )
        analysis_id = response['NetworkInsightsAccessScopeAnalysis']['NetworkInsightsAccessScopeAnalysisId']

        # Wait for completion
        while True:
            status = ec2.describe_network_insights_access_scope_analyses(
                NetworkInsightsAccessScopeAnalysisIds=[analysis_id]
            )
            state = status['NetworkInsightsAccessScopeAnalyses'][0]['Status']
            if state == 'succeeded':
                break
            elif state == 'failed':
                print(f"Analysis {analysis_id} failed")
                break
            time.sleep(10)

        # Get findings
        findings = ec2.get_network_insights_access_scope_analysis_findings(
            NetworkInsightsAccessScopeAnalysisId=analysis_id
        )

        finding_count = len(findings.get('AnalysisFindings', []))
        if finding_count > 0:
            all_findings.append({
                'scope': scope_id,
                'analysis_id': analysis_id,
                'finding_count': finding_count
            })

    # Report findings
    if all_findings:
        sns.publish(
            TopicArn=SNS_TOPIC,
            Subject='Network Access Analyzer - Findings Detected',
            Message=json.dumps(all_findings, indent=2)
        )

    return {
        'statusCode': 200,
        'findings': all_findings
    }
```

Schedule the Lambda with EventBridge:

```bash
# Run the analysis daily
aws events put-rule \
  --name "daily-network-analysis" \
  --schedule-expression "cron(0 6 * * ? *)" \
  --description "Daily network access analysis"

aws events put-targets \
  --rule "daily-network-analysis" \
  --targets '[{
    "Id": "network-analyzer",
    "Arn": "arn:aws:lambda:us-east-1:123456789012:function:network-access-analyzer"
  }]'
```

## CloudFormation Template

Set up scopes and automated analysis with CloudFormation:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: VPC Network Access Analyzer Setup

Resources:
  InternetToDBScope:
    Type: AWS::EC2::NetworkInsightsAccessScope
    Properties:
      MatchPaths:
        - Source:
            ResourceStatement:
              ResourceTypes:
                - AWS::EC2::InternetGateway
          Destination:
            ResourceStatement:
              ResourceTypes:
                - AWS::RDS::DBInstance
            PacketHeader:
              DestinationPorts:
                - From: 3306
                  To: 3306
                - From: 5432
                  To: 5432
      Tags:
        - Key: Purpose
          Value: InternetToDatabase

  InternetToSSHScope:
    Type: AWS::EC2::NetworkInsightsAccessScope
    Properties:
      MatchPaths:
        - Source:
            ResourceStatement:
              ResourceTypes:
                - AWS::EC2::InternetGateway
          Destination:
            ResourceStatement:
              ResourceTypes:
                - AWS::EC2::Instance
            PacketHeader:
              DestinationPorts:
                - From: 22
                  To: 22
      Tags:
        - Key: Purpose
          Value: InternetToSSH
```

## Integration with Security Hub

Network Access Analyzer findings can be sent to AWS Security Hub for centralized security management. This puts network access violations alongside your other security findings.

```bash
# Enable the Network Access Analyzer integration in Security Hub
aws securityhub enable-import-findings-for-product \
  --product-arn arn:aws:securityhub:us-east-1::product/aws/network-access-analyzer
```

## Practical Tips

**Start with the "Internet to everything" scope.** You might be surprised at what's reachable from the internet. It's the most impactful first analysis you can run.

**Run analyses after every infrastructure change.** Include Network Access Analyzer in your CI/CD pipeline as a post-deployment check.

**Don't ignore findings - triage them.** Not every finding is a problem. Some internet access might be intentional. But every finding should be reviewed and either fixed or documented as accepted risk.

**Use exclude paths for known-good access.** If your scope generates findings for access that you've explicitly approved, use exclude paths to filter them out. This reduces noise and makes real issues stand out.

**Combine with VPC Flow Logs.** Network Access Analyzer tells you what access is possible. VPC Flow Logs tell you what access is actually happening. Together, they give you a complete picture of your network security posture.

For more on managing network access, see our guide on [AWS Verified Access](https://oneuptime.com/blog/post/2026-02-12-aws-verified-access-zero-trust/view).
