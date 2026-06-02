# How to Troubleshoot EC2 Instance Launch Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Troubleshooting, Launch Failures, Debugging

Description: Diagnose and fix common EC2 instance launch failures including capacity errors, limit issues, networking problems, and configuration mistakes.

---

You hit "Launch" and instead of a running instance, you get an error. EC2 launch failures are frustrating because the error messages can be cryptic and the causes range from simple typos to account-level limits to regional capacity constraints. This guide covers the most common launch failures, what causes them, and how to fix each one.

## The Most Common Launch Errors

Here are common errors you may encounter:

1. InsufficientInstanceCapacity
2. InstanceLimitExceeded
3. InvalidParameterValue
4. VPCResourceNotSpecified
5. InvalidSubnetID.NotFound
6. InvalidGroup.NotFound
7. UnauthorizedOperation

Let's walk through each one.

## InsufficientInstanceCapacity

This error means AWS doesn't have enough of the instance type you requested in the availability zone you specified.

```text
An error occurred (InsufficientInstanceCapacity) when calling the RunInstances operation:
There is no Spot capacity available that matches your request.
```

Or for On-Demand:

```text
An error occurred (InsufficientInstanceCapacity) when calling the RunInstances operation:
We currently do not have sufficient capacity in the Availability Zone you requested.
```

**Solutions:**

Try a different AZ. `--dry-run` only checks whether you have permission to make the request; it does not test real-time capacity. To test capacity, you need to make a real launch request.

```bash
# List AZs where the instance type is offered, then try each one

for AZ in $(aws ec2 describe-instance-type-offerings \
  --location-type availability-zone \
  --filters "Name=instance-type,Values=m5.xlarge" \
  --query 'InstanceTypeOfferings[].Location' \
  --output text); do
  echo "Trying $AZ..."
  SUBNET_ID=$(aws ec2 describe-subnets \
    --filters "Name=availability-zone,Values=$AZ" "Name=vpc-id,Values=vpc-abc123" \
    --query 'Subnets[0].SubnetId' --output text)

  [ "$SUBNET_ID" = "None" ] && continue

  aws ec2 run-instances \
    --image-id ami-0abc123 \
    --instance-type m5.xlarge \
    --placement "AvailabilityZone=$AZ" \
    --subnet-id "$SUBNET_ID" \
    --query 'Instances[0].InstanceId' \
    --output text && break
done
```

Try a different instance type from the same family:

```bash
# If m5.xlarge isn't available, try alternatives
for TYPE in m5.xlarge m5a.xlarge m5n.xlarge m6i.xlarge m6a.xlarge; do
  echo "Trying $TYPE..."
  if aws ec2 run-instances \
    --image-id ami-0abc123 \
    --instance-type $TYPE \
    --subnet-id subnet-abc123 \
    --query 'Instances[0].InstanceId' \
    --output text; then
    echo "$TYPE launched successfully!"
    break
  fi
done
```

