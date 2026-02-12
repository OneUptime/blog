# How to Use AWS Resource Groups for Organizing Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Resource Groups, Organization, Tagging

Description: Learn how to use AWS Resource Groups to organize, view, and manage your AWS resources by application, environment, team, or any other logical grouping.

---

Once your AWS account grows past a handful of resources, finding things becomes a real pain. You've got EC2 instances, RDS databases, Lambda functions, S3 buckets, and dozens of other resource types scattered across regions. The console search is decent, but it doesn't help you answer questions like "show me everything that belongs to the payments service" or "what resources are in our staging environment?"

AWS Resource Groups solve this by letting you create logical groupings of resources based on tags or CloudFormation stacks. You create a group, define what belongs in it, and then you can view, manage, and take actions on those resources as a unit.

## Types of Resource Groups

There are two types of resource groups:

**Tag-based groups** collect resources that share specific tags. This is the most flexible and common approach. If you've been tagging your resources consistently (and you should be), you can slice and dice your infrastructure any way you want.

**CloudFormation stack-based groups** collect all resources that belong to a specific CloudFormation stack. This is useful if your infrastructure is fully managed by CloudFormation.

## Creating a Tag-Based Resource Group

Let's say you want a group for all resources in your production environment. First, make sure your resources are tagged with `Environment: production`.

Using the CLI:

```bash
# Create a resource group for production resources
aws resource-groups create-group \
  --name "production-resources" \
  --description "All resources in the production environment" \
  --resource-query '{
    "Type": "TAG_FILTERS_1_0",
    "Query": "{\"ResourceTypeFilters\": [\"AWS::AllSupported\"], \"TagFilters\": [{\"Key\": \"Environment\", \"Values\": [\"production\"]}]}"
  }'
```

This creates a dynamic group - any resource tagged with `Environment: production` automatically appears in it. No manual maintenance needed.

You can also filter by specific resource types. Here's a group for just EC2 and RDS resources in production:

```bash
# Production compute and database resources only
aws resource-groups create-group \
  --name "production-compute-db" \
  --description "EC2 and RDS resources in production" \
  --resource-query '{
    "Type": "TAG_FILTERS_1_0",
    "Query": "{\"ResourceTypeFilters\": [\"AWS::EC2::Instance\", \"AWS::RDS::DBInstance\"], \"TagFilters\": [{\"Key\": \"Environment\", \"Values\": [\"production\"]}]}"
  }'
```

## Creating a CloudFormation Stack-Based Group

If your infrastructure is managed through CloudFormation, you can group resources by stack:

```bash
# Create a group from a CloudFormation stack
aws resource-groups create-group \
  --name "payments-service-stack" \
  --description "Resources from the payments service CloudFormation stack" \
  --resource-query '{
    "Type": "CLOUDFORMATION_STACK_1_0",
    "Query": "{\"ResourceTypeFilters\": [\"AWS::AllSupported\"], \"StackIdentifier\": \"arn:aws:cloudformation:us-east-1:123456789012:stack/payments-service/abc123\"}"
  }'
```

## Multi-Tag Filtering

Real-world grouping usually requires multiple tags. You can combine tag filters to narrow your selection:

```bash
# Resources that are in production AND owned by the platform team
aws resource-groups create-group \
  --name "platform-team-production" \
  --description "Platform team production resources" \
  --resource-query '{
    "Type": "TAG_FILTERS_1_0",
    "Query": "{\"ResourceTypeFilters\": [\"AWS::AllSupported\"], \"TagFilters\": [{\"Key\": \"Environment\", \"Values\": [\"production\"]}, {\"Key\": \"Team\", \"Values\": [\"platform\"]}]}"
  }'
```

Multiple tag filters work as AND conditions - resources must match all filters to be included.

## Listing Resources in a Group

Once you've created a group, you can list its members:

```bash
# List all resources in a group
aws resource-groups list-group-resources \
  --group-name "production-resources" \
  --query "Resources[].Identifier.{Type:ResourceType,ARN:ResourceArn}" \
  --output table
```

This is really useful for auditing. Want to know how many production resources you have? How many are EC2 instances? What's the breakdown by resource type?

```bash
# Count resources by type in a group
aws resource-groups list-group-resources \
  --group-name "production-resources" \
  --query "Resources[].Identifier.ResourceType" \
  --output json | python3 -c "
import json, sys
from collections import Counter
types = json.load(sys.stdin)
for rtype, count in sorted(Counter(types).items(), key=lambda x: -x[1]):
    print(f'{count:>5} {rtype}')
print(f'\nTotal: {len(types)} resources')
"
```

