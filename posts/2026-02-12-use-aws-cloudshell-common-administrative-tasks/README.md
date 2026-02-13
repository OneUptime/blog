# How to Use AWS CloudShell for Common Administrative Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudShell, CLI, Administration

Description: Practical examples of using AWS CloudShell for everyday administrative tasks like managing EC2, S3, IAM, Lambda, and CloudFormation resources.

---

Once you've got CloudShell up and running, the real question is: what can you actually do with it? Quite a lot, as it turns out. Let's walk through the most common administrative tasks you'll find yourself doing in CloudShell, complete with copy-paste ready commands.

## EC2 Instance Management

Starting and stopping instances is bread and butter for any AWS admin. Here are the most useful EC2 commands.

List all instances with key details in a nice table format.

```bash
# List all EC2 instances with name, ID, state, type, and private IP
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].{
    Name: Tags[?Key==`Name`].Value | [0],
    InstanceId: InstanceId,
    State: State.Name,
    Type: InstanceType,
    PrivateIP: PrivateIpAddress,
    LaunchTime: LaunchTime
  }' \
  --output table
```

Start, stop, or reboot instances by name instead of ID.

```bash
# Find an instance ID by its Name tag
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=my-web-server" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Stop the instance
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"

# Start the instance
aws ec2 start-instances --instance-ids "$INSTANCE_ID"

# Check its current state
aws ec2 describe-instance-status --instance-ids "$INSTANCE_ID" \
  --query 'InstanceStatuses[0].{State: InstanceState.Name, SystemStatus: SystemStatus.Status, InstanceStatus: InstanceStatus.Status}'
```

## S3 Bucket Operations

CloudShell is perfect for quick S3 operations since it has good bandwidth to AWS services.

```bash
# List all buckets with creation dates
aws s3api list-buckets \
  --query 'Buckets[].{Name: Name, Created: CreationDate}' \
  --output table

# Check the size of a bucket (this can take a while for large buckets)
aws s3 ls s3://my-bucket --recursive --summarize | tail -2

# Sync a local directory to S3
aws s3 sync ~/data/ s3://my-bucket/data/ --exclude "*.tmp"

# Find large files in a bucket
aws s3api list-objects-v2 \
  --bucket my-bucket \
  --query 'sort_by(Contents, &Size)[-10:].{Key: Key, SizeMB: Size}' \
  --output table
```

Copy files between buckets.

```bash
# Copy all objects from one bucket to another
aws s3 sync s3://source-bucket/ s3://destination-bucket/ \
  --source-region us-east-1 \
  --region us-west-2
```

## IAM User and Role Management

Managing IAM from CloudShell is efficient since there's no credential management overhead.

```bash
# List all IAM users with their last activity
aws iam generate-credential-report > /dev/null 2>&1
sleep 5
aws iam get-credential-report \
  --query 'Content' --output text | base64 -d | \
  awk -F',' '{print $1, $5, $11}' | column -t

# Find users with access keys older than 90 days
aws iam list-users --query 'Users[].UserName' --output text | \
  tr '\t' '\n' | while read user; do
    aws iam list-access-keys --user-name "$user" \
      --query "AccessKeyMetadata[?CreateDate<='$(date -u -d '90 days ago' +%Y-%m-%dT%H:%M:%SZ)'].{User: UserName, KeyId: AccessKeyId, Created: CreateDate, Status: Status}" \
      --output table 2>/dev/null
done
```

Check what policies are attached to a role.

```bash
# List all policies attached to a specific IAM role
ROLE_NAME="my-lambda-role"

echo "=== Managed Policies ==="
aws iam list-attached-role-policies \
  --role-name "$ROLE_NAME" \
  --query 'AttachedPolicies[].{Name: PolicyName, Arn: PolicyArn}' \
  --output table

echo "=== Inline Policies ==="
aws iam list-role-policies \
  --role-name "$ROLE_NAME" \
  --query 'PolicyNames'
```

## Lambda Function Management

Quick Lambda operations you'll do frequently.

```bash
# List all Lambda functions with runtime and memory
aws lambda list-functions \
  --query 'Functions[].{Name: FunctionName, Runtime: Runtime, Memory: MemorySize, Timeout: Timeout}' \
  --output table

# Invoke a Lambda function and see the result
aws lambda invoke \
  --function-name my-function \
  --payload '{"key": "value"}' \
  --cli-binary-format raw-in-base64-out \
  /dev/stdout

# Check recent invocation errors from CloudWatch
FUNCTION_NAME="my-function"
LOG_GROUP="/aws/lambda/$FUNCTION_NAME"

aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --limit 10 \
  --query 'events[].message' \
  --output text
```

Update a function's environment variables.

