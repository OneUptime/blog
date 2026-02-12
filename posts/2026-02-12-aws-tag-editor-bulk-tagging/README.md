# How to Use AWS Tag Editor for Bulk Tagging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Tag Editor, Tagging, Resource Management

Description: Use AWS Tag Editor to find untagged or incorrectly tagged resources and apply tags in bulk across your entire AWS account or organization.

---

Tags are the foundation of AWS resource management. They drive cost allocation, access control, automation targeting, and organizational visibility. But keeping tags consistent across hundreds or thousands of resources is hard. Someone spins up an EC2 instance without the required tags. A CloudFormation stack creates resources with slightly different tag names. Before you know it, you've got "Environment", "environment", "env", and "Env" all referring to the same thing.

AWS Tag Editor is a tool within the Resource Groups console that lets you search for resources by tag (or lack of tag), view their current tags, and update them in bulk. It's not glamorous, but it's essential for tag hygiene.

## Accessing Tag Editor

You can find Tag Editor in the AWS Console under Resource Groups & Tag Editor, or go directly to `https://console.aws.amazon.com/resource-groups/tag-editor`. It works across most AWS resource types and supports cross-region searches.

## Finding Resources by Tag

The most common use case is finding resources that are missing required tags. Let's say your organization requires every resource to have `Environment`, `Team`, and `CostCenter` tags.

In the console, Tag Editor lets you search by:
- **Region** (one, multiple, or all regions)
- **Resource types** (specific types or all supported types)
- **Tags** (resources with specific tag key/value pairs, or resources missing a specific tag)

For the CLI approach, you can use the Resource Groups Tagging API:

```bash
# Find all resources in us-east-1 (no tag filter - gets everything)
aws resourcegroupstaggingapi get-resources \
  --region us-east-1 \
  --query "ResourceTagMappingList[].{ARN:ResourceARN,Tags:Tags}" \
  --output json
```

To find resources missing a specific tag, you'll need a bit of filtering:

```bash
# Find resources that DON'T have the 'Environment' tag
aws resourcegroupstaggingapi get-resources \
  --region us-east-1 \
  --output json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for resource in data['ResourceTagMappingList']:
    tags = {t['Key']: t['Value'] for t in resource.get('Tags', [])}
    if 'Environment' not in tags:
        print(f\"Missing Environment tag: {resource['ResourceARN']}\")
" | head -50
```

To find resources with a specific tag value:

```bash
# Find all resources tagged with Environment=production
aws resourcegroupstaggingapi get-resources \
  --tag-filters "Key=Environment,Values=production" \
  --region us-east-1 \
  --query "ResourceTagMappingList[].ResourceARN" \
  --output table
```

## Bulk Tagging Resources

Once you've found resources that need tagging, you can apply tags in bulk. In the console's Tag Editor, you select the resources from your search results, click "Manage tags of selected resources," and add/modify/remove tags.

Via CLI, use the `tag-resources` command:

```bash
# Tag multiple resources at once
aws resourcegroupstaggingapi tag-resources \
  --resource-arn-list \
    "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123" \
    "arn:aws:ec2:us-east-1:123456789012:instance/i-0def456" \
    "arn:aws:ec2:us-east-1:123456789012:instance/i-0ghi789" \
  --tags '{"Environment": "production", "Team": "platform"}' \
  --region us-east-1
```

You can tag up to 20 resources in a single API call. For larger batches, script it:

```bash
# Bulk tag all untagged EC2 instances with a default environment tag
aws ec2 describe-instances \
  --query "Reservations[].Instances[?!Tags || !contains(Tags[].Key, 'Environment')].InstanceId" \
  --output text \
  --region us-east-1 | tr '\t' '\n' | while read -r INSTANCE_ID; do
    if [ -n "$INSTANCE_ID" ]; then
      echo "Tagging $INSTANCE_ID"
      aws ec2 create-tags \
        --resources "$INSTANCE_ID" \
        --tags "Key=Environment,Value=unknown" "Key=TaggedBy,Value=bulk-tagger" \
        --region us-east-1
    fi
done
```

## Fixing Inconsistent Tags

One of the most common problems is tag value inconsistency. You might have "prod", "production", "Production", and "PRODUCTION" all meaning the same thing.

Here's a script to find and fix these inconsistencies:

```python
import boto3
from collections import defaultdict

def find_tag_inconsistencies(region='us-east-1'):
    """Find resources with inconsistent tag values."""
    client = boto3.client('resourcegroupstaggingapi', region_name=region)
    paginator = client.get_paginator('get_resources')

    # Collect all values for each tag key
    tag_values = defaultdict(lambda: defaultdict(list))

    for page in paginator.paginate():
        for resource in page['ResourceTagMappingList']:
            arn = resource['ResourceARN']
            for tag in resource.get('Tags', []):
                tag_values[tag['Key']][tag['Value']].append(arn)

    # Report inconsistencies (multiple values for same key that look similar)
    for key, values in tag_values.items():
        if len(values) > 1:
            # Check for case-insensitive duplicates
            lower_map = defaultdict(list)
            for val in values:
                lower_map[val.lower()].append(val)

            for lower_val, originals in lower_map.items():
                if len(originals) > 1:
                    print(f"\nInconsistent values for tag '{key}':")
                    for original in originals:
                        count = len(values[original])
                        print(f"  '{original}' - {count} resources")

find_tag_inconsistencies()
```

Once you've identified inconsistencies, fix them with a standardization script:

```python
import boto3

def standardize_tag(region, tag_key, old_values, new_value):
    """Replace inconsistent tag values with a standard value."""
    client = boto3.client('resourcegroupstaggingapi', region_name=region)

    for old_value in old_values:
        if old_value == new_value:
            continue

        paginator = client.get_paginator('get_resources')
        pages = paginator.paginate(
            TagFilters=[{'Key': tag_key, 'Values': [old_value]}]
        )

        for page in pages:
            arns = [r['ResourceARN'] for r in page['ResourceTagMappingList']]
            # Process in batches of 20 (API limit)
            for i in range(0, len(arns), 20):
                batch = arns[i:i+20]
                client.tag_resources(
                    ResourceARNList=batch,
                    Tags={tag_key: new_value}
                )
                print(f"Updated {len(batch)} resources: "
                      f"'{old_value}' -> '{new_value}'")

# Standardize Environment tag values
standardize_tag(
    region='us-east-1',
    tag_key='Environment',
    old_values=['prod', 'Production', 'PRODUCTION', 'Prod'],
    new_value='production'
)
```

## Removing Tags

Sometimes you need to remove tags - maybe a tag key was misspelled, or a tag is no longer needed:

```bash
# Remove a tag from multiple resources
aws resourcegroupstaggingapi untag-resources \
  --resource-arn-list \
    "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123" \
    "arn:aws:ec2:us-east-1:123456789012:instance/i-0def456" \
  --tag-keys "OldTagKey" "MisspelledTag" \
  --region us-east-1
```

## Tag Compliance Reporting

Build a compliance report to track your tagging health over time:

```python
import boto3
from collections import defaultdict
import json

def generate_tag_compliance_report(region, required_tags):
    """
    Generate a report showing tag compliance across all resources.
    """
    client = boto3.client('resourcegroupstaggingapi', region_name=region)
    paginator = client.get_paginator('get_resources')

    stats = {
        'total_resources': 0,
        'fully_compliant': 0,
        'missing_tags': defaultdict(int),
        'non_compliant_resources': []
    }

    for page in paginator.paginate():
        for resource in page['ResourceTagMappingList']:
            stats['total_resources'] += 1
            tags = {t['Key']: t['Value'] for t in resource.get('Tags', [])}

            missing = [t for t in required_tags if t not in tags]
            if missing:
                stats['missing_tags'][tuple(missing)] += 1
                if len(stats['non_compliant_resources']) < 100:
                    stats['non_compliant_resources'].append({
                        'arn': resource['ResourceARN'],
                        'missing': missing
                    })
            else:
                stats['fully_compliant'] += 1

    compliance_pct = (
        (stats['fully_compliant'] / stats['total_resources'] * 100)
        if stats['total_resources'] > 0 else 0
    )

    print(f"Tag Compliance Report - {region}")
    print(f"{'=' * 50}")
    print(f"Total resources: {stats['total_resources']}")
    print(f"Fully compliant: {stats['fully_compliant']}")
    print(f"Compliance rate: {compliance_pct:.1f}%")
    print(f"\nMost commonly missing tags:")
    for tags, count in sorted(
        stats['missing_tags'].items(), key=lambda x: -x[1]
    )[:10]:
        print(f"  {', '.join(tags)}: {count} resources")

    return stats

# Run the report
generate_tag_compliance_report(
    region='us-east-1',
    required_tags=['Environment', 'Team', 'CostCenter', 'Service']
)
```

## Enforcing Tags with AWS Organizations Tag Policies

Prevention is better than cleanup. Use tag policies in AWS Organizations to enforce tagging standards:

```json
{
  "tags": {
    "Environment": {
      "tag_key": {
        "@@assign": "Environment"
      },
      "tag_value": {
        "@@assign": ["production", "staging", "development", "sandbox"]
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
    "Team": {
      "tag_key": {
        "@@assign": "Team"
      }
    }
  }
}
```

This policy ensures that when someone uses the "Environment" tag, they must use one of the approved values. It doesn't force people to add the tag, but it prevents them from using non-standard values.

## Automating Tag Compliance with AWS Config

Set up AWS Config rules to continuously monitor tag compliance:

```bash
# Config rule requiring specific tags on EC2 instances
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "required-tags-ec2",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "REQUIRED_TAGS"
    },
    "InputParameters": "{\"tag1Key\": \"Environment\", \"tag2Key\": \"Team\", \"tag3Key\": \"CostCenter\"}",
    "Scope": {
      "ComplianceResourceTypes": ["AWS::EC2::Instance"]
    }
  }'
```

For organizing tagged resources into logical groups, see our guide on [using AWS Resource Groups](https://oneuptime.com/blog/post/aws-resource-groups-organizing-resources/view).

## Best Practices

1. **Define your tagging strategy before you start tagging** - Document required tags, allowed values, and naming conventions.
2. **Run Tag Editor weekly** - Make it a recurring task to find and fix untagged resources.
3. **Automate enforcement** - Tag policies and Config rules catch problems earlier than manual audits.
4. **Use automation to tag at creation time** - CloudFormation, Terraform, and CDK should all include required tags in their templates.
5. **Keep tag keys consistent** - Use a standard like PascalCase or lowercase with hyphens, and stick to it.
6. **Don't over-tag** - 5-8 required tags is plenty. Too many required tags means people stop caring.

## Wrapping Up

Tag Editor isn't exciting, but it's one of the most practically useful tools in the AWS console. Good tagging drives everything from cost allocation to security policies to operational automation. Spend 30 minutes with Tag Editor each week, set up automated compliance checks, and your AWS account will be dramatically easier to manage.
