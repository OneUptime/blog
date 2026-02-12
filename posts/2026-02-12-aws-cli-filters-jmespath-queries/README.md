# How to Use AWS CLI Filters and JMESPath Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, JMESPath, Filtering, Queries

Description: Master AWS CLI server-side filters and client-side JMESPath queries to extract exactly the data you need from AWS API responses.

---

AWS CLI commands often return walls of JSON. You ask for EC2 instances and get back every attribute of every instance - launch time, block device mappings, network interfaces, tags, state history, the works. Most of the time, you need maybe three fields. That's where filters and queries come in.

The CLI gives you two complementary tools for narrowing down results: server-side **filters** (the `--filters` parameter) and client-side **queries** (the `--query` parameter using JMESPath). Understanding when to use each, and how to combine them, makes the CLI dramatically more useful.

## Filters vs. Queries

**Filters** (`--filters`) are processed by the AWS API before results are returned. They reduce the amount of data transferred and are faster for large result sets. But not all API calls support filters, and the available filter options vary by service.

**Queries** (`--query`) use JMESPath expressions to transform the JSON response on the client side. They work with every CLI command and can do complex transformations, but they process data after it's been downloaded.

Use both together: filter on the server to get a smaller dataset, then query on the client to extract the exact fields you need.

## Server-Side Filters

### Basic Filter Syntax

Filters use a name-value syntax. The name is the API attribute, the values are what you're filtering for.

```bash
# Find running instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running"

# Find instances with a specific tag
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=production"

# Multiple filter values (OR within a filter)
aws ec2 describe-instances \
  --filters "Name=instance-type,Values=t3.micro,t3.small,t3.medium"

# Multiple filters (AND between filters)
aws ec2 describe-instances \
  --filters \
    "Name=instance-state-name,Values=running" \
    "Name=tag:Environment,Values=production" \
    "Name=instance-type,Values=m5.xlarge,m5.2xlarge"
```

Important: Multiple values within a single filter are OR conditions. Multiple separate filters are AND conditions.

### Common Filter Patterns

```bash
# EC2 instances by VPC
aws ec2 describe-instances \
  --filters "Name=vpc-id,Values=vpc-abc123"

# Security groups allowing specific port
aws ec2 describe-security-groups \
  --filters "Name=ip-permission.from-port,Values=443"

# EBS volumes of a specific type and size
aws ec2 describe-volumes \
  --filters "Name=volume-type,Values=gp3" "Name=size,Values=100"

# RDS instances by engine
aws rds describe-db-instances \
  --filters "Name=engine,Values=postgres"

# S3 buckets don't support server-side filters
# Use --query instead for S3
```

## JMESPath Queries - The Basics

JMESPath is a query language for JSON. The `--query` parameter accepts JMESPath expressions. Let's start with the basics and build up.

### Selecting Fields

```bash
# Get just instance ID and state
aws ec2 describe-instances \
  --query "Reservations[].Instances[].{ID:InstanceId, State:State.Name}" \
  --output table

# Get S3 bucket names only
aws s3api list-buckets \
  --query "Buckets[].Name"

# Get specific nested fields
aws ec2 describe-instances \
  --query "Reservations[].Instances[].{
    ID: InstanceId,
    Type: InstanceType,
    AZ: Placement.AvailabilityZone,
    PrivateIP: PrivateIpAddress,
    PublicIP: PublicIpAddress
  }" \
  --output table
```

### Filtering with JMESPath

Use the `?` operator to filter arrays.

```bash
# Running instances only (client-side filter)
aws ec2 describe-instances \
  --query "Reservations[].Instances[?State.Name=='running'].InstanceId[]"

# Instances launched in the last 24 hours
aws ec2 describe-instances \
  --query "Reservations[].Instances[?LaunchTime>='2026-02-11'].{ID:InstanceId, Launched:LaunchTime}"

# Security groups with a specific name pattern
aws ec2 describe-security-groups \
  --query "SecurityGroups[?contains(GroupName, 'web')].{ID:GroupId, Name:GroupName}"
```

### Comparison Operators

JMESPath supports: `==`, `!=`, `<`, `<=`, `>`, `>=`

```bash
# Volumes larger than 100 GB
aws ec2 describe-volumes \
  --query "Volumes[?Size > \`100\`].{ID:VolumeId, Size:Size, Type:VolumeType}" \
  --output table

# RDS instances that are not in available state
aws rds describe-db-instances \
  --query "DBInstances[?DBInstanceStatus != 'available'].{ID:DBInstanceIdentifier, Status:DBInstanceStatus}"

# Note: numeric comparisons need backtick-quoted literals
# String comparisons use single quotes
```