```bash
# Update environment variables for a Lambda function
aws lambda update-function-configuration \
  --function-name my-function \
  --environment "Variables={DB_HOST=new-host.example.com,DB_PORT=5432,ENV=production}"
```

## CloudFormation Stack Management

Check on your stacks and troubleshoot failures.

```bash
# List all stacks and their statuses
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE CREATE_IN_PROGRESS UPDATE_IN_PROGRESS ROLLBACK_COMPLETE \
  --query 'StackSummaries[].{Name: StackName, Status: StackStatus, Updated: LastUpdatedTime}' \
  --output table

# Get the events for a failing stack (useful for debugging)
aws cloudformation describe-stack-events \
  --stack-name my-stack \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].{Resource: LogicalResourceId, Status: ResourceStatus, Reason: ResourceStatusReason}' \
  --output table

# Get stack outputs (useful for cross-stack references)
aws cloudformation describe-stacks \
  --stack-name my-stack \
  --query 'Stacks[0].Outputs[].{Key: OutputKey, Value: OutputValue}' \
  --output table
```

## Security Group Auditing

Quickly audit security groups for overly permissive rules.

```bash
# Find security groups with 0.0.0.0/0 inbound rules (potential security risk)
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].{
    GroupId: GroupId,
    GroupName: GroupName,
    VpcId: VpcId
  }' \
  --output table

# Get detailed rules for a specific security group
aws ec2 describe-security-groups \
  --group-ids sg-abc123 \
  --query 'SecurityGroups[0].IpPermissions[].{
    Protocol: IpProtocol,
    FromPort: FromPort,
    ToPort: ToPort,
    Sources: IpRanges[].CidrIp
  }' \
  --output table
```

## Cost Exploration

Get quick cost insights right from the shell.

```bash
# Get this month's costs by service
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?Metrics.UnblendedCost.Amount > `1`] | sort_by(@, &Metrics.UnblendedCost.Amount) | reverse(@)[0:10].{Service: Keys[0], Cost: Metrics.UnblendedCost.Amount}' \
  --output table
```

## Creating Reusable Admin Scripts

Save frequently used operations as scripts in your CloudShell home directory.

```bash
# Create a comprehensive health check script
cat > ~/scripts/health-check.sh << 'SCRIPT'
#!/bin/bash
# Quick infrastructure health check

echo "=== EC2 Instance Summary ==="
for state in running stopped; do
  count=$(aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=$state" \
    --query 'length(Reservations[].Instances[])' \
    --output text)
  echo "  $state: $count"
done

echo ""
echo "=== Recent CloudFormation Events ==="
aws cloudformation list-stacks \
  --stack-status-filter CREATE_FAILED UPDATE_FAILED ROLLBACK_COMPLETE \
  --query 'StackSummaries[].{Stack: StackName, Status: StackStatus}' \
  --output table

echo ""
echo "=== Lambda Errors (Last Hour) ==="
aws cloudwatch get-metric-data \
  --metric-data-queries '[{"Id":"errors","MetricStat":{"Metric":{"Namespace":"AWS/Lambda","MetricName":"Errors"},"Period":3600,"Stat":"Sum"}}]' \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --query 'MetricDataResults[0].Values[0]' \
  --output text

echo ""
echo "=== Service Health ==="
aws health describe-events \
  --filter eventStatusCodes=open \
  --query 'events[].{Service: service, Description: eventTypeCode}' \
  --output table 2>/dev/null || echo "  No active health events"

SCRIPT
chmod +x ~/scripts/health-check.sh
```

Run it anytime with `~/scripts/health-check.sh`.

## Working with Tags

Tags are critical for organization and cost allocation. CloudShell makes bulk tagging easy.

```bash
# Find all resources missing a required tag
aws resourcegroupstaggingapi get-resources \
  --query 'ResourceTagMappingList[?!Tags[?Key==`Environment`]].ResourceARN' \
  --output text | tr '\t' '\n' | head -20

# Bulk tag EC2 instances
aws ec2 create-tags \
  --resources i-abc123 i-def456 i-ghi789 \
  --tags Key=Environment,Value=production Key=Team,Value=platform
```

## Troubleshooting Checklist

1. Use `aws sts get-caller-identity` to verify you have the right permissions
2. Check the region - CloudShell uses whatever region the console is set to
3. Save reusable scripts in `~/scripts/` so they persist
4. Use `--output table` for readable output, `--output json` for scripting
5. Pipe output to `jq` for complex JSON processing
6. Use `--query` to filter results before they hit your terminal

CloudShell turns the AWS Console into a power tool. With your scripts saved and aliases configured, you can do in seconds what would take minutes clicking through the console UI. For initial setup tips, see our guide on [setting up CloudShell](https://oneuptime.com/blog/post/2026-02-12-setup-aws-cloudshell-quick-command-line-access/view).
