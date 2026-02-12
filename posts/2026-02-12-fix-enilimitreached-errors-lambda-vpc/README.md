# How to Fix 'ENILimitReached' Errors in Lambda VPC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, VPC, Networking, Troubleshooting

Description: Resolve ENILimitReached errors when running AWS Lambda functions in a VPC by managing ENI limits, using Hyperplane ENIs, and optimizing subnet configurations.

---

When your VPC-connected Lambda functions start failing with `ENILimitReached`, it means your account has hit the limit on Elastic Network Interfaces in a region. This used to be a much bigger problem than it is today, but it still comes up, especially in accounts with heavy Lambda usage. Let's understand why it happens and what to do about it.

## Understanding Lambda and ENIs

When you configure a Lambda function to run inside a VPC, it needs network interfaces (ENIs) to communicate within the VPC. In the older model, each concurrent Lambda execution could require its own ENI. With the newer **Hyperplane ENIs** (introduced in 2019), Lambda shares ENIs more efficiently using a VPC-to-VPC NAT.

If you're still seeing `ENILimitReached`, here's what might be going on.

## Check Your Current ENI Usage

First, see how many ENIs you're using and what the limit is.

```bash
# Count the total ENIs in your account for the region
aws ec2 describe-network-interfaces \
  --query 'length(NetworkInterfaces)'

# See ENIs created by Lambda specifically
aws ec2 describe-network-interfaces \
  --filters "Name=description,Values='AWS Lambda VPC ENI*'" \
  --query 'length(NetworkInterfaces)'

# Check your current ENI limit
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DF5E4CA3 \
  --query 'Quota.Value'
```

The default limit is 5,000 per region for most accounts. If you're close to or at this limit, you have a few options.

## Solution 1: Request a Limit Increase

The quickest fix is to request a higher ENI limit.

```bash
# Request an ENI limit increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-DF5E4CA3 \
  --desired-value 10000
```

This gets approved automatically in most cases and takes effect within a few minutes.

## Solution 2: Clean Up Unused ENIs

Sometimes ENIs get orphaned - they were created by Lambda or other services but never cleaned up. These "available" ENIs are using your quota for nothing.

```bash
# Find ENIs in "available" state (not attached to anything)
aws ec2 describe-network-interfaces \
  --filters "Name=status,Values=available" \
  --query 'NetworkInterfaces[].{Id: NetworkInterfaceId, Description: Description, SubnetId: SubnetId}'
```

You can safely delete ENIs in "available" status.

```bash
# Delete an orphaned ENI
aws ec2 delete-network-interface \
  --network-interface-id eni-0abc123def456
```

To clean up all orphaned Lambda ENIs at once, use a script.

```bash
# Find and delete all orphaned Lambda ENIs
for eni in $(aws ec2 describe-network-interfaces \
  --filters "Name=status,Values=available" \
             "Name=description,Values=AWS Lambda VPC ENI*" \
  --query 'NetworkInterfaces[].NetworkInterfaceId' \
  --output text); do
  echo "Deleting $eni"
  aws ec2 delete-network-interface --network-interface-id "$eni"
done
```

## Solution 3: Verify You're Using Hyperplane ENIs

The newer Hyperplane ENI model dramatically reduces the number of ENIs Lambda needs. Instead of one per concurrent execution, Lambda creates a shared ENI per unique security group and subnet combination.

To check if your Lambda function is using the new model, look at the function's VPC configuration.

```bash
# Check the VPC configuration of your Lambda function
aws lambda get-function-configuration \
  --function-name my-function \
  --query '{SubnetIds: VpcConfig.SubnetIds, SecurityGroupIds: VpcConfig.SecurityGroupIds}'
```

Hyperplane ENIs are the default for all Lambda functions now. If you have very old functions that were created before 2019 and never updated, try updating the function's VPC configuration (even if you're setting it to the same values).