## Using Resource Groups in the Console

The console experience for Resource Groups is quite good. Navigate to Resource Groups in the console and you'll see all your groups listed. Clicking into one shows you every resource in that group with direct links to each resource's console page.

You can also use the "Tag Editor" from the Resource Groups console to find and fix tagging inconsistencies - which is essential for keeping your groups accurate. For more on bulk tagging, see our post on [using AWS Tag Editor for bulk tagging](https://oneuptime.com/blog/post/aws-tag-editor-bulk-tagging/view).

## Practical Grouping Strategies

Here's a tagging and grouping strategy that works well for most organizations:

**By Environment:**
- `Environment: production`
- `Environment: staging`
- `Environment: development`

**By Service/Application:**
- `Service: payments`
- `Service: user-auth`
- `Service: notifications`

**By Team:**
- `Team: platform`
- `Team: data-engineering`
- `Team: frontend`

**By Cost Center:**
- `CostCenter: engineering`
- `CostCenter: marketing`

Create resource groups for each combination you care about. Common useful groups include:

```bash
# Group per service per environment
for service in payments user-auth notifications; do
  for env in production staging; do
    aws resource-groups create-group \
      --name "${service}-${env}" \
      --description "${service} resources in ${env}" \
      --resource-query "{
        \"Type\": \"TAG_FILTERS_1_0\",
        \"Query\": \"{\\\"ResourceTypeFilters\\\": [\\\"AWS::AllSupported\\\"], \\\"TagFilters\\\": [{\\\"Key\\\": \\\"Service\\\", \\\"Values\\\": [\\\"${service}\\\"]}, {\\\"Key\\\": \\\"Environment\\\", \\\"Values\\\": [\\\"${env}\\\"]}]}\"
      }"
  done
done
```

## Resource Groups and Systems Manager

Resource Groups integrate directly with AWS Systems Manager. You can use a resource group as a target for Systems Manager operations like:

- **Run Command** - Execute commands on all instances in a group
- **Patch Manager** - Apply patches to a group of instances
- **Maintenance Windows** - Schedule maintenance for grouped resources

For example, to run a command on all production instances:

```bash
# Run a command targeting a resource group
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=resource-groups:Name,Values=production-compute" \
  --parameters '{"commands": ["uptime", "free -m", "df -h"]}' \
  --comment "Check system health on production instances"
```

## Resource Groups with AWS Config

AWS Config can use Resource Groups to scope its rules. Instead of evaluating compliance for all resources, you can evaluate only resources in a specific group:

```bash
# Config rule scoped to a resource group
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "prod-instances-must-be-encrypted",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ENCRYPTED_VOLUMES"
    },
    "Scope": {
      "TagKey": "Environment",
      "TagValue": "production"
    }
  }'
```

## Automation with Terraform

If you're using Terraform, here's how to create resource groups:

```hcl
# Resource group for production resources
resource "aws_resourcegroups_group" "production" {
  name        = "production-resources"
  description = "All production environment resources"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Environment"
          Values = ["production"]
        }
      ]
    })
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# Resource group per service
variable "services" {
  default = ["payments", "user-auth", "notifications", "search"]
}

resource "aws_resourcegroups_group" "service" {
  for_each    = toset(var.services)
  name        = "${each.value}-all-resources"
  description = "All resources for the ${each.value} service"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Service"
          Values = [each.value]
        }
      ]
    })
  }
}
```

## Finding Untagged Resources

Resource groups only work if your resources are properly tagged. Here's a quick way to find resources that are missing tags:

```bash
# Find EC2 instances missing the Environment tag
aws ec2 describe-instances \
  --query "Reservations[].Instances[?!not_null(Tags[?Key=='Environment'].Value | [0])].{Id:InstanceId,Name:Tags[?Key=='Name']|[0].Value}" \
  --output table
```

Set up a process to catch untagged resources early - either through Config rules or tag policies in AWS Organizations.

## Best Practices

1. **Standardize your tagging scheme** before creating resource groups. Inconsistent tags lead to incomplete groups.
2. **Use tag policies** in AWS Organizations to enforce tagging standards.
3. **Create groups that match how your team thinks** - by service, by team, by environment.
4. **Review group membership regularly** to catch resources that slipped through without proper tags.
5. **Integrate with Systems Manager** for group-level operations rather than targeting individual resources.

## Wrapping Up

Resource Groups are the organizational backbone of a well-managed AWS account. They cost nothing, take minutes to set up, and give you a clear view of your infrastructure organized the way your team actually thinks about it. The key prerequisite is consistent tagging - get that right, and Resource Groups become incredibly powerful.
