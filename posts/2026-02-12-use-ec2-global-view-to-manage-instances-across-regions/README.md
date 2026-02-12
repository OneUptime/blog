# How to Use EC2 Global View to Manage Instances Across Regions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Global View, Multi-Region, Resource Management, Operations

Description: Use EC2 Global View to see and manage EC2 instances, VPCs, subnets, and security groups across all AWS regions from a single dashboard.

---

If you're running EC2 instances in multiple AWS regions, you know the pain of switching between regions in the console to get a full picture. Did someone launch a test instance in ap-southeast-1 and forget about it? Is there an unused Elastic IP sitting in eu-central-1? EC2 Global View gives you a single pane of glass to see all your EC2 resources across every region.

## What EC2 Global View Shows

EC2 Global View provides a unified view of these resource types across all enabled regions:

- EC2 instances
- VPCs
- Subnets
- Security groups
- EBS volumes
- Elastic IPs

You can search, filter, and sort across all regions without switching context. It's particularly useful for:
- Finding orphaned resources
- Getting a count of instances by region
- Identifying resources in unexpected regions
- Quick audits of your global footprint

## Accessing Global View

In the AWS Console, navigate to EC2 and click "EC2 Global View" in the left sidebar. But the real power comes from the API, which lets you script and automate cross-region visibility.

## Using the API

List all instances across all regions:

```bash
# Get a summary of EC2 instances across all regions
aws ec2 describe-instance-type-offerings \
  --location-type region \
  --query 'InstanceTypeOfferings[0:5]'

# Since there is no single API for global view,
# here is a script that queries all regions
for REGION in $(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text); do
  COUNT=$(aws ec2 describe-instances \
    --region $REGION \
    --filters "Name=instance-state-name,Values=running" \
    --query 'length(Reservations[*].Instances[*])' --output text 2>/dev/null)

  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    echo "$REGION: $COUNT running instances"
  fi
done
```

## Building a Cross-Region Dashboard Script

Here's a more comprehensive script that gives you a full global inventory:

```bash
#!/bin/bash
# ec2-global-inventory.sh
# Get a global view of all EC2 resources across regions

echo "========================================="
echo "EC2 Global Resource Inventory"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================="

TOTAL_INSTANCES=0
TOTAL_VOLUMES=0
TOTAL_EIPS=0

for REGION in $(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text); do

  # Count running instances
  INSTANCES=$(aws ec2 describe-instances \
    --region $REGION \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text 2>/dev/null | wc -w | tr -d ' ')

  # Count EBS volumes
  VOLUMES=$(aws ec2 describe-volumes \
    --region $REGION \
    --query 'length(Volumes)' \
    --output text 2>/dev/null || echo 0)

  # Count unattached Elastic IPs
  EIPS=$(aws ec2 describe-addresses \
    --region $REGION \
    --filters "Name=association-id,Values=" \
    --query 'length(Addresses)' \
    --output text 2>/dev/null || echo 0)

  # Only print regions with resources
  if [ "$INSTANCES" -gt 0 ] || [ "$VOLUMES" -gt 0 ] || [ "$EIPS" -gt 0 ]; then
    echo ""
    echo "--- $REGION ---"
    echo "  Running instances: $INSTANCES"
    echo "  EBS volumes:       $VOLUMES"
    echo "  Unused Elastic IPs: $EIPS"

    TOTAL_INSTANCES=$((TOTAL_INSTANCES + INSTANCES))
    TOTAL_VOLUMES=$((TOTAL_VOLUMES + VOLUMES))
    TOTAL_EIPS=$((TOTAL_EIPS + EIPS))
  fi
done

echo ""
echo "========================================="
echo "TOTALS"
echo "  Running instances: $TOTAL_INSTANCES"
echo "  EBS volumes:       $TOTAL_VOLUMES"
echo "  Unused Elastic IPs: $TOTAL_EIPS"
echo "========================================="
```

## Finding Orphaned Resources

One of the most valuable uses of a global view is finding resources that should have been cleaned up:

```bash
#!/bin/bash
# find-orphaned-resources.sh
# Find EC2 resources that might be orphaned across all regions

echo "=== Orphaned Resource Scan ==="

for REGION in $(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text); do

  # Find unattached EBS volumes
  UNATTACHED=$(aws ec2 describe-volumes \
    --region $REGION \
    --filters "Name=status,Values=available" \
    --query 'Volumes[*].{Id:VolumeId,Size:Size,Created:CreateTime}' \
    --output json 2>/dev/null)

  if [ "$UNATTACHED" != "[]" ] && [ "$UNATTACHED" != "" ]; then
    echo ""
    echo "[$REGION] Unattached EBS volumes:"
    echo "$UNATTACHED" | jq -r '.[] | "  \(.Id) - \(.Size)GB - created \(.Created)"'
  fi

  # Find unused Elastic IPs
  UNUSED_EIPS=$(aws ec2 describe-addresses \
    --region $REGION \
    --query 'Addresses[?AssociationId==null].{IP:PublicIp,AllocId:AllocationId}' \
    --output json 2>/dev/null)

  if [ "$UNUSED_EIPS" != "[]" ] && [ "$UNUSED_EIPS" != "" ]; then
    echo ""
    echo "[$REGION] Unused Elastic IPs:"
    echo "$UNUSED_EIPS" | jq -r '.[] | "  \(.IP) (\(.AllocId))"'
  fi

  # Find stopped instances older than 30 days
  THIRTY_DAYS_AGO=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-30d +%Y-%m-%dT%H:%M:%S)
  STOPPED=$(aws ec2 describe-instances \
    --region $REGION \
    --filters "Name=instance-state-name,Values=stopped" \
    --query "Reservations[*].Instances[?LaunchTime<='${THIRTY_DAYS_AGO}'].{Id:InstanceId,Type:InstanceType,Name:Tags[?Key=='Name']|[0].Value}" \
    --output json 2>/dev/null)

  if [ "$STOPPED" != "[[]]" ] && [ "$STOPPED" != "[]" ] && [ "$STOPPED" != "" ]; then
    echo ""
    echo "[$REGION] Stopped instances (30+ days):"
    echo "$STOPPED" | jq -r '.[][] | "  \(.Id) - \(.Type) - \(.Name // "no name")"' 2>/dev/null
  fi

done
```