```bash
# Re-apply VPC config to ensure Hyperplane ENIs are used
aws lambda update-function-configuration \
  --function-name my-function \
  --vpc-config SubnetIds=subnet-abc123,subnet-def456,SecurityGroupIds=sg-abc123
```

## Solution 4: Optimize Subnet and Security Group Combinations

With Hyperplane ENIs, Lambda creates one ENI per unique combination of security group(s) and subnet. If you have 10 Lambda functions, each with a different security group, each in 3 subnets, that's 30 ENIs minimum.

Reduce this by standardizing security groups across functions that have similar networking needs.

```bash
# Check how many unique security group/subnet combos your Lambda functions use
aws lambda list-functions \
  --query 'Functions[?VpcConfig.VpcId!=`null`].{Name: FunctionName, Subnets: VpcConfig.SubnetIds, SGs: VpcConfig.SecurityGroupIds}'
```

If multiple functions use the same subnets but different security groups, consider consolidating into shared security groups where it makes sense.

## Solution 5: Reduce the Number of Subnets

Each subnet in a Lambda function's VPC config gets its own ENI. If you've configured your function with 6 subnets but only need 2-3 for high availability, remove the extras.

```bash
# Update Lambda to use fewer subnets
aws lambda update-function-configuration \
  --function-name my-function \
  --vpc-config SubnetIds=subnet-abc123,subnet-def456,SecurityGroupIds=sg-abc123
```

Two or three subnets across different Availability Zones give you redundancy without creating unnecessary ENIs.

## Solution 6: Check Other Services Using ENIs

Lambda isn't the only service that creates ENIs. ECS tasks, RDS instances, ELBs, VPC endpoints, ElastiCache, and many other services also consume ENIs. Get a breakdown of what's using your ENI quota.

```bash
# Get a summary of ENI usage by description (which often indicates the service)
aws ec2 describe-network-interfaces \
  --query 'NetworkInterfaces[].Description' \
  --output text | tr '\t' '\n' | sort | uniq -c | sort -rn | head -20
```

This gives you a picture of which services are consuming the most ENIs. You might find that an unused ECS cluster or forgotten ElastiCache cluster is eating up your quota.

## Monitoring ENI Usage

Set up a CloudWatch alarm so you know before you hit the limit.

```python
import boto3

# Lambda function to monitor ENI usage and alert when it's high
def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    quotas = boto3.client('service-quotas')

    # Get current ENI count
    enis = ec2.describe_network_interfaces()
    current_count = len(enis['NetworkInterfaces'])

    # Get the limit
    quota = quotas.get_service_quota(
        ServiceCode='ec2',
        QuotaCode='L-DF5E4CA3'
    )
    limit = int(quota['Quota']['Value'])

    # Calculate usage percentage
    usage_pct = (current_count / limit) * 100

    print(f"ENI Usage: {current_count}/{limit} ({usage_pct:.1f}%)")

    if usage_pct > 80:
        # Send alert via SNS
        sns = boto3.client('sns')
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:alerts',
            Subject=f'ENI Usage at {usage_pct:.1f}%',
            Message=f'Current ENI count: {current_count}/{limit}'
        )

    return {'usage_percent': usage_pct}
```

## Troubleshooting Checklist

1. Check your current ENI count and quota limit
2. Look for orphaned (available) ENIs and delete them
3. Request a limit increase if needed
4. Verify Lambda functions are using Hyperplane ENIs
5. Consolidate security groups across Lambda functions
6. Reduce subnet count in Lambda VPC configs
7. Check other services consuming ENIs
8. Set up monitoring for ENI usage

The `ENILimitReached` error is solvable with a combination of cleanup and quota management. With Hyperplane ENIs, you need far fewer than before, but in busy accounts the limit can still be reached. Keep an eye on your usage and you'll avoid surprises. For related networking issues, check out our guide on [fixing subnet address exhaustion](https://oneuptime.com/blog/post/fix-subnet-insufficient-free-addresses-errors/view).
