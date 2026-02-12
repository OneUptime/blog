# How to Fix 'InvalidParameterValue' Errors in AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Troubleshooting, API, Cloud

Description: Diagnose and fix InvalidParameterValue errors across AWS services by understanding parameter validation, common mistakes, and service-specific requirements.

---

The InvalidParameterValue error is AWS's way of saying "I understood your request, but one of the values you sent doesn't make sense." It's a validation error, and it shows up across almost every AWS service. The tricky part is that the error message sometimes doesn't clearly tell you which parameter is wrong or why.

Let's look at the most common causes and fixes.

## Understanding the Error

The error typically looks like this:

```
An error occurred (InvalidParameterValue) when calling the RunInstances operation:
Value (ami-abc123) for parameter imageId is invalid.
```

Or sometimes more vaguely:

```
An error occurred (InvalidParameterValue) when calling the CreateFunction operation:
Invalid request provided: Provided member is not valid.
```

The first version is helpful - it tells you exactly which parameter and value are wrong. The second version is frustrating, and you'll have to do some detective work.

## Common Causes Across Services

### Wrong Region

This is the number one cause. You're referencing a resource that exists in a different region than where you're making the API call.

```bash
# You're trying to launch an instance with an AMI from a different region
aws ec2 run-instances \
  --image-id ami-abc123 \
  --instance-type t3.micro \
  --region us-west-2

# The AMI might only exist in us-east-1
# Fix: Use the correct region or copy the AMI
aws ec2 copy-image \
  --source-image-id ami-abc123 \
  --source-region us-east-1 \
  --region us-west-2 \
  --name "My copied AMI"
```

### Invalid ARN Format

ARNs have a specific format, and getting it wrong triggers this error.

```bash
# Wrong - missing account ID
arn:aws:s3:::my-bucket

# Wrong - wrong service name
arn:aws:ec:us-east-1:123456789:instance/i-abc123

# Correct
arn:aws:ec2:us-east-1:123456789:instance/i-abc123
```

### Unsupported Values

Some parameters only accept specific values. Using anything else gives you InvalidParameterValue.

```bash
# EC2 instance types must be valid
aws ec2 run-instances --instance-type t3.superlarge  # doesn't exist

# Security group IDs must start with sg-
aws ec2 run-instances --security-group-ids my-security-group  # use the ID, not the name

# Availability zones must be valid for the region
aws ec2 run-instances --placement AvailabilityZone=us-east-1z  # doesn't exist
```

## Service-Specific Fixes

### EC2

```bash
# Problem: Invalid AMI ID
# The AMI doesn't exist, was deregistered, or is in another region
aws ec2 describe-images --image-ids ami-abc123  # Check if it exists

# Problem: Invalid instance type for the AMI
# Some instance types aren't available in all regions/AZs
aws ec2 describe-instance-type-offerings \
  --location-type availability-zone \
  --filters Name=instance-type,Values=t3.micro \
  --region us-east-1

# Problem: Invalid key pair name
aws ec2 describe-key-pairs  # List available key pairs
```

### Lambda

```bash
# Problem: Invalid runtime
# Check available runtimes
aws lambda list-layers --compatible-runtime python3.12

# Problem: Invalid handler format
# Handler format depends on runtime:
# Python: filename.function_name (e.g., index.lambda_handler)
# Node.js: filename.function_name (e.g., index.handler)
# Java: package.Class::method

# Problem: Invalid memory size
# Must be between 128 MB and 10,240 MB, in 1 MB increments
aws lambda update-function-configuration \
  --function-name my-func \
  --memory-size 256  # Valid

# Problem: Code package too large
# Direct upload limit: 50 MB (zipped)
# S3 upload limit: 250 MB (unzipped)
```

### S3

