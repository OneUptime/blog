# How to Script Common AWS Tasks with the CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, Scripting, Automation, Bash

Description: Practical scripts for automating common AWS tasks using the CLI, including instance management, S3 operations, log retrieval, and cost checks.

---

The AWS Console is great for exploring, but if you're doing the same tasks more than twice, you should be scripting them. The AWS CLI is incredibly powerful for automation, and a handful of well-written scripts can save you hours every week.

This post is a collection of practical scripts for tasks that most AWS users perform regularly. These aren't theoretical examples - they're scripts I've actually used in production environments, tweaked and refined over time.

## Setting Up for Scripting

Before diving in, make sure you've got the basics covered. You should have [named profiles configured](https://oneuptime.com/blog/post/2026-02-12-aws-cli-named-profiles/view) and the CLI installed.

A good practice is to set a default profile and region at the top of your scripts.

```bash
#!/bin/bash
# Common header for AWS scripts
set -euo pipefail

# Configuration
PROFILE="${AWS_PROFILE:-default}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# Helper function for consistent AWS calls
aws_cmd() {
    aws --profile "$PROFILE" --region "$REGION" "$@"
}
```

## Script 1: Find and Clean Up Unused Resources

This script finds resources that are costing you money but aren't being used.

```bash
#!/bin/bash
# find-unused-resources.sh
# Finds unused EBS volumes, Elastic IPs, and old snapshots

set -euo pipefail
PROFILE="${1:-default}"

echo "=== Unused EBS Volumes (available, not attached) ==="
aws ec2 describe-volumes \
  --profile "$PROFILE" \
  --filters "Name=status,Values=available" \
  --query "Volumes[].{ID:VolumeId, Size:Size, Created:CreateTime, Type:VolumeType}" \
  --output table

echo ""
echo "=== Unassociated Elastic IPs (costing \$3.65/month each) ==="
aws ec2 describe-addresses \
  --profile "$PROFILE" \
  --query "Addresses[?AssociationId==null].{IP:PublicIp, AllocationId:AllocationId}" \
  --output table

echo ""
echo "=== EBS Snapshots older than 90 days ==="
CUTOFF=$(date -u -v-90d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d '90 days ago' +%Y-%m-%dT%H:%M:%S)
aws ec2 describe-snapshots \
  --profile "$PROFILE" \
  --owner-ids self \
  --query "Snapshots[?StartTime<='${CUTOFF}'].{ID:SnapshotId, Size:VolumeSize, Date:StartTime, Description:Description}" \
  --output table

echo ""
echo "=== Unattached Network Interfaces ==="
aws ec2 describe-network-interfaces \
  --profile "$PROFILE" \
  --filters "Name=status,Values=available" \
  --query "NetworkInterfaces[].{ID:NetworkInterfaceId, Description:Description, AZ:AvailabilityZone}" \
  --output table
```

## Script 2: Instance Lifecycle Management

Start, stop, and manage instances by tag. Way easier than clicking through the console.

```bash
#!/bin/bash
# instance-manager.sh
# Manage EC2 instances by tag

set -euo pipefail
ACTION="${1:-list}"
TAG_KEY="${2:-Environment}"
TAG_VALUE="${3:-dev}"
PROFILE="${4:-default}"

get_instances() {
    aws ec2 describe-instances \
      --profile "$PROFILE" \
      --filters "Name=tag:${TAG_KEY},Values=${TAG_VALUE}" \
      --query "Reservations[].Instances[].{ID:InstanceId, State:State.Name, Type:InstanceType, Name:Tags[?Key=='Name']|[0].Value, IP:PrivateIpAddress}" \
      --output table
}

case "$ACTION" in
    list)
        echo "Instances with ${TAG_KEY}=${TAG_VALUE}:"
        get_instances
        ;;

    start)
        echo "Starting instances with ${TAG_KEY}=${TAG_VALUE}..."
        INSTANCE_IDS=$(aws ec2 describe-instances \
          --profile "$PROFILE" \
          --filters "Name=tag:${TAG_KEY},Values=${TAG_VALUE}" "Name=instance-state-name,Values=stopped" \
          --query "Reservations[].Instances[].InstanceId" \
          --output text)

        if [ -n "$INSTANCE_IDS" ]; then
            aws ec2 start-instances --profile "$PROFILE" --instance-ids $INSTANCE_IDS
            echo "Started: $INSTANCE_IDS"
        else
            echo "No stopped instances found"
        fi
        ;;

    stop)
        echo "Stopping instances with ${TAG_KEY}=${TAG_VALUE}..."
        INSTANCE_IDS=$(aws ec2 describe-instances \
          --profile "$PROFILE" \
          --filters "Name=tag:${TAG_KEY},Values=${TAG_VALUE}" "Name=instance-state-name,Values=running" \
          --query "Reservations[].Instances[].InstanceId" \
          --output text)

        if [ -n "$INSTANCE_IDS" ]; then
            aws ec2 stop-instances --profile "$PROFILE" --instance-ids $INSTANCE_IDS
            echo "Stopped: $INSTANCE_IDS"
        else
            echo "No running instances found"
        fi
        ;;

    *)
        echo "Usage: $0 {list|start|stop} [tag-key] [tag-value] [profile]"
        echo "Example: $0 stop Environment dev staging"
        ;;
esac
```

