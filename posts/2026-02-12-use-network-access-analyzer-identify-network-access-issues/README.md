# How to Use Network Access Analyzer to Identify Network Access Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, Security

Description: Learn how to use AWS Network Access Analyzer to identify unintended network access paths and verify your network meets compliance requirements.

---

AWS Network Access Analyzer is a security-focused tool that helps you identify network access paths you might not be aware of. While Reachability Analyzer checks whether a specific path between two endpoints works, Network Access Analyzer takes a broader approach - it scans your entire VPC configuration to find all paths that match certain criteria. Think of it as an audit tool for your network rather than a debugging tool.

## How It Differs from Reachability Analyzer

The distinction matters. Reachability Analyzer asks: "Can instance A talk to instance B on port 443?" Network Access Analyzer asks: "What resources in my VPC can be reached from the internet?" or "Which resources have access to my database subnet?"

This broader question is incredibly useful for security reviews, compliance checks, and understanding the blast radius of a misconfigured security group.

## Key Concepts

Before diving in, let's cover the terminology:

- **Network Access Scope**: A set of conditions that define what network paths you're looking for. For example, "any path from the internet to a private subnet."
- **Network Access Scope Analysis**: The actual run of the analyzer against a scope. This produces findings.
- **Findings**: Individual network paths that match your scope conditions. Each finding shows the full path from source to destination.

## Getting Started from the Console

Navigate to the VPC console and find "Network Access Analyzer" in the left sidebar. You'll see two options: "Network Access Scopes" and "Network Access Scope Analyses."

First, create a scope. AWS provides several built-in scope templates:

1. **AWS-VPC-Ingress** - Finds paths from internet gateways to your resources
2. **AWS-VPC-Egress** - Finds paths from your resources to internet gateways
3. **AWS-VPC-CrossVPC** - Finds paths between different VPCs

You can also create custom scopes for more targeted analysis.

## Creating a Custom Scope

Let's create a scope that identifies any network path from the internet to resources in private subnets. This is a common compliance requirement.

This scope definition looks for paths from internet gateways to any ENI, filtering by specific destination ports.

```json
{
  "MatchPaths": [
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": [
            "AWS::EC2::InternetGateway"
          ]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": [
            "AWS::EC2::NetworkInterface"
          ]
        }
      },
      "ThroughResources": []
    }
  ]
}
```

## Creating a Scope with the CLI

You can create scopes using the AWS CLI for better automation.

This command creates a network access scope that checks for internet-to-instance paths.

```bash
# Create a network access scope
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
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        }
      }
    }
  ]'
```

Save the returned `NetworkInsightsAccessScopeId` for the next step.

## Running an Analysis

Once you have a scope, start an analysis.

This command kicks off the analysis against your scope definition.

```bash
# Start analysis
aws ec2 start-network-insights-access-scope-analysis \
  --network-insights-access-scope-id nis-0abc123def456789
```

The analysis examines every VPC in the region and checks all possible paths against your scope conditions. This can take several minutes depending on the complexity of your network.

## Checking Results

After the analysis completes, retrieve the findings.

This command gets all findings from the analysis, showing each network path that matched your scope.

```bash
# Get analysis results
aws ec2 get-network-insights-access-scope-analysis-findings \
  --network-insights-access-scope-analysis-id nisa-0abc123def456789 \
  --max-results 50
```

Each finding includes the full path from source to destination, including every security group, route table, and NACL in between. This detail helps you understand exactly how the traffic flows and where to apply fixes.

## Common Use Cases

### Finding Publicly Accessible Databases

One of the most critical security checks is ensuring databases aren't directly accessible from the internet.

This scope targets paths from the internet to database ports specifically.

```json
{
  "MatchPaths": [
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        },
        "PacketHeaderStatement": {
          "DestinationPorts": ["3306", "5432", "1433", "27017"]
        }
      }
    }
  ]
}
```

### Cross-VPC Access Audit

If you have multiple VPCs connected through peering or transit gateways, you can check which resources are accessible across VPC boundaries.

This scope identifies cross-VPC communication paths that go through VPC peering connections.

```json
{
  "MatchPaths": [
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        }
      },
      "ThroughResources": [
        {
          "ResourceStatement": {
            "ResourceTypes": ["AWS::EC2::VPCPeeringConnection"]
          }
        }
      ],
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        }
      }
    }
  ]
}
```

### Egress Path Analysis

Check which resources can send traffic to the internet. This is useful for detecting potential data exfiltration paths.