## Cross-Region Resource Tagging Audit

Check if resources across all regions follow your tagging standards:

```bash
#!/bin/bash
# global-tag-audit.sh
# Check tagging compliance across all regions

REQUIRED_TAGS=("Environment" "Team" "CostCenter")

echo "=== Global Tagging Audit ==="

for REGION in $(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text); do

  TOTAL=0
  COMPLIANT=0

  INSTANCES=$(aws ec2 describe-instances \
    --region $REGION \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].{Id:InstanceId,Tags:Tags}' \
    --output json 2>/dev/null)

  # Skip regions with no instances
  if [ "$INSTANCES" == "[[]]" ] || [ "$INSTANCES" == "[]" ]; then
    continue
  fi

  # Check each instance for required tags
  for INSTANCE in $(echo "$INSTANCES" | jq -r '.[][] | @base64'); do
    TOTAL=$((TOTAL + 1))

    INSTANCE_JSON=$(echo $INSTANCE | base64 -d)
    TAG_KEYS=$(echo "$INSTANCE_JSON" | jq -r '.Tags[]?.Key' 2>/dev/null)

    MISSING=false
    for TAG in "${REQUIRED_TAGS[@]}"; do
      if ! echo "$TAG_KEYS" | grep -q "^${TAG}$"; then
        MISSING=true
        INST_ID=$(echo "$INSTANCE_JSON" | jq -r '.Id')
        echo "[$REGION] $INST_ID missing tag: $TAG"
      fi
    done

    if [ "$MISSING" == "false" ]; then
      COMPLIANT=$((COMPLIANT + 1))
    fi
  done

  if [ $TOTAL -gt 0 ]; then
    PCT=$((COMPLIANT * 100 / TOTAL))
    echo "[$REGION] Compliance: $COMPLIANT/$TOTAL ($PCT%)"
  fi

done
```

## Using AWS Config for Global View

For a more robust solution, AWS Config Aggregator provides a managed global view:

```bash
# Create a Config Aggregator that collects from all regions
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name "global-ec2-view" \
  --account-aggregation-sources '[
    {
      "AccountIds": ["123456789"],
      "AllAwsRegions": true
    }
  ]'

# Query all EC2 instances across regions using Config
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name "global-ec2-view" \
  --expression "SELECT
    resourceId,
    resourceType,
    awsRegion,
    configuration.instanceType,
    configuration.state.name
    WHERE
      resourceType = 'AWS::EC2::Instance'
      AND configuration.state.name = 'running'" \
  --output json
```

## Automating Global Cleanup

Schedule a Lambda function or cron job that runs the orphaned resource scan weekly:

```python
# lambda_global_cleanup.py
# Runs weekly to identify and optionally clean up orphaned resources
import boto3
import json

def lambda_handler(event, context):
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]

    findings = []

    for region in regions:
        ec2 = boto3.client('ec2', region_name=region)

        # Find unattached volumes
        volumes = ec2.describe_volumes(
            Filters=[{'Name': 'status', 'Values': ['available']}]
        )['Volumes']

        for vol in volumes:
            findings.append({
                'region': region,
                'type': 'unattached_volume',
                'resource_id': vol['VolumeId'],
                'size_gb': vol['Size'],
                'created': vol['CreateTime'].isoformat()
            })

        # Find unused Elastic IPs
        addresses = ec2.describe_addresses()['Addresses']
        for addr in addresses:
            if 'AssociationId' not in addr:
                findings.append({
                    'region': region,
                    'type': 'unused_eip',
                    'resource_id': addr['AllocationId'],
                    'public_ip': addr['PublicIp']
                })

    print(f"Found {len(findings)} orphaned resources")
    return findings
```

## Best Practices

1. **Run global audits weekly**: Don't let orphaned resources pile up. Each unused Elastic IP costs $3.65/month, and forgotten volumes add up quickly.

2. **Use consistent tagging**: Tags are your lifeline for global resource management. Follow a [comprehensive tagging strategy](https://oneuptime.com/blog/post/tag-ec2-resources-for-cost-allocation-and-organization/view) across all regions.

3. **Limit active regions**: Only enable the regions you actually use. Fewer regions means less surface area for orphaned resources and security risks.

4. **Centralize monitoring**: Use CloudWatch cross-account dashboards or a tool like [OneUptime](https://oneuptime.com/blog/post/monitor-ec2-instances-with-cloudwatch-detailed-monitoring/view) to monitor instances across all regions from one place.

EC2 Global View, whether through the console or scripts, is essential for any organization running instances in multiple regions. The alternative - manually checking each region one by one - simply doesn't scale.
