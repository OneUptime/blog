# How to Implement Tag Policies in AWS Organizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Organizations, Tagging, Governance, Cost Management

Description: A practical guide to implementing tag policies in AWS Organizations to enforce consistent tagging across all accounts for cost allocation, compliance, and automation.

---

Tags are the backbone of cost allocation, security automation, and resource management in AWS. But they only work when they're consistent. If one team tags their environment as "prod", another uses "production", and a third uses "Production" - your cost reports, automation scripts, and compliance rules all break.

Tag policies in AWS Organizations solve this by defining standardized tag keys and allowed values across all accounts. When a policy is enforced, resources that don't comply with the tag rules get flagged, and optionally, you can prevent non-compliant tagging altogether.

## Enabling Tag Policies

First, enable tag policies in your organization:

```bash
# Get the root ID
ROOT_ID=$(aws organizations list-roots --query 'Roots[0].Id' --output text)

# Enable tag policies
aws organizations enable-policy-type \
    --root-id "$ROOT_ID" \
    --policy-type "TAG_POLICY"
```

## Creating Your First Tag Policy

A tag policy defines the rules for one or more tag keys. Let's start with a common set of tags that most organizations need:

```bash
# Create a tag policy for the Environment tag
aws organizations create-policy \
    --name "EnvironmentTagPolicy" \
    --description "Standardize the Environment tag across all accounts" \
    --type "TAG_POLICY" \
    --content '{
        "tags": {
            "Environment": {
                "tag_key": {
                    "@@assign": "Environment"
                },
                "tag_value": {
                    "@@assign": [
                        "production",
                        "staging",
                        "development",
                        "sandbox"
                    ]
                },
                "enforced_for": {
                    "@@assign": [
                        "ec2:instance",
                        "ec2:volume",
                        "rds:db",
                        "s3:bucket",
                        "lambda:function",
                        "elasticloadbalancing:loadbalancer"
                    ]
                }
            }
        }
    }'
```

Let's break down what each section does:

- **tag_key with @@assign** - Defines the exact casing of the tag key. Even if someone types "environment" or "ENVIRONMENT", the policy says it should be "Environment".
- **tag_value with @@assign** - Lists the only allowed values. Anything else gets flagged or blocked.
- **enforced_for** - Which resource types must comply. Without this, the policy only reports non-compliance but doesn't prevent it.

## Comprehensive Tag Policy

Here's a more complete policy covering the tags most organizations need:

```bash
# Comprehensive tag policy for cost allocation and resource management
aws organizations create-policy \
    --name "StandardTagPolicy" \
    --description "Standard tagging requirements for all accounts" \
    --type "TAG_POLICY" \
    --content '{
        "tags": {
            "Environment": {
                "tag_key": {
                    "@@assign": "Environment"
                },
                "tag_value": {
                    "@@assign": [
                        "production",
                        "staging",
                        "development",
                        "sandbox"
                    ]
                },
                "enforced_for": {
                    "@@assign": [
                        "ec2:instance",
                        "ec2:volume",
                        "rds:db",
                        "s3:bucket"
                    ]
                }
            },
            "CostCenter": {
                "tag_key": {
                    "@@assign": "CostCenter"
                },
                "tag_value": {
                    "@@assign": [
                        "engineering",
                        "marketing",
                        "sales",
                        "operations",
                        "finance",
                        "hr",
                        "platform"
                    ]
                },
                "enforced_for": {
                    "@@assign": [
                        "ec2:instance",
                        "rds:db",
                        "s3:bucket",
                        "lambda:function"
                    ]
                }
            },
            "Owner": {
                "tag_key": {
                    "@@assign": "Owner"
                }
            },
            "Project": {
                "tag_key": {
                    "@@assign": "Project"
                }
            },
            "DataClassification": {
                "tag_key": {
                    "@@assign": "DataClassification"
                },
                "tag_value": {
                    "@@assign": [
                        "public",
                        "internal",
                        "confidential",
                        "restricted"
                    ]
                }
            }
        }
    }'
```

Notice that `Owner` and `Project` don't have `tag_value` restrictions - any value is accepted. This makes sense because owner names and project names vary too much to enumerate. The policy just ensures the tag key casing is consistent.

## Attaching Tag Policies

Attach the policy to the root to apply it to all accounts, or to specific OUs:

```bash
# Get the policy ID
TAG_POLICY_ID=$(aws organizations list-policies \
    --filter "TAG_POLICY" \
    --query "Policies[?Name=='StandardTagPolicy'].Id" \
    --output text)

# Attach to the root (all accounts)
aws organizations attach-policy \
    --policy-id "$TAG_POLICY_ID" \
    --target-id "$ROOT_ID"
```

You can also attach different policies to different OUs. For example, production accounts might have stricter requirements:

```bash
# Stricter policy for production OU - more resource types enforced
aws organizations create-policy \
    --name "ProductionTagPolicy" \
    --description "Stricter tagging for production accounts" \
    --type "TAG_POLICY" \
    --content '{
        "tags": {
            "Environment": {
                "tag_value": {
                    "@@assign": ["production"]
                },
                "enforced_for": {
                    "@@assign": [
                        "ec2:instance",
                        "ec2:volume",
                        "ec2:security-group",
                        "rds:db",
                        "rds:cluster",
                        "s3:bucket",
                        "lambda:function",
                        "elasticloadbalancing:loadbalancer",
                        "elasticloadbalancing:targetgroup",
                        "ecs:cluster",
                        "ecs:service",
                        "eks:cluster",
                        "sqs:queue",
                        "sns:topic",
                        "kinesis:stream"
                    ]
                }
            }
        }
    }'

# Attach to the Production OU
aws organizations attach-policy \
    --policy-id "$PROD_TAG_POLICY_ID" \
    --target-id "$PROD_OU_ID"
```

