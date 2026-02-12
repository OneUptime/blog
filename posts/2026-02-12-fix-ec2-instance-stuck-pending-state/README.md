# How to Fix EC2 Instance Stuck in Pending State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Troubleshooting, Cloud Infrastructure

Description: Troubleshoot and resolve EC2 instances that are stuck in the pending state, covering common causes like EBS volume issues, ENI limits, and capacity problems.

---

You launch an EC2 instance, and it just sits there in "pending" state. Minutes go by. It doesn't transition to "running" and it doesn't fail outright. It just... hangs. This is more common than you'd think, and the tricky part is that AWS doesn't always give you a clear error message explaining what went wrong.

Let's walk through the most common reasons an EC2 instance gets stuck in pending state and how to fix each one.

## Understanding the EC2 Instance Lifecycle

Before diving into fixes, it helps to understand what happens when you launch an instance. The pending state involves several steps:

1. AWS finds a host server with available capacity
2. The root EBS volume is attached (or instance store is prepared)
3. Network interfaces are attached
4. Security groups are applied
5. The instance gets its private IP address
6. If requested, a public IP or Elastic IP is associated

If any of these steps fail or stall, your instance stays in pending.

## Common Causes and Fixes

### 1. EBS Volume Issues

This is the most frequent culprit. If the root EBS volume can't be created or attached, the instance will hang in pending state.

Check for EBS volume limits in your account:

```bash
# Check your current EBS volume count and limits
aws service-quotas get-service-quota \
  --service-code ebs \
  --quota-code L-D18FCD1D \
  --query 'Quota.Value'

# Count your current volumes in the region
aws ec2 describe-volumes \
  --query 'length(Volumes)' \
  --output text
```

If you're hitting the limit, either delete unused volumes or request a quota increase.

Another EBS-related issue is encrypted volumes. If you're launching from an encrypted AMI and the KMS key isn't accessible, the volume creation will fail silently.

```bash
# Check if the AMI uses encrypted snapshots
aws ec2 describe-images \
  --image-ids ami-0abcdef1234567890 \
  --query 'Images[0].BlockDeviceMappings[*].Ebs.{Encrypted:Encrypted,KmsKeyId:KmsKeyId}'
```

Make sure the IAM role or user launching the instance has `kms:CreateGrant` and `kms:Decrypt` permissions on the KMS key.

### 2. Insufficient Capacity

Sometimes the instance is stuck because AWS is waiting for capacity to become available in the requested AZ. This is particularly common with larger or specialized instance types.

The fix here is straightforward - try a different AZ or instance type:

```bash
# Try launching in a different AZ
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m5.xlarge \
  --placement AvailabilityZone=us-east-1b \
  --subnet-id subnet-0bb1c79de3EXAMPLE \
  --key-name my-key
```

For more details on capacity issues, check out our post on [fixing InsufficientInstanceCapacity errors](https://oneuptime.com/blog/post/fix-insufficientinstancecapacity-ec2-errors/view).

### 3. ENI (Elastic Network Interface) Limits

Every instance needs at least one network interface. If your account has hit the ENI limit for the AZ, new instances can't get a network interface and will be stuck.

```bash
# Check your current ENI count
aws ec2 describe-network-interfaces \
  --query 'length(NetworkInterfaces)' \
  --output text

# Check your ENI quota
aws service-quotas get-service-quota \
  --service-code vpc \
  --quota-code L-DF5E4CA3 \
  --query 'Quota.Value'
```

Clean up unused ENIs (ones with a status of "available"):

```bash
# Find detached ENIs
aws ec2 describe-network-interfaces \
  --filters Name=status,Values=available \
  --query 'NetworkInterfaces[*].{ID:NetworkInterfaceId,Description:Description}' \
  --output table
```

### 4. Subnet Has No Available IP Addresses

If your subnet has run out of available private IP addresses, the instance can't get assigned one.

```bash
# Check available IPs in your subnet
aws ec2 describe-subnets \
  --subnet-ids subnet-0bb1c79de3EXAMPLE \
  --query 'Subnets[0].{CIDR:CidrBlock,AvailableIPs:AvailableIpAddressCount}'
```

If `AvailableIpAddressCount` is 0 or very low, you need to either clean up unused resources in that subnet or launch in a subnet with more space.

### 5. Security Group or VPC Issues

Misconfigured VPC settings can sometimes prevent the instance from completing its launch. While rare, check that:

- The subnet's route table exists and is properly configured
- The VPC has a valid DHCP options set
- The security groups you're referencing actually exist

```bash
# Verify the subnet and its route table
aws ec2 describe-route-tables \
  --filters Name=association.subnet-id,Values=subnet-0bb1c79de3EXAMPLE \
  --query 'RouteTables[0].Routes[*].{Dest:DestinationCidrBlock,Target:GatewayId}'
```

### 6. Instance Profile / IAM Role Issues

If you specify an instance profile that doesn't exist or that your account doesn't have permission to pass, the launch can stall.

```bash
# Verify the instance profile exists
aws iam get-instance-profile \
  --instance-profile-name my-instance-profile \
  --query 'InstanceProfile.{Name:InstanceProfileName,Roles:Roles[*].RoleName}'
```

Make sure the user or role launching the instance has `iam:PassRole` permission for the target role.

## How to Diagnose the Stuck Instance

### Check the System Log

Even if the instance is stuck, you can sometimes get useful information from the system log:

```bash
# Get the console output (may take a few minutes to populate)
aws ec2 get-console-output \
  --instance-id i-0abcdef1234567890 \
  --output text
```

### Check EC2 Instance Status

```bash
# Get detailed instance status
aws ec2 describe-instance-status \
  --instance-ids i-0abcdef1234567890 \
  --include-all-instances \
  --query 'InstanceStatuses[0].{State:InstanceState.Name,System:SystemStatus.Status,Instance:InstanceStatus.Status}'
```

### Check CloudTrail for Launch Errors

CloudTrail captures API calls and can show you if there were errors during the RunInstances call:

```bash
# Look for RunInstances events in CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=RunInstances \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Events[*].{Time:EventTime,Error:CloudTrailEvent}' \
  --output json | head -50
```

## When to Just Terminate and Retry

If an instance has been in pending for more than 10-15 minutes, it's almost certainly not going to transition to running. At that point, your best bet is to terminate it and try again - ideally with a different AZ or instance type.

```bash
# Terminate the stuck instance
aws ec2 terminate-instances --instance-ids i-0abcdef1234567890

# Wait for termination to complete
aws ec2 wait instance-terminated --instance-ids i-0abcdef1234567890

# Retry the launch
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m5.xlarge \
  --subnet-id subnet-DIFFERENT_AZ \
  --key-name my-key
```

## Prevention

To avoid instances getting stuck in the future:

1. **Monitor your quotas** - Set up CloudWatch alarms for resource usage approaching limits
2. **Use multiple AZs** - Don't put all your eggs in one AZ basket
3. **Clean up unused resources** - Regularly remove detached EBS volumes, unused ENIs, and stopped instances
4. **Use launch templates** - They make it easier to retry with consistent configurations
5. **Set up proper monitoring** - Tools like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) can alert you when instances fail to launch properly

The pending state problem is almost always a resource limits issue. Once you identify which resource is constrained, the fix is usually straightforward.