This scope finds all paths from internal resources to the internet.

```json
{
  "MatchPaths": [
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      }
    }
  ]
}
```

## Automating with Python

Here's a script that creates a scope, runs analysis, and reports findings in a readable format.

This Python script automates the full analysis workflow and prints results in a human-readable format.

```python
import boto3
import json
import time

ec2 = boto3.client('ec2')

def analyze_internet_access():
    # Create scope for internet ingress
    scope = ec2.create_network_insights_access_scope(
        MatchPaths=[
            {
                'Source': {
                    'ResourceStatement': {
                        'ResourceTypes': ['AWS::EC2::InternetGateway']
                    }
                },
                'Destination': {
                    'ResourceStatement': {
                        'ResourceTypes': ['AWS::EC2::NetworkInterface']
                    }
                }
            }
        ],
        TagSpecifications=[
            {
                'ResourceType': 'network-insights-access-scope',
                'Tags': [{'Key': 'Name', 'Value': 'Internet-Ingress-Audit'}]
            }
        ]
    )
    scope_id = scope['NetworkInsightsAccessScope']['NetworkInsightsAccessScopeId']
    print(f"Created scope: {scope_id}")

    # Start analysis
    analysis = ec2.start_network_insights_access_scope_analysis(
        NetworkInsightsAccessScopeId=scope_id
    )
    analysis_id = analysis['NetworkInsightsAccessScopeAnalysis']['NetworkInsightsAccessScopeAnalysisId']

    # Wait for completion
    while True:
        result = ec2.describe_network_insights_access_scope_analyses(
            NetworkInsightsAccessScopeAnalysisIds=[analysis_id]
        )
        status = result['NetworkInsightsAccessScopeAnalyses'][0]['Status']
        if status == 'succeeded':
            break
        elif status == 'failed':
            print("Analysis failed")
            return
        time.sleep(15)

    # Get findings
    findings = ec2.get_network_insights_access_scope_analysis_findings(
        NetworkInsightsAccessScopeAnalysisId=analysis_id
    )

    # Report results
    print(f"\nFound {len(findings.get('AnalysisFindings', []))} internet-accessible paths:")
    for finding in findings.get('AnalysisFindings', []):
        finding_id = finding.get('NetworkInsightsAccessScopeAnalysisId')
        components = finding.get('FindingComponents', [])
        if components:
            dest = components[-1]
            print(f"  - {dest.get('Component', {}).get('Id', 'unknown')}")

analyze_internet_access()
```

## Exclude Paths

Sometimes you have known, intentional internet-facing resources like load balancers. You can exclude these from your scope to reduce noise.

This scope excludes paths that go through load balancers, since those are intentionally public.

```json
{
  "MatchPaths": [
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      },
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        }
      }
    }
  ],
  "ExcludePaths": [
    {
      "Source": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::InternetGateway"]
        }
      },
      "ThroughResources": [
        {
          "ResourceStatement": {
            "ResourceTypes": ["AWS::ElasticLoadBalancingV2::LoadBalancer"]
          }
        }
      ],
      "Destination": {
        "ResourceStatement": {
          "ResourceTypes": ["AWS::EC2::NetworkInterface"]
        }
      }
    }
  ]
}
```

## Pricing

Network Access Analyzer charges based on the number of ENIs analyzed. The first analysis each month includes up to 1,000 ENIs free. After that, it's $0.002 per ENI per analysis. For a VPC with 500 ENIs, that's about $1 per analysis after the free tier.

## Best Practices

1. **Run regularly**: Schedule monthly analyses to catch configuration drift.
2. **Start with built-in scopes**: AWS provides good defaults. Use them before building custom scopes.
3. **Exclude known good paths**: Reduce noise by excluding intentionally public resources.
4. **Integrate with alerting**: Pipe findings into your monitoring stack. If you're using [OneUptime for infrastructure monitoring](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view), you can create alerts based on unexpected findings.
5. **Use tags for filtering**: Tag your resources consistently so you can filter findings by environment, team, or application.

## Wrapping Up

Network Access Analyzer fills a gap that's hard to cover with manual reviews. Checking every security group, route table, and NACL combination in a complex VPC is practically impossible by hand. This tool automates that analysis and gives you a clear picture of who can reach what in your network. Whether you're preparing for a compliance audit or just want to sleep better at night knowing your databases aren't accidentally exposed, it's worth adding to your security toolkit.