When multiple tag policies apply (from root and OU), they merge. The OU-level policy can add values or resource types but can't remove ones defined by the parent.

## Checking Compliance

Tag policies generate compliance data that you can query:

```bash
# Check tag compliance across the organization
aws resourcegroupstaggingapi get-compliance-summary \
    --region us-east-1

# Get detailed compliance for a specific tag key
aws resourcegroupstaggingapi get-compliance-summary \
    --tag-key-filters Key=Environment \
    --region us-east-1

# Get non-compliant resources
aws resourcegroupstaggingapi get-resources \
    --tag-filters Key=Environment \
    --compliance-status NON_COMPLIANT \
    --region us-east-1
```

## Finding Untagged Resources

Even with tag policies, you might have resources created before the policy that need remediation:

```bash
# Find all EC2 instances missing the Environment tag
aws resourcegroupstaggingapi get-resources \
    --resource-type-filters ec2:instance \
    --region us-east-1 \
    --query "ResourceTagMappingList[?!contains(Tags[*].Key, 'Environment')]"
```

Here's a Python script that reports on tagging compliance across your account:

```python
# Script to audit tag compliance and generate a report
import boto3
from collections import defaultdict

tagging = boto3.client('resourcegroupstaggingapi', region_name='us-east-1')

required_tags = ['Environment', 'CostCenter', 'Owner', 'Project']
report = defaultdict(lambda: {'total': 0, 'compliant': 0, 'missing_tags': defaultdict(int)})

paginator = tagging.get_paginator('get_resources')

for page in paginator.paginate():
    for resource in page['ResourceTagMappingList']:
        resource_type = resource['ResourceARN'].split(':')[2]
        existing_tags = {tag['Key'] for tag in resource.get('Tags', [])}

        report[resource_type]['total'] += 1

        missing = set(required_tags) - existing_tags
        if not missing:
            report[resource_type]['compliant'] += 1
        else:
            for tag in missing:
                report[resource_type]['missing_tags'][tag] += 1

# Print the report
print(f"{'Resource Type':<25} {'Total':<8} {'Compliant':<10} {'Rate':<8} Missing Tags")
print("-" * 100)

for resource_type, data in sorted(report.items(), key=lambda x: x[1]['total'], reverse=True):
    rate = (data['compliant'] / data['total'] * 100) if data['total'] > 0 else 0
    missing = ', '.join(f"{k}({v})" for k, v in sorted(data['missing_tags'].items(), key=lambda x: -x[1]))
    print(f"{resource_type:<25} {data['total']:<8} {data['compliant']:<10} {rate:>5.1f}%  {missing}")
```

## Auto-Tagging with Lambda

To catch resources created without required tags, set up automatic tagging:

```python
# Lambda function triggered by CloudTrail events to auto-tag new resources
import boto3
import json

ec2 = boto3.client('ec2')

DEFAULT_TAGS = {
    'Environment': 'development',
    'CostCenter': 'unknown',
    'Owner': 'unassigned',
    'ManagedBy': 'auto-tagger'
}

def lambda_handler(event, context):
    detail = event.get('detail', {})
    event_name = detail.get('eventName', '')
    response_elements = detail.get('responseElements', {})

    # Handle EC2 instance launches
    if event_name == 'RunInstances':
        instances = response_elements.get('instancesSet', {}).get('items', [])
        instance_ids = [i['instanceId'] for i in instances]

        if instance_ids:
            # Get existing tags
            response = ec2.describe_tags(
                Filters=[
                    {'Name': 'resource-id', 'Values': instance_ids}
                ]
            )

            existing_tags = {}
            for tag in response['Tags']:
                resource_id = tag['ResourceId']
                if resource_id not in existing_tags:
                    existing_tags[resource_id] = set()
                existing_tags[resource_id].add(tag['Key'])

            # Add missing required tags with default values
            for instance_id in instance_ids:
                current_tags = existing_tags.get(instance_id, set())
                tags_to_add = []

                for key, default_value in DEFAULT_TAGS.items():
                    if key not in current_tags:
                        tags_to_add.append({'Key': key, 'Value': default_value})

                if tags_to_add:
                    ec2.create_tags(
                        Resources=[instance_id],
                        Tags=tags_to_add
                    )
                    print(f"Auto-tagged {instance_id} with {len(tags_to_add)} tags")

    return {'status': 'processed'}
```

## Cost Allocation Tags

Tag policies work hand-in-hand with cost allocation. After standardizing your tags, activate them for cost allocation:

```bash
# Activate cost allocation tags (this is a billing operation)
aws ce update-cost-allocation-tags-status \
    --cost-allocation-tags-status '[
        {"TagKey": "Environment", "Status": "Active"},
        {"TagKey": "CostCenter", "Status": "Active"},
        {"TagKey": "Project", "Status": "Active"},
        {"TagKey": "Owner", "Status": "Active"}
    ]'
```

Once activated, these tags appear in your AWS Cost Explorer and billing reports. You can filter and group costs by any of these tag values, giving you accurate cost attribution per team, project, or environment.

Tag policies are a foundational governance mechanism that complements [Service Control Policies](https://oneuptime.com/blog/post/2026-02-12-aws-organizations-service-control-policies/view). Together they give you both permission guardrails and resource management standards across your entire organization.