### Logical Operators

Combine conditions with `&&` (and) and `||` (or).

```bash
# Running instances in a specific VPC
aws ec2 describe-instances \
  --query "Reservations[].Instances[?State.Name=='running' && VpcId=='vpc-abc123'].InstanceId[]"

# Volumes that are available OR in-use but not encrypted
aws ec2 describe-volumes \
  --query "Volumes[?Encrypted==\`false\` && (State=='available' || State=='in-use')].{ID:VolumeId, State:State, Size:Size}"
```

### Working with Tags

Tags are stored as an array of key-value objects, which makes them a bit tricky to query.

```bash
# Find instances by tag value
aws ec2 describe-instances \
  --query "Reservations[].Instances[?Tags[?Key=='Name' && Value=='web-server']].InstanceId[]"

# Extract the Name tag value
aws ec2 describe-instances \
  --query "Reservations[].Instances[].{
    ID: InstanceId,
    Name: Tags[?Key=='Name'] | [0].Value,
    Env: Tags[?Key=='Environment'] | [0].Value
  }" \
  --output table
```

The pattern `Tags[?Key=='Name'] | [0].Value` first filters the tags array for the key, takes the first result, and gets the value. The pipe `|` chains operations.

## Advanced JMESPath

### Sorting

```bash
# Sort instances by launch time (ascending)
aws ec2 describe-instances \
  --query "sort_by(Reservations[].Instances[], &LaunchTime)[].{ID:InstanceId, Launched:LaunchTime}" \
  --output table

# Sort buckets by name
aws s3api list-buckets \
  --query "sort_by(Buckets, &Name)[].{Name:Name, Created:CreationDate}" \
  --output table
```

### Counting and Aggregation

```bash
# Count running instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "length(Reservations[].Instances[])"

# Count instances by type (requires some creativity)
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].InstanceType" \
  --output text | sort | uniq -c | sort -rn
```

### Flattening Nested Arrays

The `[]` operator flattens nested arrays. This is essential for EC2 results where instances are nested inside reservations.

```bash
# Without flattening - nested arrays
aws ec2 describe-instances \
  --query "Reservations[].Instances[].InstanceId"
# Output: [["i-123"], ["i-456", "i-789"]]

# With flattening - flat array
aws ec2 describe-instances \
  --query "Reservations[].Instances[].InstanceId[]"
# Output: ["i-123", "i-456", "i-789"]
```

### Using pipe expressions

```bash
# Get the first 5 largest EBS volumes
aws ec2 describe-volumes \
  --query "sort_by(Volumes, &Size) | reverse(@) | [:5].{ID:VolumeId, SizeGB:Size, Type:VolumeType}" \
  --output table

# Get total EBS storage
aws ec2 describe-volumes \
  --query "sum(Volumes[].Size)"
```

## Combining Filters and Queries

The most effective approach combines both.

```bash
# Server-side: get running prod instances
# Client-side: extract specific fields and sort
aws ec2 describe-instances \
  --filters \
    "Name=instance-state-name,Values=running" \
    "Name=tag:Environment,Values=production" \
  --query "sort_by(Reservations[].Instances[], &LaunchTime) | reverse(@)[].{
    Name: Tags[?Key=='Name'] | [0].Value,
    ID: InstanceId,
    Type: InstanceType,
    IP: PrivateIpAddress,
    Launched: LaunchTime
  }" \
  --output table
```

## Output Formats

The `--output` flag works alongside queries.

```bash
# Table format - great for human reading
aws ec2 describe-instances --query "..." --output table

# JSON - good for piping to jq or other tools
aws ec2 describe-instances --query "..." --output json

# Text - tab-separated, good for shell scripting
aws ec2 describe-instances --query "..." --output text

# YAML - easier to read than JSON for some
aws ec2 describe-instances --query "..." --output yaml
```

For comprehensive monitoring of the resources you're querying, [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) provides dashboards that go beyond CLI queries.

## Wrapping Up

Once you internalize JMESPath syntax, the CLI becomes far more useful than the console for data retrieval. Filters narrow results on the server, queries shape the output on the client. Combine them and you can get exactly the information you need in a single command. Bookmark the [JMESPath specification](https://jmespath.org/) - you'll reference it often until the syntax becomes second nature. And check out the [--query parameter guide](https://oneuptime.com/blog/post/aws-cli-query-parameter-filtering/view) for more specific filtering techniques.