## Script 3: S3 Bucket Size and Cost Reporter

Know how much each bucket is actually costing you.

```bash
#!/bin/bash
# s3-size-report.sh
# Report sizes and estimated costs for all S3 buckets

set -euo pipefail
PROFILE="${1:-default}"

echo "Fetching S3 bucket sizes (this may take a minute)..."
echo ""
printf "%-40s %15s %15s\n" "Bucket" "Size (GB)" "Est. Monthly Cost"
printf "%-40s %15s %15s\n" "------" "---------" "-----------------"

TOTAL_SIZE=0

for BUCKET in $(aws s3api list-buckets --profile "$PROFILE" --query "Buckets[].Name" --output text); do
    # Get bucket size from CloudWatch (StandardStorage)
    SIZE_BYTES=$(aws cloudwatch get-metric-statistics \
      --profile "$PROFILE" \
      --namespace "AWS/S3" \
      --metric-name "BucketSizeBytes" \
      --dimensions "Name=BucketName,Value=${BUCKET}" "Name=StorageType,Value=StandardStorage" \
      --start-time "$(date -u -v-2d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d '2 days ago' +%Y-%m-%dT%H:%M:%S)" \
      --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
      --period 86400 \
      --statistics "Average" \
      --query "Datapoints[0].Average" \
      --output text 2>/dev/null)

    if [ "$SIZE_BYTES" != "None" ] && [ -n "$SIZE_BYTES" ]; then
        SIZE_GB=$(echo "scale=2; $SIZE_BYTES / 1073741824" | bc)
        # S3 Standard: ~$0.023/GB/month
        COST=$(echo "scale=2; $SIZE_GB * 0.023" | bc)
        TOTAL_SIZE=$(echo "$TOTAL_SIZE + $SIZE_GB" | bc)
        printf "%-40s %12s GB %12s USD\n" "$BUCKET" "$SIZE_GB" "$COST"
    fi
done

echo ""
TOTAL_COST=$(echo "scale=2; $TOTAL_SIZE * 0.023" | bc)
printf "%-40s %12s GB %12s USD\n" "TOTAL" "$TOTAL_SIZE" "$TOTAL_COST"
```

## Script 4: Quick Log Retrieval

Pull recent CloudWatch logs without the console.

```bash
#!/bin/bash
# get-logs.sh
# Fetch recent logs from a CloudWatch log group

set -euo pipefail
LOG_GROUP="${1:?Usage: $0 <log-group-name> [minutes-ago] [profile]}"
MINUTES_AGO="${2:-30}"
PROFILE="${3:-default}"

# Calculate start time in milliseconds
START_TIME=$(( $(date +%s) * 1000 - MINUTES_AGO * 60 * 1000 ))

echo "Fetching logs from ${LOG_GROUP} (last ${MINUTES_AGO} minutes)..."
echo ""

aws logs filter-log-events \
  --profile "$PROFILE" \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_TIME" \
  --query "events[].{Time:timestamp, Message:message}" \
  --output text | while IFS=$'\t' read -r timestamp message; do
    # Convert millisecond timestamp to readable format
    if [ -n "$timestamp" ]; then
        readable_time=$(date -r $((timestamp / 1000)) "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -d @$((timestamp / 1000)) "+%Y-%m-%d %H:%M:%S")
        echo "[$readable_time] $message"
    fi
done
```

## Script 5: Security Group Auditor

Find overly permissive security groups.

```bash
#!/bin/bash
# audit-security-groups.sh
# Find security groups with risky rules

set -euo pipefail
PROFILE="${1:-default}"

echo "=== Security Groups Open to 0.0.0.0/0 ==="
echo ""

aws ec2 describe-security-groups \
  --profile "$PROFILE" \
  --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']]].{
    GroupId:GroupId,
    GroupName:GroupName,
    VpcId:VpcId,
    OpenPorts:IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']].{From:FromPort,To:ToPort,Protocol:IpProtocol}
  }" \
  --output json | python3 -c "
import json, sys

data = json.load(sys.stdin)
for sg in data:
    print(f\"SG: {sg['GroupId']} ({sg['GroupName']}) in {sg['VpcId']}\")
    for port_rule in sg.get('OpenPorts', []):
        for rule in port_rule if isinstance(port_rule, list) else [port_rule]:
            proto = rule.get('Protocol', 'all')
            from_port = rule.get('From', 'all')
            to_port = rule.get('To', 'all')
            if proto == '-1':
                print(f'  WARNING: All traffic is open to the internet!')
            elif from_port == 22:
                print(f'  WARNING: SSH (port 22) is open to the internet')
            elif from_port == 3389:
                print(f'  WARNING: RDP (port 3389) is open to the internet')
            else:
                print(f'  Port {from_port}-{to_port} ({proto}) is open')
    print()
"
```