```bash
# Problem: Invalid bucket name
# Bucket names must:
# - Be 3-63 characters
# - Only contain lowercase letters, numbers, hyphens, and periods
# - Start with a letter or number
# - Not be formatted as an IP address
aws s3 mb s3://My-Bucket  # Invalid - uppercase not allowed
aws s3 mb s3://my-bucket  # Valid

# Problem: Invalid storage class
aws s3 cp file.txt s3://bucket/ --storage-class GLACIER_INSTANT  # Check exact name
# Valid values: STANDARD, REDUCED_REDUNDANCY, STANDARD_IA, ONEZONE_IA,
# INTELLIGENT_TIERING, GLACIER, DEEP_ARCHIVE, GLACIER_IR
```

### RDS

```bash
# Problem: Invalid DB instance class
aws rds describe-orderable-db-instance-options \
  --engine mysql \
  --query "OrderableDBInstanceOptions[].DBInstanceClass" \
  --output text | tr '\t' '\n' | sort -u

# Problem: Invalid engine version
aws rds describe-db-engine-versions \
  --engine mysql \
  --query "DBEngineVersions[].EngineVersion"

# Problem: Invalid parameter group family
aws rds describe-db-engine-versions \
  --engine mysql \
  --engine-version 8.0 \
  --query "DBEngineVersions[].DBParameterGroupFamily"
```

### CloudFormation

CloudFormation InvalidParameterValue errors are often about template parameters.

```bash
# Problem: Parameter value doesn't match AllowedValues
# Check the template for parameter constraints

# Problem: Parameter value doesn't match AllowedPattern
# Check regex patterns in the template

# Problem: Numeric parameter outside MinValue/MaxValue range
```

## Debugging Strategies

### Use the --debug Flag

```bash
# See the exact API request being sent
aws ec2 run-instances \
  --image-id ami-abc123 \
  --instance-type t3.micro \
  --debug 2>&1 | tail -30
```

This shows you the raw API request and response, which often has more detail than the formatted error message.

### Validate Parameters Before Calling

For complex operations, validate parameters first.

```python
import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')

# Validate the AMI exists
def validate_ami(ami_id):
    try:
        response = ec2.describe_images(ImageIds=[ami_id])
        if response['Images']:
            image = response['Images'][0]
            print(f"AMI found: {image['Name']}")
            print(f"State: {image['State']}")
            print(f"Architecture: {image['Architecture']}")
            return True
        return False
    except Exception as e:
        print(f"AMI validation failed: {e}")
        return False

# Validate the instance type is available in the AZ
def validate_instance_type(instance_type, az):
    response = ec2.describe_instance_type_offerings(
        LocationType='availability-zone',
        Filters=[
            {'Name': 'instance-type', 'Values': [instance_type]},
            {'Name': 'location', 'Values': [az]}
        ]
    )
    return len(response['InstanceTypeOfferings']) > 0

# Check before launching
if validate_ami('ami-abc123') and validate_instance_type('t3.micro', 'us-east-1a'):
    ec2.run_instances(
        ImageId='ami-abc123',
        InstanceType='t3.micro',
        MinCount=1,
        MaxCount=1
    )
```

### Check AWS Documentation

Each API action has specific parameter constraints documented. When the error message is vague, the docs will tell you:
- Allowed values for enum parameters
- Format requirements (regex patterns)
- Size limits
- Character restrictions

### Try the Console

If you can't figure out the issue from the CLI, try the same operation in the AWS Console. The console often has dropdown menus and validation that shows you exactly what values are accepted.

## Common Patterns to Watch For

1. **Case sensitivity** - Most parameter values are case-sensitive. `us-east-1` works, `US-East-1` doesn't.
2. **IDs vs. names** - Some parameters want an ID (`sg-abc123`), others want a name. Don't mix them up.
3. **Trailing whitespace** - Copy-pasting values can introduce invisible whitespace.
4. **Deleted resources** - An AMI, snapshot, or subnet that was recently deleted will give InvalidParameterValue, not a "not found" error.
5. **Cross-account references** - Referencing resources in another account without proper sharing setup.

## Summary

InvalidParameterValue errors come down to sending a value that AWS doesn't accept. The fix is usually straightforward once you identify which parameter is wrong - check the region, validate the resource exists, confirm the value is in the allowed set, and watch for case sensitivity. When the error message is unhelpful, use `--debug` to see the raw request and response, or try the operation in the AWS Console to get better validation feedback.