For guaranteed capacity, consider [Capacity Reservations](https://oneuptime.com/blog/post/2026-02-12-configure-ec2-capacity-reservations/view).

## InstanceLimitExceeded

You've hit the instance limit for your account in this region. Every account has default limits on how many vCPUs it can run per instance family.

```text
An error occurred (InstanceLimitExceeded) when calling the RunInstances operation:
You have requested more vCPU capacity than your current vCPU limit allows.
```

**Check your current limits:**

```bash
# Check vCPU limits for on-demand instances
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query 'Quotas[?QuotaName==`Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances`].{
    Name: QuotaName,
    Value: Value,
    Unit: Unit
  }' --output table
```

**Request a limit increase:**

```bash
# Request a vCPU limit increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --desired-value 256
```

Limit increases for standard instance families are usually approved quickly (minutes to hours). Larger increases or special instance types may take a few days.

## InvalidParameterValue

This is a catch-all for configuration mistakes. The specifics vary but common causes include:

**Wrong AMI for the region:**

```bash
# AMIs are region-specific. This fails if the AMI doesn't exist in this region.
aws ec2 run-instances \
  --image-id ami-from-different-region \
  --instance-type m5.large

# Fix: Find the latest Amazon Linux 2023 AMI in your current region
aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameter.Value' \
  --output text
```

**Incompatible instance type and AMI architecture:**

```bash
# ARM AMI on x86 instance type
# Error: The instance type m5.large does not support the arm64 architecture

# Fix: Use an ARM instance type for ARM AMIs
aws ec2 run-instances \
  --image-id ami-arm64 \
  --instance-type m6g.large  # Graviton (ARM) instance
```

**Invalid key pair:**

```bash
# Check that your key pair exists in this region
aws ec2 describe-key-pairs --key-names my-key

# If not, import it
aws ec2 import-key-pair \
  --key-name my-key \
  --public-key-material fileb://~/.ssh/my-key.pub
```

## Network-Related Failures

**No public IP when expected:**

```bash
# Subnet doesn't auto-assign public IPs
# Fix 1: Enable auto-assign on the subnet
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-abc123 \
  --map-public-ip-on-launch

# Fix 2: Request a public IP at launch
aws ec2 run-instances \
  --image-id ami-0abc123 \
  --instance-type m5.large \
  --subnet-id subnet-abc123 \
  --associate-public-ip-address
```

**Security group in wrong VPC:**

```bash
# Check which VPC the security group belongs to
aws ec2 describe-security-groups \
  --group-ids sg-abc123 \
  --query 'SecurityGroups[0].VpcId'

# Compare with subnet's VPC
aws ec2 describe-subnets \
  --subnet-ids subnet-abc123 \
  --query 'Subnets[0].VpcId'

# They must match!
```

## IAM and Permission Errors

**UnauthorizedOperation:**

```bash
# Error: You are not authorized to perform this operation
# Check what permissions you have
aws sts get-caller-identity

# Test the specific action with --dry-run
aws ec2 run-instances \
  --image-id ami-0abc123 \
  --instance-type m5.large \
  --subnet-id subnet-abc123 \
  --dry-run 2>&1
```

Common missing permissions:
- `ec2:RunInstances` on the instance
- `ec2:RunInstances` on the subnet, security group, AMI, or key pair
- `iam:PassRole` if specifying an instance profile
- `ec2:CreateTags` if tag-on-create is required

Here's the minimum IAM policy for launching instances:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": [
        "arn:aws:ec2:*:*:instance/*",
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:network-interface/*",
        "arn:aws:ec2:*:*:security-group/*",
        "arn:aws:ec2:*:*:subnet/*",
        "arn:aws:ec2:*:*:key-pair/*",
        "arn:aws:ec2:*::image/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "ec2:CreateTags",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:CreateAction": "RunInstances"
        }
      }
    }
  ]
}
```

## EBS-Related Failures

**Encrypted volume without KMS permissions:**

```bash
# Error: Client.InternalError when launching with encrypted AMI
# Usually means the KMS key policy doesn't allow ec2:CreateGrant

# Check the key policy
aws kms describe-key --key-id alias/my-key
aws kms get-key-policy --key-id alias/my-key --policy-name default
```

**EBS storage quota exceeded:**

```bash
# Check the gp2 EBS storage quota
aws service-quotas get-service-quota \
  --service-code ebs \
  --quota-code L-D18FCD1D \
  --query 'Quota.{Name:QuotaName,Value:Value}'
```

## Debugging with Get Console Output

After a launch, if the instance starts but immediately fails health checks, check the console output:

```bash
# Get the console output to see boot messages
aws ec2 get-console-output \
  --instance-id i-0abc123 \
  --output text
```

This shows kernel messages, cloud-init output, and any boot errors. Common issues visible here:
- File system corruption
- Kernel panics
- Network configuration failures
- Cloud-init script errors

## Systematic Debugging Checklist

When a launch fails, go through this checklist:

```bash
#!/bin/bash
# debug-launch-failure.sh
# Systematic check of common launch failure causes

AMI_ID=$1
INSTANCE_TYPE=$2
SUBNET_ID=$3
SG_ID=$4

echo "=== Launch Failure Debugging ==="

# 1. Check AMI exists and is available
echo "1. Checking AMI..."
aws ec2 describe-images --image-ids $AMI_ID \
  --query 'Images[0].{State:State,Arch:Architecture,Platform:PlatformDetails}'

# 2. Check instance type is available in the AZ
AZ=$(aws ec2 describe-subnets --subnet-ids $SUBNET_ID \
  --query 'Subnets[0].AvailabilityZone' --output text)
echo "2. Checking instance type in $AZ..."
aws ec2 describe-instance-type-offerings \
  --location-type availability-zone \
  --filters "Name=instance-type,Values=$INSTANCE_TYPE" "Name=location,Values=$AZ" \
  --query 'InstanceTypeOfferings[0].InstanceType'

# 3. Check subnet has available IPs
echo "3. Checking subnet capacity..."
aws ec2 describe-subnets --subnet-ids $SUBNET_ID \
  --query 'Subnets[0].{AZ:AvailabilityZone,AvailableIPs:AvailableIpAddressCount,VPC:VpcId}'

# 4. Check security group is in the same VPC
echo "4. Checking security group..."
SG_VPC=$(aws ec2 describe-security-groups --group-ids $SG_ID \
  --query 'SecurityGroups[0].VpcId' --output text)
SUBNET_VPC=$(aws ec2 describe-subnets --subnet-ids $SUBNET_ID \
  --query 'Subnets[0].VpcId' --output text)
if [ "$SG_VPC" == "$SUBNET_VPC" ]; then
  echo "  VPCs match: $SG_VPC"
else
  echo "  ERROR: VPC mismatch! SG=$SG_VPC, Subnet=$SUBNET_VPC"
fi

# 5. Check vCPU limits
echo "5. Checking vCPU limits..."
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query 'Quotas[?contains(QuotaName, `Running On-Demand`)].{Name:QuotaName,Limit:Value}' \
  --output table

# 6. Dry run the launch permissions
echo "6. Dry run permission test..."
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type $INSTANCE_TYPE \
  --subnet-id $SUBNET_ID \
  --security-group-ids $SG_ID \
  --dry-run 2>&1
```

For instances that launch but then have issues, check out [troubleshooting status check failures](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-ec2-instance-status-check-failures/view) for the next layer of debugging.

Most launch failures come down to a few common causes: wrong region, wrong VPC, missing permissions, or capacity limits. The systematic debugging script above catches the majority of issues in under a minute. Keep it handy, and launch failures won't slow you down for long.