## Script 6: Quick Cost Summary

Get a quick view of your current month's spending.

```bash
#!/bin/bash
# cost-summary.sh
# Quick cost summary for the current month

set -euo pipefail
PROFILE="${1:-default}"

# Get current month dates
YEAR=$(date +%Y)
MONTH=$(date +%m)
START="${YEAR}-${MONTH}-01"
END=$(date +%Y-%m-%d)

echo "Cost summary: ${START} to ${END}"
echo ""

# Get costs by service
aws ce get-cost-and-usage \
  --profile "$PROFILE" \
  --time-period "Start=${START},End=${END}" \
  --granularity "MONTHLY" \
  --metrics "UnblendedCost" \
  --group-by "Type=DIMENSION,Key=SERVICE" \
  --query "ResultsByTime[0].Groups[?Metrics.UnblendedCost.Amount > '1.0'] | sort_by(@, &to_number(Metrics.UnblendedCost.Amount)) | reverse(@) | [].{Service: Keys[0], Cost: Metrics.UnblendedCost.Amount}" \
  --output table

echo ""

# Get total
TOTAL=$(aws ce get-cost-and-usage \
  --profile "$PROFILE" \
  --time-period "Start=${START},End=${END}" \
  --granularity "MONTHLY" \
  --metrics "UnblendedCost" \
  --query "ResultsByTime[0].Total.UnblendedCost.Amount" \
  --output text)

echo "Total month-to-date: \$${TOTAL}"
```

## Script 7: Deploy and Monitor CloudFormation

Deploy a stack and wait for it to finish, with status updates.

```bash
#!/bin/bash
# deploy-stack.sh
# Deploy a CloudFormation stack with progress monitoring

set -euo pipefail
STACK_NAME="${1:?Usage: $0 <stack-name> <template-file> [profile]}"
TEMPLATE="${2:?Usage: $0 <stack-name> <template-file> [profile]}"
PROFILE="${3:-default}"

echo "Deploying stack: ${STACK_NAME}"
echo "Template: ${TEMPLATE}"
echo ""

# Deploy
aws cloudformation deploy \
  --profile "$PROFILE" \
  --template-file "$TEMPLATE" \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset &

DEPLOY_PID=$!

# Monitor progress while deployment runs
while kill -0 $DEPLOY_PID 2>/dev/null; do
    STATUS=$(aws cloudformation describe-stacks \
      --profile "$PROFILE" \
      --stack-name "$STACK_NAME" \
      --query "Stacks[0].StackStatus" \
      --output text 2>/dev/null || echo "STARTING")

    echo "[$(date +%H:%M:%S)] Status: ${STATUS}"
    sleep 10
done

# Check final status
wait $DEPLOY_PID
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "Deployment successful!"
    echo ""
    echo "Outputs:"
    aws cloudformation describe-stacks \
      --profile "$PROFILE" \
      --stack-name "$STACK_NAME" \
      --query "Stacks[0].Outputs[].{Key:OutputKey, Value:OutputValue}" \
      --output table
else
    echo ""
    echo "Deployment failed! Recent events:"
    aws cloudformation describe-stack-events \
      --profile "$PROFILE" \
      --stack-name "$STACK_NAME" \
      --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'][:5].{Resource:LogicalResourceId, Status:ResourceStatus, Reason:ResourceStatusReason}" \
      --output table
    exit 1
fi
```

## Organizing Your Scripts

Put your AWS scripts in a dedicated directory and add it to your PATH.

```bash
# Create a scripts directory
mkdir -p ~/bin/aws-scripts

# Add to PATH in your .bashrc/.zshrc
export PATH="$HOME/bin/aws-scripts:$PATH"

# Make scripts executable
chmod +x ~/bin/aws-scripts/*.sh
```

## Monitoring

When your automation scripts are managing production infrastructure, you'll want to monitor their execution and the resources they manage. [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) can provide alerting when scripts fail or when the resources they manage go into an unhealthy state.

## Wrapping Up

These scripts are starting points. Adapt them to your environment, add error handling for your edge cases, and build a library of scripts that handle your specific workflow. The best automation is the kind that saves you from repetitive console clicking and reduces the chance of human error. Start with the tasks you do most often, script them, and iterate from there.
