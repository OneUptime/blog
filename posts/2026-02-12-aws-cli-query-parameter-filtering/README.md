# How to Use AWS CLI --query Parameter for Filtering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, JMESPath, Filtering, Query

Description: Deep dive into the AWS CLI --query parameter with practical examples for filtering, projecting, and transforming API output using JMESPath expressions.

---

The `--query` parameter is the single most useful feature of the AWS CLI that most people underuse. Instead of piping JSON through jq or writing Python scripts to extract the data you need, you can do it right in the CLI command. It uses JMESPath, a query language designed specifically for JSON, and once you learn the patterns, you'll use it in every command.

This post goes beyond the basics covered in our [JMESPath overview](https://oneuptime.com/blog/post/2026-02-12-aws-cli-filters-jmespath-queries/view) and focuses on practical recipes for common filtering tasks.

## The Fundamentals

The `--query` parameter takes a JMESPath expression and applies it to the JSON output. Here's the quick reference:

- `.` - Access an object property
- `[]` - Array index or flatten
- `[?condition]` - Filter an array
- `|` - Pipe expression (chain operations)
- `{ }` - Create a new object (projection)
- `@` - Current element reference

## Recipe 1: Find Resources by Tag

Tags are the most queried attribute in AWS, but they're stored as arrays, which makes them slightly awkward to filter.

```bash
# Find EC2 instances with a specific tag
aws ec2 describe-instances \
  --query "Reservations[].Instances[?Tags[?Key=='Environment' && Value=='production']].{
    Name: Tags[?Key=='Name'] | [0].Value,
    ID: InstanceId,
    Type: InstanceType,
    State: State.Name
  }[]" \
  --output table

# Find instances where a tag contains a substring
aws ec2 describe-instances \
  --query "Reservations[].Instances[?Tags[?Key=='Name' && contains(Value, 'web')]].{
    Name: Tags[?Key=='Name'] | [0].Value,
    ID: InstanceId
  }[]" \
  --output table

# Find instances missing a specific tag
aws ec2 describe-instances \
  --query "Reservations[].Instances[?!Tags[?Key=='CostCenter']].{
    ID: InstanceId,
    Name: Tags[?Key=='Name'] | [0].Value
  }[]" \
  --output table
```

## Recipe 2: Instance Inventory Report

Get a clean inventory of running instances with all the fields you typically need.

```bash
# Full instance inventory
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[] | sort_by(@, &LaunchTime) | reverse(@)[].{
    Name: Tags[?Key=='Name'] | [0].Value,
    ID: InstanceId,
    Type: InstanceType,
    AZ: Placement.AvailabilityZone,
    PrivateIP: PrivateIpAddress,
    PublicIP: PublicIpAddress || 'N/A',
    LaunchTime: LaunchTime,
    AMI: ImageId
  }" \
  --output table
```

The `||` operator provides a default value when a field is null. Super helpful for optional fields like public IPs.

## Recipe 3: Security Group Analysis

```bash
# Find security groups with any rule open to 0.0.0.0/0
aws ec2 describe-security-groups \
  --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']]].{
    ID: GroupId,
    Name: GroupName,
    VPC: VpcId
  }" \
  --output table

# Find security groups not used by any instance
# First get all SGs used by instances
USED_SGS=$(aws ec2 describe-instances \
  --query "Reservations[].Instances[].SecurityGroups[].GroupId" \
  --output text | tr '\t' '\n' | sort -u)

# Then list all SGs
aws ec2 describe-security-groups \
  --query "SecurityGroups[].{ID:GroupId, Name:GroupName}" \
  --output text

# Compare (this part needs shell processing)
```

## Recipe 4: Cost-Related Queries

```bash
# Get the most expensive services this month
aws ce get-cost-and-usage \
  --time-period "Start=2026-02-01,End=2026-02-12" \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by "Type=DIMENSION,Key=SERVICE" \
  --query "ResultsByTime[0].Groups[?to_number(Metrics.UnblendedCost.Amount) > \`0\`]
    | sort_by(@, &to_number(Metrics.UnblendedCost.Amount))
    | reverse(@)[:10].{
      Service: Keys[0],
      Cost: Metrics.UnblendedCost.Amount
    }" \
  --output table
```

## Recipe 5: RDS Instance Details

```bash
# Get RDS instances with storage and connection info
aws rds describe-db-instances \
  --query "DBInstances[].{
    ID: DBInstanceIdentifier,
    Engine: Engine,
    Version: EngineVersion,
    Class: DBInstanceClass,
    Storage: AllocatedStorage,
    MultiAZ: MultiAZ,
    Status: DBInstanceStatus,
    Endpoint: Endpoint.Address
  }" \
  --output table

# Find RDS instances not encrypted
aws rds describe-db-instances \
  --query "DBInstances[?StorageEncrypted==\`false\`].{
    ID: DBInstanceIdentifier,
    Engine: Engine,
    Encrypted: StorageEncrypted
  }" \
  --output table

# Find RDS instances without backups
aws rds describe-db-instances \
  --query "DBInstances[?BackupRetentionPeriod==\`0\`].{
    ID: DBInstanceIdentifier,
    BackupRetention: BackupRetentionPeriod
  }" \
  --output table
```

## Recipe 6: Lambda Function Analysis

```bash
# List Lambda functions sorted by code size
aws lambda list-functions \
  --query "sort_by(Functions, &CodeSize) | reverse(@)[].{
    Name: FunctionName,
    Runtime: Runtime,
    Memory: MemorySize,
    CodeSizeMB: to_number(CodeSize) && CodeSize,
    Timeout: Timeout,
    LastModified: LastModified
  }" \
  --output table

# Find Lambda functions using deprecated runtimes
aws lambda list-functions \
  --query "Functions[?Runtime=='python3.8' || Runtime=='python3.7' || Runtime=='nodejs14.x' || Runtime=='nodejs16.x'].{
    Name: FunctionName,
    Runtime: Runtime
  }" \
  --output table
```

## Recipe 7: Extracting Single Values

When you need just one value for use in a script, `--output text` combined with `--query` is perfect.

```bash
# Get the VPC ID for a specific VPC name
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=production-vpc" \
  --query "Vpcs[0].VpcId" \
  --output text)
echo "VPC ID: $VPC_ID"

# Get the latest AMI for Amazon Linux 2023
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" \
  --query "sort_by(Images, &CreationDate) | [-1].ImageId" \
  --output text)
echo "Latest AMI: $AMI_ID"

# Get the ARN of a specific IAM role
ROLE_ARN=$(aws iam get-role \
  --role-name MyRole \
  --query "Role.Arn" \
  --output text)
echo "Role ARN: $ROLE_ARN"
```

## Recipe 8: Multi-Field String Formatting

JMESPath doesn't have string concatenation, but you can use `join` for some formatting.

```bash
# Create a formatted output
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].join('-', [InstanceId, InstanceType, State.Name])" \
  --output text
```

## Recipe 9: Nested Object Navigation

Some AWS APIs return deeply nested structures. Here's how to navigate them.

```bash
# ECS task definitions - dig into container definitions
aws ecs describe-task-definition \
  --task-definition my-task:1 \
  --query "taskDefinition.containerDefinitions[].{
    Name: name,
    Image: image,
    CPU: cpu,
    Memory: memory,
    Ports: portMappings[].containerPort | join(', ', @[].to_string(@))
  }" \
  --output table

# CloudFormation stack outputs
aws cloudformation describe-stacks \
  --stack-name my-stack \
  --query "Stacks[0].Outputs[].{Key: OutputKey, Value: OutputValue}" \
  --output table

# ELB target health
aws elbv2 describe-target-health \
  --target-group-arn "arn:aws:elasticloadbalancing:..." \
  --query "TargetHealthDescriptions[].{
    Target: Target.Id,
    Port: Target.Port,
    Health: TargetHealth.State,
    Reason: TargetHealth.Reason || 'N/A'
  }" \
  --output table
```

## Recipe 10: Working with Dates

JMESPath doesn't have native date functions, but string comparison works for ISO 8601 dates.

```bash
# Find resources created after a specific date
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime>='2026-01-01'].{
    ID: SnapshotId,
    Date: StartTime,
    Size: VolumeSize
  }" \
  --output table

# Find CloudWatch alarms in ALARM state
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query "MetricAlarms[].{
    Name: AlarmName,
    Metric: MetricName,
    State: StateValue,
    Since: StateUpdatedTimestamp
  }" \
  --output table
```

## Recipe 11: Counting and Summarizing

```bash
# Count resources by type
echo "Running instances: $(aws ec2 describe-instances \
  --filters 'Name=instance-state-name,Values=running' \
  --query 'length(Reservations[].Instances[])' \
  --output text)"

echo "S3 buckets: $(aws s3api list-buckets \
  --query 'length(Buckets)' \
  --output text)"

echo "Lambda functions: $(aws lambda list-functions \
  --query 'length(Functions)' \
  --output text)"

echo "RDS instances: $(aws rds describe-db-instances \
  --query 'length(DBInstances)' \
  --output text)"
```

## Debugging JMESPath Expressions

When your query isn't working, debug it step by step.

```bash
# Step 1: See the raw output structure
aws ec2 describe-instances --output json | head -50

# Step 2: Get the top-level keys
aws ec2 describe-instances --query "keys(@)"

# Step 3: Drill into the structure one level at a time
aws ec2 describe-instances --query "Reservations[0]" | head -30
aws ec2 describe-instances --query "Reservations[0].Instances[0]" | head -30

# Step 4: Test your filter expression
aws ec2 describe-instances --query "Reservations[].Instances[?State.Name=='running']" | head -30

# Step 5: Add your projection
aws ec2 describe-instances --query "Reservations[].Instances[?State.Name=='running'].InstanceId[]"
```

For monitoring the resources you're querying and getting alerted on changes, [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) provides real-time visibility beyond what CLI queries can offer.

## Wrapping Up

The `--query` parameter turns the AWS CLI from a data dumper into a precision tool. The recipes in this post cover the most common patterns you'll encounter. Start by copying these examples and modifying them for your specific needs. After a while, you'll be writing JMESPath expressions from memory, and your colleagues will wonder how you pull data so quickly. For more on combining queries with server-side filters, check out our [filters and JMESPath guide](https://oneuptime.com/blog/post/2026-02-12-aws-cli-filters-jmespath-queries/view).
